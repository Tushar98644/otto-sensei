import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEATURES, PLANS, PRO_TRIAL, type Feature } from "@/config/plans";
import { getDb } from "@/db/client";
import { usage } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import {
  addMonths,
  billingMonth,
  billingWeekEnd,
  carryUsageOver,
  consumeUsage,
  cycleKey,
  getUsage,
  getUsageState,
  isoWeekEnd,
  monthKey,
  monthWindow,
  refundUsage,
  TRIAL_PERIOD_KEY,
  WEEK_MS,
  weekKey,
} from "./usage";

// A Sunday. Its ISO week ends on Monday Nov 16, 00:00 UTC.
const NOV = Date.UTC(2026, 10, 15, 12);
const DEC = Date.UTC(2026, 11, 1, 0, 0, 1);
// A weekly renewal on Thursday Nov 19 at 09:30:15.123, so NOV's billing week ends Nov 19 09:30.
const RENEWS_AT = Date.UTC(2026, 10, 19, 9, 30, 15, 123);
const WEEK_END = Date.UTC(2026, 10, 19, 9, 30);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY_MS = 24 * HOUR;
// A trial that started Nov 14 and ends three days later, across the turn of no month.
const TRIAL_END = Date.UTC(2026, 10, 17, 12);
// A monthly plan's billing period as Creem reports it: Nov 10 to Dec 10, so NOV and DEC both fall
// in it, then the next one to Jan 10.
const P_START = Date.UTC(2026, 10, 10, 9, 30);
const P_END = Date.UTC(2026, 11, 10, 9, 30);
const P_NEXT = Date.UTC(2027, 0, 10, 9, 30);

// Counters belong to real accounts (a foreign key), so they're created fresh for every test. The
// trial has the smallest real limits, so the limit tests run on it.
let free: SessionUser;
let pro: SessionUser;
let trial: SessionUser;

async function storedCount(
  user: SessionUser,
  feature: Feature,
  now = NOV,
  period = monthKey(now),
): Promise<number | null> {
  const db = await getDb();
  const [row] = await db
    .select({ count: usage.count })
    .from(usage)
    .where(and(eq(usage.subject, user.id), eq(usage.feature, feature), eq(usage.period, period)))
    .limit(1);
  return row?.count ?? null;
}

const trialCount = (feature: Feature) => storedCount(trial, feature, NOV, TRIAL_PERIOD_KEY);

async function consumeTimes(user: SessionUser, feature: Feature, times: number, now = NOV) {
  for (let i = 0; i < times; i++) await consumeUsage(user, feature, now);
}

afterEach(() => {
  vi.restoreAllMocks();
});

beforeEach(async () => {
  await resetDb();
  free = await createUser("free@example.com");
  pro = { ...(await createUser("pro@example.com")), plan: "pro" };
  trial = {
    ...(await createUser("trial@example.com")),
    plan: "pro",
    planInterval: "month",
    planRenewsAt: TRIAL_END,
    trialEndsAt: TRIAL_END,
  };
});

describe("periods", () => {
  it("uses UTC calendar months", () => {
    expect(monthKey(Date.UTC(2026, 0, 31, 23, 59, 59))).toBe("2026-01");
    expect(monthKey(Date.UTC(2026, 11, 1))).toBe("2026-12");
  });

  it("lines billing weeks up with the renewal date, to the minute, on both sides of it", () => {
    expect(billingWeekEnd(RENEWS_AT, NOV)).toBe(WEEK_END);
    expect(billingWeekEnd(RENEWS_AT, WEEK_END - 1)).toBe(WEEK_END);
    // The renewal webhook is late: the next week has started anyway.
    expect(billingWeekEnd(RENEWS_AT, WEEK_END)).toBe(WEEK_END + WEEK_MS);
    expect(billingWeekEnd(RENEWS_AT, WEEK_END + 3 * HOUR)).toBe(WEEK_END + WEEK_MS);
    // A renewal more than a week out (e.g. after a plan change) still splits time into weeks.
    expect(billingWeekEnd(RENEWS_AT, WEEK_END - WEEK_MS - 1)).toBe(WEEK_END - WEEK_MS);
  });

  it("falls back to ISO weeks, Monday to Monday in UTC", () => {
    const monday = Date.UTC(2026, 10, 16);
    expect(isoWeekEnd(NOV)).toBe(monday);
    expect(isoWeekEnd(monday - 1)).toBe(monday);
    expect(isoWeekEnd(monday)).toBe(monday + WEEK_MS);
    expect(isoWeekEnd(Date.UTC(2026, 10, 18, 23))).toBe(monday + WEEK_MS);
  });

  it("keys weekly rows apart from monthly ones", () => {
    expect(weekKey(WEEK_END)).toBe("week:2026-11-19T09:30:00.000Z");
    expect(weekKey(WEEK_END)).not.toMatch(/^\d{4}-\d{2}$/);
  });
});

describe("getUsage", () => {
  it("starts at zero with the plan's limits: none at all on Free", async () => {
    const zero = (limits: Record<Feature, number>) =>
      Object.fromEntries(FEATURES.map((feature) => [feature, { used: 0, limit: limits[feature] }]));
    expect(await getUsage(free, NOV)).toEqual(zero(PLANS.free.limits));
    expect(Object.values(PLANS.free.limits).every((limit) => limit === 0)).toBe(true);
    expect(await getUsage(pro, NOV)).toEqual(zero(PLANS.pro.limits));
    expect(await getUsage(trial, NOV)).toEqual(zero(PRO_TRIAL.limits));
  });
});

describe("Free", () => {
  it("never takes a unit, and an invite bonus doesn't open AI on it", async () => {
    for (const feature of FEATURES) {
      expect((await consumeUsage(free, feature, NOV)).allowed).toBe(false);
    }
    const db = await getDb();
    await db.insert(usage).values({ subject: free.id, feature: "fix", period: monthKey(NOV), bonus: 10 });
    const result = await consumeUsage(free, "fix", NOV);
    expect(result.allowed).toBe(false);
    expect(result.usage.fix).toEqual({ used: 0, limit: 0 });
  });
});

describe("the trial", () => {
  it("counts in its own fixed period, which ends with the trial", async () => {
    const state = await getUsageState(trial, NOV);
    expect(state.period).toEqual({ kind: "trial", resetsAt: TRIAL_END });
    expect(PRO_TRIAL.limits).toEqual({ tailor: 10, letter: 15, fix: 50, import: 5, draft: 3, github: 3 });
  });

  it("never opens a second allowance: not when the month turns, nor when the end date moves", async () => {
    await consumeTimes(trial, "tailor", PRO_TRIAL.limits.tailor);
    expect((await consumeUsage(trial, "tailor", DEC)).allowed).toBe(false);
    const moved = { ...trial, trialEndsAt: TRIAL_END + 2 * HOUR };
    expect((await consumeUsage(moved, "tailor", NOV)).allowed).toBe(false);
    expect(await trialCount("tailor")).toBe(PRO_TRIAL.limits.tailor);
    // Nothing spills into the month the trial ran in.
    expect(await storedCount(trial, "tailor")).toBeNull();
  });

  it("gives way to the full Pro allowance once the first payment ends it", async () => {
    await consumeTimes(trial, "tailor", PRO_TRIAL.limits.tailor);
    const paid: SessionUser = { ...trial, trialEndsAt: null };
    const result = await consumeUsage(paid, "tailor", NOV);
    expect(result.allowed).toBe(true);
    expect(result.usage.tailor).toEqual({ used: 1, limit: PLANS.pro.limits.tailor });
    expect(result.period.kind).toBe("month");
  });
});

describe("consumeUsage", () => {
  it("takes one unit and returns the fresh snapshot", async () => {
    const result = await consumeUsage(pro, "fix", NOV);
    expect(result.allowed).toBe(true);
    expect(result.usage.fix).toEqual({ used: 1, limit: PLANS.pro.limits.fix });
    expect(result.usage.tailor.used).toBe(0);
  });

  it("lets exactly `limit` of many parallel calls through", async () => {
    for (const feature of ["fix", "tailor", "letter"] as const) {
      const limit = PRO_TRIAL.limits[feature];
      const results = await Promise.all(
        Array.from({ length: limit + 5 }, () => consumeUsage(trial, feature, NOV)),
      );
      expect(results.filter((result) => result.allowed)).toHaveLength(limit);
      expect(await trialCount(feature)).toBe(limit);
    }
  });

  it("leaves the count unchanged once the limit is reached", async () => {
    await consumeTimes(trial, "tailor", PRO_TRIAL.limits.tailor);
    const blocked = await consumeUsage(trial, "tailor", NOV);
    expect(blocked.allowed).toBe(false);
    expect(blocked.usage.tailor).toEqual({ used: 10, limit: 10 });
    expect(await trialCount("tailor")).toBe(10);
  });

  it("keeps features and months apart", async () => {
    await consumeTimes(pro, "tailor", 3);
    expect((await consumeUsage(pro, "fix", NOV)).allowed).toBe(true);
    const nextMonth = await consumeUsage(pro, "tailor", DEC);
    expect(nextMonth.allowed).toBe(true);
    expect(nextMonth.usage.tailor.used).toBe(1);
  });

  it("meters cover letters and answers on their own allowance", async () => {
    await consumeTimes(trial, "letter", PRO_TRIAL.limits.letter);
    const blocked = await consumeUsage(trial, "letter", NOV);
    expect(blocked.allowed).toBe(false);
    expect(blocked.usage.letter).toEqual({ used: 15, limit: 15 });
    expect(blocked.usage.tailor.used).toBe(0);
    expect((await consumeUsage(trial, "tailor", NOV)).allowed).toBe(true);
  });

  it("applies the plan the user has now: a drop to Free stops AI and keeps the old count", async () => {
    await consumeTimes(pro, "tailor", 5);
    const downgraded: SessionUser = { ...pro, plan: "free" };
    expect((await getUsage(downgraded, NOV)).tailor).toEqual({ used: 0, limit: 0 });
    expect((await consumeUsage(downgraded, "tailor", NOV)).allowed).toBe(false);
    expect(await storedCount(pro, "tailor")).toBe(5);
  });
});

describe("refundUsage", () => {
  it("gives a unit back so the next call is allowed again, on the trial too", async () => {
    await consumeTimes(trial, "tailor", PRO_TRIAL.limits.tailor);
    await refundUsage(trial, "tailor", NOV);
    expect((await getUsage(trial, NOV)).tailor.used).toBe(9);
    expect((await consumeUsage(trial, "tailor", NOV)).allowed).toBe(true);
  });

  it("never goes below zero", async () => {
    await refundUsage(pro, "fix", NOV);
    expect(await storedCount(pro, "fix")).toBeNull();

    await consumeUsage(pro, "fix", NOV);
    await Promise.all([1, 2, 3].map(() => refundUsage(pro, "fix", NOV)));
    expect(await storedCount(pro, "fix")).toBe(0);
    expect((await getUsage(pro, NOV)).fix.used).toBe(0);
  });
});

describe("weekly subscribers", () => {
  const weekly = (overrides: Partial<SessionUser> = {}): SessionUser => ({
    ...pro,
    planInterval: "week",
    planRenewsAt: RENEWS_AT,
    ...overrides,
  });

  async function useUp(user: SessionUser, feature: Feature, now = NOV) {
    const limit = (await getUsage(user, now))[feature].limit;
    await consumeTimes(user, feature, limit, now);
    return limit;
  }

  it("get the weekly limits for the billing week ending at the renewal", async () => {
    for (const plan of ["pro", "max"] as const) {
      const state = await getUsageState(weekly({ plan }), NOV);
      expect(state.period).toEqual({ kind: "week", resetsAt: WEEK_END });
      for (const feature of FEATURES) {
        expect(state.usage[feature]).toEqual({ used: 0, limit: PLANS[plan].weeklyLimits[feature] });
      }
    }
    expect(PLANS.pro.weeklyLimits).toEqual({ tailor: 38, letter: 38, fix: 250, import: 25, draft: 13, github: 13 });
    expect(PLANS.max.weeklyLimits).toEqual({ tailor: 75, letter: 75, fix: 750, import: 75, draft: 38, github: 38 });
  });

  it("leave monthly, yearly and Free on the calendar month", async () => {
    for (const user of [pro, { ...pro, planInterval: "month" as const }, { ...pro, planInterval: "year" as const }]) {
      const state = await getUsageState({ ...user, planRenewsAt: RENEWS_AT }, NOV);
      expect(state.period).toEqual({ kind: "month", resetsAt: DEC - 1000 });
      expect(state.usage.tailor.limit).toBe(PLANS.pro.limits.tailor);
    }
    // A stale interval on a Free row never makes it weekly.
    const state = await getUsageState({ ...free, planInterval: "week" }, NOV);
    expect(state.period.kind).toBe("month");
    expect(state.usage.tailor.limit).toBe(0);
  });

  it("use ISO weeks when there is no renewal date (mock billing)", async () => {
    const user = weekly({ planRenewsAt: null });
    expect((await getUsageState(user, NOV)).period).toEqual({ kind: "week", resetsAt: isoWeekEnd(NOV) });
    await consumeUsage(user, "fix", NOV);
    expect(await storedCount(user, "fix", NOV, weekKey(isoWeekEnd(NOV)))).toBe(1);
  });

  it("stop at the weekly limit and start over when the billing week ends", async () => {
    const user = weekly();
    const limit = await useUp(user, "tailor");
    expect(limit).toBe(38);
    const blocked = await consumeUsage(user, "tailor", NOV);
    expect(blocked).toMatchObject({ allowed: false, usage: { tailor: { used: 38, limit: 38 } } });
    expect(blocked.period).toEqual({ kind: "week", resetsAt: WEEK_END });
    expect((await consumeUsage(user, "tailor", WEEK_END - 1)).allowed).toBe(false);

    const nextWeek = await consumeUsage(user, "tailor", WEEK_END);
    expect(nextWeek.allowed).toBe(true);
    expect(nextWeek.usage.tailor.used).toBe(1);
    expect(nextWeek.period.resetsAt).toBe(WEEK_END + WEEK_MS);
  });

  it("let exactly the weekly limit through under parallel calls", async () => {
    const user = weekly();
    const results = await Promise.all(Array.from({ length: 45 }, () => consumeUsage(user, "tailor", NOV)));
    expect(results.filter((result) => result.allowed)).toHaveLength(38);
    expect(await storedCount(user, "tailor", NOV, weekKey(WEEK_END))).toBe(38);
    expect(await storedCount(user, "tailor", NOV)).toBe(38);
  });

  it("keep a started week running when the renewal date moves or is cleared", async () => {
    await useUp(weekly(), "tailor");
    // A scheduled cancellation clears the date; a plan change can move it.
    for (const planRenewsAt of [null, RENEWS_AT + 3 * 24 * HOUR, RENEWS_AT - 2 * 24 * HOUR]) {
      const moved = weekly({ planRenewsAt });
      const blocked = await consumeUsage(moved, "tailor", NOV);
      expect(blocked.allowed).toBe(false);
      expect(blocked.period.resetsAt).toBe(WEEK_END);
    }
    // Once it ends, the new date decides the next week.
    const later = weekly({ planRenewsAt: RENEWS_AT + 3 * 24 * HOUR });
    const next = await consumeUsage(later, "tailor", WEEK_END);
    expect(next.allowed).toBe(true);
    expect(next.period.resetsAt).toBe(WEEK_END + 3 * 24 * HOUR);
  });

  it("never get a fresh allowance from switching back and forth", async () => {
    const monthly: SessionUser = { ...pro, planInterval: "month" };
    await consumeTimes(monthly, "tailor", 10);

    // Into weekly: the week has its own count, so the week's allowance is all there.
    const intoWeekly = await consumeUsage(weekly(), "tailor", NOV);
    expect(intoWeekly.usage.tailor).toEqual({ used: 1, limit: 38 });
    await consumeTimes(weekly(), "tailor", 37);
    expect((await consumeUsage(weekly(), "tailor", NOV)).allowed).toBe(false);

    // Back to monthly: the weekly uses counted toward November too.
    expect((await getUsage(monthly, NOV)).tailor).toEqual({ used: 48, limit: 150 });
    await consumeTimes(monthly, "tailor", 102);
    expect((await consumeUsage(monthly, "tailor", NOV)).allowed).toBe(false);

    // And weekly again in the same week: still used up.
    expect((await consumeUsage(weekly(), "tailor", NOV)).allowed).toBe(false);
    expect((await getUsage(weekly(), NOV)).tailor).toEqual({ used: 38, limit: 38 });
  });

  it("refund to both the week and the month", async () => {
    const user = weekly();
    await consumeTimes(user, "letter", 2);
    await refundUsage(user, "letter", NOV);
    expect(await storedCount(user, "letter", NOV, weekKey(WEEK_END))).toBe(1);
    expect(await storedCount(user, "letter", NOV)).toBe(1);
    await Promise.all([1, 2, 3].map(() => refundUsage(user, "letter", NOV)));
    expect(await storedCount(user, "letter", NOV, weekKey(WEEK_END))).toBe(0);
    expect(await storedCount(user, "letter", NOV)).toBe(0);
  });

  it("add invite bonuses stored on the week's row to the weekly limit", async () => {
    const db = await getDb();
    await db.insert(usage).values({ subject: pro.id, feature: "tailor", period: weekKey(WEEK_END), count: 0, bonus: 2 });
    expect((await getUsage(weekly(), NOV)).tailor).toEqual({ used: 0, limit: 40 });
    // Monthly sees none of it.
    expect((await getUsage(pro, NOV)).tailor.limit).toBe(PLANS.pro.limits.tailor);
  });
});

describe("billing months", () => {
  it("move by whole months, keeping the day and clamping it to a short month's last", () => {
    const jan31 = Date.UTC(2026, 0, 31, 9, 30);
    expect(addMonths(jan31, 1)).toBe(Date.UTC(2026, 1, 28, 9, 30));
    expect(addMonths(jan31, 2)).toBe(Date.UTC(2026, 2, 31, 9, 30));
    expect(addMonths(jan31, 3)).toBe(Date.UTC(2026, 3, 30, 9, 30));
    expect(addMonths(jan31, 12)).toBe(Date.UTC(2027, 0, 31, 9, 30));
    expect(addMonths(jan31, -2)).toBe(Date.UTC(2025, 10, 30, 9, 30));
    expect(addMonths(Date.UTC(2026, 10, 17), 1)).toBe(Date.UTC(2026, 11, 17));
  });

  it("know leap years", () => {
    expect(addMonths(Date.UTC(2028, 0, 31), 1)).toBe(Date.UTC(2028, 1, 29));
    expect(addMonths(Date.UTC(2027, 0, 31), 1)).toBe(Date.UTC(2027, 1, 28));
    // A year that starts on Feb 29 resets on the 29th, and on Feb 28 when February is shorter.
    const leapDay = Date.UTC(2028, 1, 29, 12);
    expect(addMonths(leapDay, 1)).toBe(Date.UTC(2028, 2, 29, 12));
    expect(addMonths(leapDay, 12)).toBe(Date.UTC(2029, 1, 28, 12));
    expect(addMonths(leapDay, 48)).toBe(Date.UTC(2032, 1, 29, 12));
  });

  it("find the month holding now from an anchor on either side of it", () => {
    const anchor = Date.UTC(2026, 0, 31, 9, 30);
    const feb28 = Date.UTC(2026, 1, 28, 9, 30);
    expect(monthWindow(anchor, feb28 - 1)).toEqual({ start: anchor, end: feb28 });
    expect(monthWindow(anchor, feb28)).toEqual({ start: feb28, end: Date.UTC(2026, 2, 31, 9, 30) });
    // Every step is from the anchor, so the 31st is back after February.
    expect(monthWindow(anchor, Date.UTC(2026, 3, 1))).toEqual({
      start: Date.UTC(2026, 2, 31, 9, 30),
      end: Date.UTC(2026, 3, 30, 9, 30),
    });
    expect(monthWindow(anchor, Date.UTC(2025, 11, 31, 9, 29))).toEqual({
      start: Date.UTC(2025, 10, 30, 9, 30),
      end: Date.UTC(2025, 11, 31, 9, 30),
    });
  });

  it("run a monthly plan from one renewal to the next, as Creem reported them", () => {
    const monthly = { planInterval: "month" as const, planPeriodStartsAt: P_START, planPeriodEndsAt: P_END };
    expect(billingMonth(monthly, NOV)).toEqual({ start: P_START, end: P_END });
    expect(billingMonth(monthly, DEC)).toEqual({ start: P_START, end: P_END });
    // The renewal's webhook is late: the month after runs from the old end to the same day after.
    expect(billingMonth(monthly, P_END + HOUR)).toEqual({ start: P_END, end: P_NEXT });
    // Milliseconds don't make another month.
    expect(billingMonth({ ...monthly, planPeriodStartsAt: P_START + 123 }, NOV)).toEqual({ start: P_START, end: P_END });
  });

  it("give a yearly plan monthly windows on the day its year started, clamped in short months", () => {
    const yearly = {
      planInterval: "year" as const,
      planPeriodStartsAt: Date.UTC(2026, 0, 31, 9, 30),
      planPeriodEndsAt: Date.UTC(2027, 0, 31, 9, 30),
    };
    expect(billingMonth(yearly, Date.UTC(2026, 1, 10))).toEqual({
      start: Date.UTC(2026, 0, 31, 9, 30),
      end: Date.UTC(2026, 1, 28, 9, 30),
    });
    expect(billingMonth(yearly, NOV)).toEqual({
      start: Date.UTC(2026, 9, 31, 9, 30),
      end: Date.UTC(2026, 10, 30, 9, 30),
    });
    expect(billingMonth(yearly, Date.UTC(2026, 11, 31, 10))).toEqual({
      start: Date.UTC(2026, 11, 31, 9, 30),
      end: Date.UTC(2027, 0, 31, 9, 30),
    });
  });

  it("are unknown until a webhook stores the period", () => {
    expect(billingMonth({ planInterval: "month", planPeriodStartsAt: null, planPeriodEndsAt: null }, NOV)).toBeNull();
    expect(billingMonth({ planInterval: "year" }, NOV)).toBeNull();
  });
});

describe("monthly and yearly subscribers", () => {
  const dated = (overrides: Partial<SessionUser> = {}): SessionUser => ({
    ...pro,
    planInterval: "month",
    planRenewsAt: P_END,
    planPeriodStartsAt: P_START,
    planPeriodEndsAt: P_END,
    ...overrides,
  });

  async function useAll(user: SessionUser, feature: Feature, key: string) {
    const db = await getDb();
    await db.insert(usage).values({ subject: user.id, feature, period: key, count: PLANS[user.plan].limits[feature] });
  }

  it("count in the billing period and say its end is the renewal", async () => {
    const state = await getUsageState(dated(), NOV);
    expect(state.period).toEqual({ kind: "month", resetsAt: P_END, renews: true });
    await consumeUsage(dated(), "tailor", NOV);
    expect(await storedCount(pro, "tailor", NOV, cycleKey(P_START))).toBe(1);
    expect(await storedCount(pro, "tailor", NOV)).toBeNull();
  });

  it("keep counting past the 1st and start over when the plan renews", async () => {
    const user = dated();
    await useAll(user, "tailor", cycleKey(P_START));
    expect((await consumeUsage(user, "tailor", NOV)).allowed).toBe(false);
    // Dec 1 is still the same billing month.
    expect((await consumeUsage(user, "tailor", DEC)).allowed).toBe(false);
    expect((await consumeUsage(user, "tailor", P_END - MINUTE)).allowed).toBe(false);

    // The renewal's webhook stores the next period: a fresh month that ends at the next renewal.
    const renewed = dated({ planPeriodStartsAt: P_END, planPeriodEndsAt: P_NEXT, planRenewsAt: P_NEXT });
    const next = await consumeUsage(renewed, "tailor", P_END + MINUTE);
    expect(next).toMatchObject({ allowed: true, usage: { tailor: { used: 1, limit: 150 } } });
    expect(next.period).toEqual({ kind: "month", resetsAt: P_NEXT, renews: true });
    // Before that webhook lands, the account already counts in that same next month.
    const late = await consumeUsage(user, "tailor", P_END + MINUTE);
    expect(late).toMatchObject({ allowed: true, usage: { tailor: { used: 2 } } });
  });

  it("give yearly plans monthly limits that reset on the day the year started", async () => {
    const yearStart = Date.UTC(2026, 0, 31, 9, 30);
    const yearly = dated({
      planInterval: "year",
      planPeriodStartsAt: yearStart,
      planPeriodEndsAt: addMonths(yearStart, 12),
      planRenewsAt: addMonths(yearStart, 12),
    });
    const state = await getUsageState(yearly, NOV);
    // Between renewals, so the reset isn't called the renewal.
    expect(state.period).toEqual({ kind: "month", resetsAt: Date.UTC(2026, 10, 30, 9, 30), renews: false });
    expect(state.usage.tailor).toEqual({ used: 0, limit: PLANS.pro.limits.tailor });
    await useAll(yearly, "tailor", cycleKey(Date.UTC(2026, 9, 31, 9, 30)));
    expect((await consumeUsage(yearly, "tailor", NOV)).allowed).toBe(false);
    expect((await consumeUsage(yearly, "tailor", Date.UTC(2026, 10, 30, 9, 30))).allowed).toBe(true);
  });

  it("fall back to the calendar month, and log it, while no period is stored", async () => {
    const warn = vi.spyOn(log, "warn").mockImplementation(() => {});
    const old = dated({ planPeriodStartsAt: null, planPeriodEndsAt: null });
    const state = await getUsageState(old, NOV);
    expect(state.period).toEqual({ kind: "month", resetsAt: DEC - 1000 });
    expect(state.usage.tailor).toEqual({ used: 0, limit: PLANS.pro.limits.tailor });
    expect(warn).toHaveBeenCalledWith("usage.period_fallback", { userId: pro.id, interval: "month" });
    // Neither blocked nor unlimited: the usual limit, on the calendar month's row.
    await useAll(old, "fix", monthKey(NOV));
    expect((await consumeUsage(old, "fix", NOV)).allowed).toBe(false);
    // Free has no billing period to miss.
    warn.mockClear();
    await getUsageState(free, NOV);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("carryUsageOver", () => {
  const monthly = (overrides: Partial<SessionUser> = {}): SessionUser => ({
    ...pro,
    planInterval: "month",
    planRenewsAt: P_END,
    planPeriodStartsAt: P_START,
    planPeriodEndsAt: P_END,
    ...overrides,
  });
  // Creem starting a new period at `at`, e.g. for a plan change it charges for straight away.
  const periodFrom = (at: number): Partial<SessionUser> => ({
    planPeriodStartsAt: at,
    planPeriodEndsAt: addMonths(at, 1),
    planRenewsAt: addMonths(at, 1),
  });

  it("keeps the count when Pro becomes Max partway through, and back, without doubling it", async () => {
    const db = await getDb();
    const user = monthly();
    await consumeTimes(user, "tailor", 5, NOV);
    // Creem kept the period: the same month, nothing to copy.
    const sameDates: SessionUser = { ...user, plan: "max" };
    await carryUsageOver(db, user, sameDates, NOV);
    expect((await getUsage(sameDates, NOV)).tailor).toEqual({ used: 5, limit: PLANS.max.limits.tailor });

    // Creem started a new period at the change: the count moves to it.
    const max = monthly({ plan: "max", ...periodFrom(NOV - HOUR) });
    await carryUsageOver(db, user, max, NOV);
    expect((await getUsage(max, NOV)).tailor).toEqual({ used: 5, limit: PLANS.max.limits.tailor });
    await consumeUsage(max, "tailor", NOV);

    // A downgrade does the same, and a retried webhook adds nothing.
    const down = monthly(periodFrom(NOV));
    await carryUsageOver(db, max, down, NOV + MINUTE);
    await carryUsageOver(db, max, down, NOV + MINUTE);
    expect((await getUsage(down, NOV + MINUTE)).tailor).toEqual({ used: 6, limit: PLANS.pro.limits.tailor });
  });

  it("starts over on a renewal, even one Creem dates a few minutes early", async () => {
    const db = await getDb();
    const user = monthly();
    await consumeTimes(user, "tailor", 5, NOV);
    const renewed = monthly({ planPeriodStartsAt: P_END - 5 * MINUTE, planPeriodEndsAt: P_NEXT, planRenewsAt: P_NEXT });
    await carryUsageOver(db, user, renewed, P_END - 4 * MINUTE);
    expect((await getUsage(renewed, P_END - 4 * MINUTE)).tailor.used).toBe(0);
  });

  it("carries a late renewal's first days over instead of counting them twice", async () => {
    const db = await getDb();
    const user = monthly();
    // Two days past the period's end, its renewal still not in.
    await consumeTimes(user, "tailor", 3, P_END + 2 * DAY_MS);
    // A payment retried until then starts the new period on the day it went through.
    const paid = monthly(periodFrom(P_END + 2 * DAY_MS + HOUR));
    await carryUsageOver(db, user, paid, P_END + 2 * DAY_MS + HOUR);
    expect((await getUsage(paid, P_END + 2 * DAY_MS + HOUR)).tailor.used).toBe(3);
  });

  it("moves a row from calendar months to billing months without losing this month's count", async () => {
    vi.spyOn(log, "warn").mockImplementation(() => {});
    const db = await getDb();
    // Paid before billing months: counted on "2026-11", renewing on Dec 10.
    const old = monthly({ planPeriodStartsAt: null, planPeriodEndsAt: null });
    await consumeTimes(old, "fix", 4, NOV);
    // Its first dated webhook comes partway through the period.
    const dated = monthly();
    await carryUsageOver(db, old, dated, NOV);
    expect((await getUsage(dated, NOV)).fix.used).toBe(4);
    // Again (a second event): still 4, never 8.
    await carryUsageOver(db, old, dated, NOV);
    expect((await getUsage(dated, NOV)).fix.used).toBe(4);
  });

  it("starts a migrated row fresh when its first dated webhook is the renewal", async () => {
    vi.spyOn(log, "warn").mockImplementation(() => {});
    const db = await getDb();
    const old = monthly({ planPeriodStartsAt: null, planPeriodEndsAt: null });
    await consumeTimes(old, "fix", 4, P_END - HOUR);
    const renewed = monthly({ planPeriodStartsAt: P_END, planPeriodEndsAt: P_NEXT, planRenewsAt: P_NEXT });
    await carryUsageOver(db, old, renewed, P_END + MINUTE);
    expect((await getUsage(renewed, P_END + MINUTE)).fix.used).toBe(0);
  });

  it("carries a week's uses and Free's invite extras into a monthly plan", async () => {
    const db = await getDb();
    const weekly: SessionUser = { ...pro, planInterval: "week", planRenewsAt: RENEWS_AT };
    await consumeTimes(weekly, "tailor", 3, NOV);
    const toMonthly = monthly(periodFrom(NOV));
    await carryUsageOver(db, weekly, toMonthly, NOV);
    expect((await getUsage(toMonthly, NOV)).tailor.used).toBe(3);

    await db.insert(usage).values({ subject: free.id, feature: "tailor", period: monthKey(NOV), bonus: 3 });
    const bought: SessionUser = { ...free, plan: "pro", planInterval: "month", ...periodFrom(NOV) };
    await carryUsageOver(db, free, bought, NOV);
    expect((await getUsage(bought, NOV)).tailor).toEqual({ used: 0, limit: PLANS.pro.limits.tailor + 3 });
  });

  it("starts the full allowance fresh when a trial's first payment lands", async () => {
    const db = await getDb();
    await consumeTimes(trial, "tailor", 4, NOV);
    const paid: SessionUser = { ...trial, trialEndsAt: null, ...periodFrom(TRIAL_END) };
    await carryUsageOver(db, trial, paid, TRIAL_END + MINUTE);
    expect((await getUsage(paid, TRIAL_END + MINUTE)).tailor.used).toBe(0);
  });
});
