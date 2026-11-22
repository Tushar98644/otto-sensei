import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  billingEvents,
  extensionTokens,
  matchCache,
  matchEvents,
  meteredResults,
  notifications,
  rateLimits,
  resumeTombstones,
  usagePasses,
} from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
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
    await db.insert(resumeTombstones).values([
      { userId: maya.id, id: "old", deletedAt: NOW - RETENTION.tombstonesMs - 1 },
      { userId: maya.id, id: "new", deletedAt: NOW - DAY },
    ]);
    await seedNotification(maya.id, NOW - RETENTION.readNotificationsMs - 1, NOW - 80 * DAY);
    await seedNotification(maya.id, NOW - RETENTION.readNotificationsMs - 1, null);
    await seedNotification(maya.id, NOW - RETENTION.anyNotificationsMs - 1, null);
    await seedNotification(maya.id, NOW - DAY, NOW);
    await db.insert(billingEvents).values([
      { id: "evt_old", type: "subscription.active", receivedAt: NOW - RETENTION.billingEventsMs - 1 },
      { id: "evt_new", type: "subscription.active", receivedAt: NOW - DAY },
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
      { userId: maya.id, key: "k".repeat(32), value: {}, createdAt: NOW - RETENTION.matchCacheMs - 1 },
      { userId: maya.id, key: "n".repeat(32), value: {}, createdAt: NOW - 60_000 },
    ]);
    await db.insert(usagePasses).values([
      { userId: maya.id, feature: "fix", subject: "old", usesLeft: 3, expiresAt: NOW - 1 },
      { userId: maya.id, feature: "fix", subject: "new", usesLeft: 3, expiresAt: NOW + 60_000 },
    ]);
    await db.insert(meteredResults).values([
      { userId: maya.id, requestKey: "old", result: {}, startedAt: NOW - DAY, expiresAt: NOW - 1 },
      { userId: maya.id, requestKey: "new", result: {}, startedAt: NOW, expiresAt: NOW + 60_000 },
    ]);

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
        usagePasses: 1,
        meteredResults: 1,
        extensionTokens: 1,
      },
      complete: true,
      failed: [],
    });

    expect((await db.select().from(rateLimits)).map((row) => row.key)).toEqual(["import:ip:new"]);
    expect((await db.select().from(resumeTombstones)).map((row) => row.id)).toEqual(["new"]);
    expect(await db.select().from(notifications)).toHaveLength(2);
    expect((await db.select().from(billingEvents)).map((row) => row.id)).toEqual(["evt_new"]);
    expect((await db.select().from(matchEvents)).map((row) => row.id).sort()).toEqual(
      [oldSave.id, newImpression.id].sort(),
    );
    expect((await db.select().from(matchCache)).map((row) => row.key)).toEqual(["n".repeat(32)]);
    expect((await db.select().from(usagePasses)).map((row) => row.subject)).toEqual(["new"]);
    expect((await db.select().from(meteredResults)).map((row) => row.requestKey)).toEqual(["new"]);
    expect((await db.select().from(extensionTokens)).map((row) => row.tokenHash)).toEqual(["n".repeat(43)]);

    const second = await runCleanup(context());
    expect(second.stats).toEqual({
      rateLimits: 0,
      tombstones: 0,
      notifications: 0,
      billingEvents: 0,
      impressions: 0,
      replacedTrials: 0,
      matchCache: 0,
      usagePasses: 0,
      meteredResults: 0,
      extensionTokens: 0,
    });
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
    await db.insert(rateLimits).values({ key: "import:ip:old", windowStart: NOW - 3 * DAY, count: 1 });

    const outcome = await runCleanup({ now: NOW, deadline: 0 });
    expect(outcome.complete).toBe(false);
    expect(await db.select().from(rateLimits)).toHaveLength(1);
  });
});
