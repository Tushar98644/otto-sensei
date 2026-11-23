import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications, notifications, resumes, userSettings } from "@/db/schema";
import { buildDataExport } from "@/lib/account/data-export";
import type { ApplicationStatus } from "@/lib/applications/status";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { createSampleResume } from "@/lib/resume/sample";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { trimOldRecaps, ensureRecap, markRecapSeen, readRecap } from "./records";

const TZ = "Asia/Kolkata";
// Monday Nov 16 2026, 00:00 in Kolkata, and the next Monday morning there.
const WEEK_START = Date.UTC(2026, 10, 15, 18, 30);
const NOW = WEEK_START + 7 * DAY_MS + 10 * HOUR_MS;
const at = (day: number) => WEEK_START + day * DAY_MS + 9 * HOUR_MS;

async function account(email = "ada@example.com", createdAt = WEEK_START - 60 * DAY_MS) {
  return createUser(email, createdAt);
}

async function apply(
  user: SessionUser,
  appliedAt: number,
  company = "Notion",
  status: ApplicationStatus = "applied",
) {
  const db = await getDb();
  await db.insert(applications).values({
    id: crypto.randomUUID(),
    userId: user.id,
    company,
    role: "Designer",
    appliedAt,
    status,
    stageReached: status === "interview" || status === "offer" ? status : "applied",
    statusChangedAt: appliedAt,
    statusHistory: [{ status: "applied", at: appliedAt }],
    createdAt: appliedAt,
    updatedAt: appliedAt,
  });
}

async function activeOn(userId: string, days: string[]) {
  await (
    await getDb()
  )
    .insert(userSettings)
    .values({ userId, activeDays: days, updatedAt: NOW })
    .onConflictDoUpdate({ target: userSettings.userId, set: { activeDays: days } });
}

async function bell(userId: string) {
  const db = await getDb();
  return db.select().from(notifications).where(eq(notifications.userId, userId));
}

beforeEach(async () => {
  await resetDb();
});

describe("ensureRecap", () => {
  it("builds last week once, rings the bell once, and opens by itself until seen", async () => {
    const user = await account();
    await apply(user, at(1));
    await apply(user, at(3), "Stripe");

    const first = await ensureRecap(user, TZ, NOW);
    expect(first.current?.seen).toBe(false);
    expect(first.current?.recap).toMatchObject({
      week: "2026-11-16",
      quiet: false,
      effort: { applications: 2 },
    });
    const rows = await bell(user.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "weekly_recap",
      title: "Your week with Otto is ready",
      body: "Nov 16–22: 2 applications and 2 days with Otto.",
      link: "/dashboard?recap=2026-11-16",
    });

    const again = await ensureRecap(user, TZ, NOW + HOUR_MS);
    expect(again.current?.recap.builtAt).toBe(NOW);
    expect(await bell(user.id)).toHaveLength(1);

    expect(await markRecapSeen(user.id, "2026-11-16", NOW + 2 * HOUR_MS)).toBe(true);
    expect(await markRecapSeen(user.id, "2026-11-16", NOW + 3 * HOUR_MS)).toBe(false);
    expect((await ensureRecap(user, TZ, NOW + 4 * HOUR_MS)).current?.seen).toBe(true);
  });

  it("waits until the week is over where the person is", async () => {
    const user = await account();
    await apply(user, at(1));
    // Sunday evening in Kolkata: Nov 16–22 isn't over yet, and Nov 9–15 had nothing.
    const sunday = WEEK_START + 6 * DAY_MS + 20 * HOUR_MS;
    const index = await ensureRecap(user, TZ, sunday);
    expect(index.current?.recap.week).toBe("2026-11-09");
    expect(index.current?.recap.quiet).toBe(true);
  });

  it("skips accounts that never used Otto, and weeks before the account existed", async () => {
    const unused = await account("new@example.com");
    const db = await getDb();
    const sample = createSampleResume(0);
    await db.insert(resumes).values({
      userId: unused.id,
      id: sample.id,
      data: sample,
      createdAt: at(1),
      updatedAt: at(1),
    });
    expect(await ensureRecap(unused, TZ, NOW)).toEqual({ current: null, earlier: [] });

    const late = await account("late@example.com", NOW - HOUR_MS);
    await apply(late, NOW - HOUR_MS);
    expect(await ensureRecap(late, TZ, NOW)).toEqual({ current: null, earlier: [] });
    expect(
      (await db.select().from(userSettings)).filter((row) => row.recaps !== null),
    ).toHaveLength(0);
    expect(await bell(unused.id)).toHaveLength(0);
  });

  it("fills in earlier weeks that had something, quietly, and keeps them to the owner", async () => {
    const user = await account();
    await apply(user, at(1));
    await apply(user, at(-12), "Figma");
    const index = await ensureRecap(user, TZ, NOW);
    expect(index.earlier).toEqual([{ week: "2026-11-02", headline: "1 application" }]);
    const earlier = await readRecap(user.id, "2026-11-02");
    expect(earlier).toMatchObject({ week: "2026-11-02", effort: { applications: 1 }, next: [] });
    expect(await bell(user.id)).toHaveLength(1);

    const other = await account("other@example.com");
    expect(await readRecap(other.id, "2026-11-02")).toBeNull();
  });

  it("counts the days the account opened Otto", async () => {
    const user = await account();
    await activeOn(user.id, ["2026-11-17", "2026-11-19", "2026-11-23"]);
    const index = await ensureRecap(user, TZ, NOW);
    expect(index.current?.recap.activeDays).toEqual(["2026-11-17", "2026-11-19"]);
  });
});

describe("the data download", () => {
  it("has the weekly recaps and the days the account opened the app", async () => {
    const user = await account();
    await apply(user, at(1), "Stripe");
    await ensureRecap(user, TZ, NOW);
    await activeOn(user.id, ["2026-11-17", "2026-11-18"]);
    const zip = await buildDataExport(user.id, NOW);
    const recaps = JSON.parse((await zip.file("weekly-recaps.json")?.async("string")) ?? "[]") as {
      week: string;
      recap: { effort: { applications: number } };
    }[];
    expect(recaps.map((row) => row.week)).toEqual(["2026-11-16"]);
    expect(recaps[0]?.recap.effort.applications).toBe(1);
    expect(JSON.parse((await zip.file("active-days.json")?.async("string")) ?? "[]")).toEqual([
      "2026-11-17",
      "2026-11-18",
    ]);
    const readme = (await zip.file("README.txt")?.async("string")) ?? "";
    expect(readme).toContain("weekly-recaps.json: 1 week of Your week with Otto");
    expect(readme).toContain("active-days.json");

    const other = await account("other@example.com");
    const empty = await buildDataExport(other.id, NOW);
    expect(empty.file("weekly-recaps.json")).toBeNull();
    expect(empty.file("active-days.json")).toBeNull();
  });
});

describe("cleanup", () => {
  it("drops weeks and days older than the ones offered", async () => {
    const user = await account();
    const db = await getDb();
    await apply(user, at(1));
    await ensureRecap(user, TZ, NOW);
    await activeOn(user.id, ["2026-08-01", "2026-11-20"]);
    const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
    const [week] = Object.values(row?.recaps ?? {});
    await db
      .update(userSettings)
      .set({ recaps: { "2026-08-03": week!, ...row?.recaps } })
      .where(eq(userSettings.userId, user.id));
    expect(await trimOldRecaps(NOW, 100)).toBe(1);
    const [after] = await db.select().from(userSettings).where(eq(userSettings.userId, user.id));
    expect(after?.activeDays).toEqual(["2026-11-20"]);
    expect(Object.keys(after?.recaps ?? {})).toEqual(["2026-11-16"]);
    expect(await trimOldRecaps(NOW, 100)).toBe(0);
  });
});
