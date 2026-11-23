import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  billingLog,
  extensionTokens,
  inboundEmails,
  inboundHandles,
  matchCache,
  matchEvents,
  meteredCalls,
  notifications,
  portfolios,
  rateLimits,
  usage,
  userSettings,
} from "@/db/schema";
import type { Recap } from "@/lib/recap/types";
import type { Resume } from "@/lib/resume/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { HANDLE_HOLD_MS } from "@/lib/inbound/handle";
import { CLEANUP_BATCH, RETENTION, runCleanup } from "./cleanup";

const DAY = 24 * 60 * 60 * 1_000;
const NOW = Date.UTC(2026, 10, 8, 4, 17, 0);
const context = () => ({ now: NOW, deadline: Date.now() + 30_000 });

async function seedNotification(userId: string, createdAt: number, readAt: number | null) {
  await (await getDb()).insert(notifications).values({
    id: crypto.randomUUID(),
    userId,
    kind: "application_follow_up",
    title: "Still waiting on Stripe?",
    body: "",
    link: null,
    readAt,
    createdAt,
  });
}

describe("runCleanup", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("deletes only rows past their retention, and a second run finds nothing", async () => {
    const db = await getDb();
    const maya = await createUser("maya@example.com");
    await db.insert(rateLimits).values([
      { key: "import:ip:old", windowStart: NOW - RETENTION.rateLimitWindowsMs - 1, count: 3 },
      { key: "import:ip:new", windowStart: NOW - DAY, count: 1 },
    ]);
    await db.insert(userSettings).values({
      userId: maya.id,
      deletedResumes: { old: NOW - RETENTION.tombstonesMs - 1, new: NOW - DAY },
      updatedAt: NOW,
    });
    await seedNotification(maya.id, NOW - RETENTION.readNotificationsMs - 1, NOW - 80 * DAY);
    await seedNotification(maya.id, NOW - RETENTION.readNotificationsMs - 1, null);
    await seedNotification(maya.id, NOW - RETENTION.anyNotificationsMs - 1, null);
    await seedNotification(maya.id, NOW - DAY, NOW);
    await db.insert(billingLog).values([
      {
        kind: "event",
        key: "evt_old",
        ref: "subscription.active",
        at: NOW - RETENTION.billingEventsMs - 1,
      },
      { kind: "event", key: "evt_new", ref: "subscription.active", at: NOW - DAY },
      { kind: "trial", key: "hash-old", ref: "trial", at: NOW - RETENTION.billingEventsMs - 1 },
    ]);

    const event = (kind: "impression" | "save", createdAt: number) => ({
      id: crypto.randomUUID(),
      userId: maya.id,
      kind,
      jobId: crypto.randomUUID(),
      variant: "weighted-v2",
      createdAt,
    });
    const oldImpression = event("impression", NOW - RETENTION.impressionsMs - 1);
    const oldSave = event("save", NOW - RETENTION.impressionsMs - 1);
    const newImpression = event("impression", NOW - DAY);
    await db.insert(matchEvents).values([oldImpression, oldSave, newImpression]);
    await db.insert(matchCache).values([
      {
        userId: maya.id,
        key: "k".repeat(32),
        value: {},
        createdAt: NOW - RETENTION.matchCacheMs - 1,
      },
      { userId: maya.id, key: "n".repeat(32), value: {}, createdAt: NOW - 60_000 },
    ]);
    await db.insert(meteredCalls).values([
      { userId: maya.id, kind: "pass", key: "fix:old", usesLeft: 3, expiresAt: NOW - 1 },
      { userId: maya.id, kind: "pass", key: "fix:new", usesLeft: 3, expiresAt: NOW + 60_000 },
      {
        userId: maya.id,
        kind: "result",
        key: "old",
        result: {},
        startedAt: NOW - DAY,
        expiresAt: NOW - 1,
      },
      {
        userId: maya.id,
        kind: "result",
        key: "new",
        result: {},
        startedAt: NOW,
        expiresAt: NOW + 60_000,
      },
    ]);
    const email = (key: string, receivedAt: number) => ({
      id: crypto.randomUUID(),
      userId: maya.id,
      messageKey: key.repeat(43),
      kind: "applied" as const,
      receivedAt,
    });
    await db
      .insert(inboundEmails)
      .values([email("o", NOW - RETENTION.inboundEmailsMs - 1), email("n", NOW - DAY)]);
    const handle = (name: string, retiredAt: number) => ({
      handle: name,
      userId: maya.id,
      createdAt: retiredAt - DAY,
      retiredAt,
      routesUntil: retiredAt,
    });
    await db
      .insert(inboundHandles)
      .values([handle("maya.old", NOW - HANDLE_HOLD_MS - 1), handle("maya.new", NOW - DAY)]);

    const token = (hash: string, expiresAt: number) => ({
      id: crypto.randomUUID(),
      userId: maya.id,
      tokenHash: hash.repeat(43),
      createdAt: NOW - 100 * DAY,
      lastUsedAt: NOW - 95 * DAY,
      expiresAt,
    });
    await db.insert(extensionTokens).values([token("o", NOW - 1), token("n", NOW + DAY)]);

    const first = await runCleanup(context());
    expect(first).toEqual({
      stats: {
        rateLimits: 1,
        tombstones: 1,
        notifications: 2,
        billingEvents: 1,
        impressions: 1,
        replacedTrials: 0,
        matchCache: 1,
        meteredCalls: 2,
        extensionTokens: 1,
        inboundHandles: 1,
        inboundEmails: 1,
        matchActions: 0,
        usagePeriods: 0,
        portfolioRedirects: 0,
        recaps: 0,
      },
      complete: true,
      failed: [],
    });

    expect((await db.select().from(rateLimits)).map((row) => row.key)).toEqual(["import:ip:new"]);
    const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, maya.id));
    expect(settings?.deletedResumes).toEqual({ new: NOW - DAY });
    expect(await db.select().from(notifications)).toHaveLength(2);
    expect((await db.select().from(billingLog)).map((row) => row.key).sort()).toEqual([
      "evt_new",
      "hash-old",
    ]);
    expect((await db.select().from(matchEvents)).map((row) => row.id).sort()).toEqual(
      [oldSave.id, newImpression.id].sort(),
    );
    expect((await db.select().from(matchCache)).map((row) => row.key)).toEqual(["n".repeat(32)]);
    expect((await db.select().from(meteredCalls)).map((row) => row.key).sort()).toEqual([
      "fix:new",
      "new",
    ]);
    expect((await db.select().from(extensionTokens)).map((row) => row.tokenHash)).toEqual([
      "n".repeat(43),
    ]);
    expect((await db.select().from(inboundHandles)).map((row) => row.handle)).toEqual(["maya.new"]);
    expect((await db.select().from(inboundEmails)).map((row) => row.messageKey)).toEqual([
      "n".repeat(43),
    ]);

    const second = await runCleanup(context());
    expect(second.stats).toEqual({
      rateLimits: 0,
      tombstones: 0,
      notifications: 0,
      billingEvents: 0,
      impressions: 0,
      replacedTrials: 0,
      matchCache: 0,
      meteredCalls: 0,
      extensionTokens: 0,
      inboundHandles: 0,
      inboundEmails: 0,
      matchActions: 0,
      usagePeriods: 0,
      portfolioRedirects: 0,
      recaps: 0,
    });
  });

  it("keeps old allowance counts, match actions and redirects only while they matter", async () => {
    const db = await getDb();
    const maya = await createUser("maya@example.com");
    const count = (period: string) => ({ subject: maya.id, feature: "tailor", period, count: 2 });
    await db
      .insert(usage)
      .values([
        count("2025-09"),
        count("2025-10"),
        count("2026-11"),
        count("trial"),
        count("cycle:2025-09-01T00:00:00.000Z"),
        count("cycle:2026-10-15T00:00:00.000Z"),
        count("week:2025-01-07T09:30:00.000Z"),
      ]);
    const action = (createdAt: number) => ({
      id: crypto.randomUUID(),
      userId: maya.id,
      kind: "open" as const,
      jobId: crypto.randomUUID(),
      variant: "weighted-v2",
      createdAt,
    });
    const oldAction = action(NOW - RETENTION.matchActionsMs - 1);
    const recentAction = action(NOW - RETENTION.matchActionsMs + DAY);
    await db.insert(matchEvents).values([oldAction, recentAction]);
    const portfolioId = crypto.randomUUID();
    const kept = (until: number) => ({ at: NOW - 90 * DAY, until });
    await db.insert(portfolios).values({
      id: portfolioId,
      userId: maya.id,
      resumeId: "r1",
      slug: "maya-lin",
      snapshot: {} as unknown as Resume,
      oldSlugs: { "maya-old": kept(NOW - 1), "maya-recent": kept(NOW + DAY) },
      createdAt: NOW,
      updatedAt: NOW,
    });

    const outcome = await runCleanup(context());
    expect(outcome.stats).toMatchObject({
      matchActions: 1,
      usagePeriods: 3,
      portfolioRedirects: 1,
    });

    expect((await db.select().from(usage)).map((row) => row.period).sort()).toEqual([
      "2025-10",
      "2026-11",
      "cycle:2026-10-15T00:00:00.000Z",
      "trial",
    ]);
    expect((await db.select().from(matchEvents)).map((row) => row.id)).toEqual([recentAction.id]);
    const [page] = await db.select().from(portfolios).where(eq(portfolios.id, portfolioId));
    expect(Object.keys(page?.oldSlugs ?? {})).toEqual(["maya-recent"]);
  });

  it("trims days active and recap weeks past the recap's reach from accounts that stopped coming back", async () => {
    const db = await getDb();
    const maya = await createUser("maya@example.com");
    const ben = await createUser("ben@example.com");
    const week = (seenAt: number | null) => ({ data: {} as Recap, builtAt: NOW, seenAt });
    await db.insert(userSettings).values([
      {
        userId: maya.id,
        activeDays: ["2026-08-01", "2026-10-20", "2026-11-07"],
        recaps: { "2026-08-03": week(1), "2026-10-26": week(null) },
        updatedAt: NOW,
      },
      { userId: ben.id, activeDays: ["2026-11-02"], updatedAt: NOW },
    ]);

    const outcome = await runCleanup(context());
    expect(outcome.stats.recaps).toBe(1);
    const rows = await db.select().from(userSettings);
    const of = (id: string) => rows.find((row) => row.userId === id);
    expect(of(maya.id)?.activeDays).toEqual(["2026-10-20", "2026-11-07"]);
    expect(Object.keys(of(maya.id)?.recaps ?? {})).toEqual(["2026-10-26"]);
    expect(of(ben.id)?.activeDays).toEqual(["2026-11-02"]);
    expect((await runCleanup(context())).stats.recaps).toBe(0);
  });

  it("drains more than one batch", async () => {
    const db = await getDb();
    const rows = Array.from({ length: CLEANUP_BATCH + 5 }, (_, index) => ({
      key: `code:email:${index}`,
      windowStart: NOW - 3 * DAY,
      count: 1,
    }));
    await db.insert(rateLimits).values(rows);

    const outcome = await runCleanup(context());
    expect(outcome.stats.rateLimits).toBe(CLEANUP_BATCH + 5);
    expect(outcome.complete).toBe(true);
    expect(await db.select().from(rateLimits)).toHaveLength(0);
  });

  it("starts no batch once its deadline has passed", async () => {
    const db = await getDb();
    await db
      .insert(rateLimits)
      .values({ key: "import:ip:old", windowStart: NOW - 3 * DAY, count: 1 });

    const outcome = await runCleanup({ now: NOW, deadline: 0 });
    expect(outcome.complete).toBe(false);
    expect(await db.select().from(rateLimits)).toHaveLength(1);
  });
});
