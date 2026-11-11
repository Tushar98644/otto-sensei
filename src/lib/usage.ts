import { and, eq, gt, inArray, like, min, sql } from "drizzle-orm";
import {
  aiTokenBudget,
  allowancePeriodFor,
  FEATURES,
  isPaidPlan,
  isTrialing,
  planLimits,
  type AllowancePeriod,
  type Feature,
  type Usage,
  type UsagePeriod,
  type UsageSnapshot,
} from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { usage, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";

// One `usage` row per (user, feature, period). Period keys:
// - "cycle:<ISO start>": a monthly or yearly subscriber's billing month. Monthly: Creem's current
//   period. Yearly: one-month steps from the period start (a 31st becomes a short month's last
//   day).
// - "YYYY-MM": a UTC calendar month, for Free and for paid rows no webhook has dated yet.
// - "week:<ISO end>": the 7 days ending at plan_renews_at, or the UTC ISO week without one.
// - "trial": one fixed row, so a moved trial end can never open a second allowance.
//
// Only a renewal starts the allowance over. A move to another billing month (plan or interval
// change) carries usage over (carryUsageOver); each period keeps its own row; weekly uses also
// count
// toward the calendar month; and a started billing week always runs its full 7 days.

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
export const WEEK_MS = 7 * DAY_MS;
const WEEK_PREFIX = "week:";
const CYCLE_PREFIX = "cycle:";
export const TRIAL_PERIOD_KEY = "trial";
// Tokens, not a Feature, but it resets and carries over the same way (src/lib/ai-budget.ts).
export const AI_TOKENS = "ai_tokens";
const COUNTED = [...FEATURES, AI_TOKENS];
// How far from the date the last period gave a renewal can land and still be that renewal, not a
// change partway through. Also how close a reset must be to plan_renews_at to be called the renewal.
const RENEWAL_SLACK_MS = DAY_MS;

/** startsAt is null on the trial. Only kind, resetsAt and renews leave the server. */
export type ResolvedPeriod = UsagePeriod & { key: string; startsAt: number | null };

export type PeriodAccount = Pick<
  SessionUser,
  | "id"
  | "plan"
  | "planInterval"
  | "planRenewsAt"
  | "trialEndsAt"
  | "planPeriodStartsAt"
  | "planPeriodEndsAt"
>;

type BillingWindow = { start: number; end: number };

export function monthKey(now = Date.now()): string {
  const date = new Date(now);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function weekKey(end: number): string {
  return `${WEEK_PREFIX}${new Date(end).toISOString()}`;
}

export function cycleKey(start: number): string {
  return `${CYCLE_PREFIX}${new Date(start).toISOString()}`;
}

// UTC, keeping day and time of day. A day the month lacks becomes its last: Jan 31 + 1 month is
// Feb 28 (29 in a leap year).
export function addMonths(at: number, months: number): number {
  const date = new Date(at);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  // Day 0 of the next month is this month's last day; Date.UTC carries months past 11 into years.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(
    year,
    month,
    Math.min(date.getUTCDate(), lastDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
}

// Every step is taken from the anchor itself, so a 31st clamped to Feb 28 is back on Mar 31.
export function monthWindow(anchor: number, now: number): BillingWindow {
  const from = new Date(anchor);
  const at = new Date(now);
  let steps =
    (at.getUTCFullYear() - from.getUTCFullYear()) * 12 + (at.getUTCMonth() - from.getUTCMonth());
  // In now's own month the anchor's day can still be ahead.
  if (addMonths(anchor, steps) > now) steps -= 1;
  return { start: addMonths(anchor, steps), end: addMonths(anchor, steps + 1) };
}

const toMinute = (at: number) => Math.floor(at / MINUTE_MS) * MINUTE_MS;

// null when no webhook has stored a period for the row yet.
export function billingMonth(
  account: Pick<PeriodAccount, "planInterval" | "planPeriodStartsAt" | "planPeriodEndsAt">,
  now: number,
): BillingWindow | null {
  // Whole minutes, so one period reported with different milliseconds is still one month.
  const start = account.planPeriodStartsAt == null ? null : toMinute(account.planPeriodStartsAt);
  const end = account.planPeriodEndsAt == null ? null : toMinute(account.planPeriodEndsAt);
  const anchor = start ?? end;
  if (anchor === null) return null;
  // Yearly limits are monthly, on the day the year started (its end falls on the same day).
  if (account.planInterval === "year") return monthWindow(anchor, now);
  if (start !== null && end !== null && start <= now && now < end) return { start, end };
  // Past the end while the renewal's webhook is still on its way: carry on in monthly steps from
  // it, so the reset still comes on the renewal day. Before the start, step back from the start.
  if (end !== null && now >= end) return monthWindow(end, now);
  return monthWindow(anchor, now);
}

/** 7-day windows lined up with the renewal date. */
export function billingWeekEnd(renewsAt: number, now: number): number {
  // Whole minutes, so one renewal reported with different milliseconds is still one week.
  const anchor = toMinute(renewsAt);
  // The windows repeat on both sides of the date, so a renewal webhook that is late (now past the
  // date) or a date more than a week out still puts now in exactly one window.
  return anchor + (Math.floor((now - anchor) / WEEK_MS) + 1) * WEEK_MS;
}

/** The next Monday, 00:00 UTC. */
export function isoWeekEnd(now: number): number {
  const date = new Date(now);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sinceMonday + 7);
}

function calendarMonth(now: number): ResolvedPeriod {
  const date = new Date(now);
  return {
    kind: "month",
    key: monthKey(now),
    startsAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    resetsAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  };
}

function weekPeriod(end: number): ResolvedPeriod {
  return { kind: "week", key: weekKey(end), startsAt: end - WEEK_MS, resetsAt: end };
}

function monthPeriod(account: PeriodAccount, now: number, quiet: boolean): ResolvedPeriod {
  if (!isPaidPlan(account.plan)) return calendarMonth(now);
  const window = billingMonth(account, now);
  if (!window) {
    // Neither blocks nor opens AI: counts per calendar month until a subscription event stores the
    // period.
    if (!quiet) {
      log.warn("usage.period_fallback", { userId: account.id, interval: account.planInterval ?? null });
    }
    return calendarMonth(now);
  }
  const renewsAt = account.planRenewsAt;
  return {
    kind: "month",
    key: cycleKey(window.start),
    startsAt: window.start,
    resetsAt: window.end,
    renews: renewsAt != null && Math.abs(renewsAt - window.end) <= RENEWAL_SLACK_MS,
  };
}

// Takes a transaction too. quiet: don't log a paid row that has no billing period yet.
export async function resolvePeriod(
  db: Db,
  account: PeriodAccount,
  now = Date.now(),
  { quiet = false }: { quiet?: boolean } = {},
): Promise<ResolvedPeriod> {
  const kind = allowancePeriodFor(account.plan, account.planInterval, isTrialing(account));
  if (kind === "trial") {
    return { kind, key: TRIAL_PERIOD_KEY, startsAt: null, resetsAt: account.trialEndsAt ?? now };
  }
  if (kind === "month") return monthPeriod(account, now, quiet);
  // A week already started (any feature's row) whose 7 days hold now. Keys are fixed-width ISO
  // instants, so byte order ("C") is time order whatever the database's collation.
  const [running] = await db
    .select({ key: min(usage.period) })
    .from(usage)
    .where(
      and(
        eq(usage.subject, account.id),
        like(usage.period, `${WEEK_PREFIX}%`),
        sql`${usage.period} collate "C" > ${weekKey(now)}`,
        sql`${usage.period} collate "C" <= ${weekKey(now + WEEK_MS)}`,
      ),
    );
  const runningEnd = running?.key ? Date.parse(running.key.slice(WEEK_PREFIX.length)) : Number.NaN;
  if (Number.isFinite(runningEnd)) return weekPeriod(runningEnd);
  return weekPeriod(
    account.planRenewsAt == null ? isoWeekEnd(now) : billingWeekEnd(account.planRenewsAt, now),
  );
}

export async function periodForUser(
  db: Db,
  userId: string,
  now = Date.now(),
): Promise<ResolvedPeriod | null> {
  const [account] = await db
    .select({
      id: users.id,
      plan: users.plan,
      planInterval: users.planInterval,
      planRenewsAt: users.planRenewsAt,
      trialEndsAt: users.trialEndsAt,
      planPeriodStartsAt: users.planPeriodStartsAt,
      planPeriodEndsAt: users.planPeriodEndsAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return account ? resolvePeriod(db, account, now) : null;
}

// For a webhook that moves the account to another billing month without renewing it. The new
// month's rows take the old counts and bonuses (the higher of the two, so a retry adds nothing).
// Renewals, trial ends and moves to weekly or trial start over. Call inside the plan's transaction.
export async function carryUsageOver(
  db: Db,
  before: PeriodAccount,
  after: PeriodAccount,
  now = Date.now(),
): Promise<void> {
  const to = await resolvePeriod(db, after, now, { quiet: true });
  if (!to.key.startsWith(CYCLE_PREFIX)) return;
  const from = await resolvePeriod(db, before, now, { quiet: true });
  if (from.key === to.key || from.kind === "trial" || isRenewal(before, from, to)) return;
  // A week's uses also count toward the calendar month, the nearest a week has to a month.
  const source = from.kind === "week" ? monthKey(now) : from.key;
  const rows = await db
    .select({ feature: usage.feature, count: usage.count, bonus: usage.bonus })
    .from(usage)
    .where(and(eq(usage.subject, after.id), inArray(usage.feature, COUNTED), eq(usage.period, source)));
  const carried = rows.filter((row) => row.count > 0 || row.bonus > 0);
  if (carried.length === 0) return;
  await db
    .insert(usage)
    .values(carried.map((row) => ({ ...row, subject: after.id, period: to.key })))
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: {
        count: sql`greatest(${usage.count}, excluded.count)`,
        bonus: sql`greatest(${usage.bonus}, excluded.bonus)`,
      },
    });
}

// A renewal: the new month starts where the counted period ends, give or take a slightly early or
// late renewal. Rows still on calendar months only know their renewal from plan_renews_at.
function isRenewal(before: PeriodAccount, from: ResolvedPeriod, to: ResolvedPeriod): boolean {
  if (!isPaidPlan(before.plan) || to.startsAt === null) return false;
  const dated = from.key.startsWith(CYCLE_PREFIX) || from.kind === "week";
  const boundary = dated ? from.resetsAt : before.planRenewsAt;
  return boundary != null && to.startsAt >= boundary - RENEWAL_SLACK_MS;
}

export function publicPeriod({ kind, resetsAt, renews }: ResolvedPeriod): UsagePeriod {
  return renews === undefined ? { kind, resetsAt } : { kind, resetsAt, renews };
}

type CountRow = { feature: string; count: number; bonus: number };

function periodCounts(db: Db, userId: string, key: string) {
  return db
    .select({ feature: usage.feature, count: usage.count, bonus: usage.bonus })
    .from(usage)
    .where(and(eq(usage.subject, userId), inArray(usage.feature, COUNTED), eq(usage.period, key)));
}

function toSnapshot(limits: Record<Feature, number>, rows: CountRow[]): UsageSnapshot {
  const entry = (feature: Feature): Usage => {
    const row = rows.find((candidate) => candidate.feature === feature);
    // Invite bonuses count only on plans that include the feature: Free has no AI, bonus or not.
    const limit = limits[feature] > 0 ? limits[feature] + (row?.bonus ?? 0) : 0;
    // A downgrade can leave this period's count above the new limit; never report over 100% used.
    return { used: Math.min(row?.count ?? 0, limit), limit };
  };
  return Object.fromEntries(FEATURES.map((feature) => [feature, entry(feature)])) as UsageSnapshot;
}

// A call that started under budget can end over it, so never report over 100%.
function toBudget(user: SessionUser, kind: AllowancePeriod, rows: CountRow[]): Usage | null {
  const limit = aiTokenBudget(user.plan, kind);
  if (limit === null) return null;
  const used = rows.find((row) => row.feature === AI_TOKENS)?.count ?? 0;
  return { used: Math.min(used, limit), limit };
}

export async function getUsageState(
  user: SessionUser,
  now = Date.now(),
): Promise<{ usage: UsageSnapshot; period: UsagePeriod; aiBudget: Usage | null }> {
  const db = await getDb();
  const period = await resolvePeriod(db, user, now);
  const rows = await periodCounts(db, user.id, period.key);
  return {
    usage: toSnapshot(planLimits(user.plan, period.kind), rows),
    period: publicPeriod(period),
    aiBudget: toBudget(user, period.kind, rows),
  };
}

export async function getUsage(user: SessionUser, now = Date.now()): Promise<UsageSnapshot> {
  return (await getUsageState(user, now)).usage;
}

// One upsert whose update only runs below the limit, so two concurrent requests can't both take the
// last unit (Postgres locks the row, then re-checks). allowed=false leaves the count unchanged.
export async function consumeUsage(
  user: SessionUser,
  feature: Feature,
  now = Date.now(),
): Promise<{ allowed: boolean; usage: UsageSnapshot; period: UsagePeriod }> {
  const db = await getDb();
  const period = await resolvePeriod(db, user, now);
  const limits = planLimits(user.plan, period.kind);
  const limit = limits[feature];
  let allowed = false;
  if (limit > 0) {
    allowed =
      period.kind === "week"
        ? await db.transaction(async (tx) => {
            if (!(await takeUnit(tx, user.id, feature, period.key, limit))) return false;
            await countTowardMonth(tx, user.id, feature, now);
            return true;
          })
        : await takeUnit(db, user.id, feature, period.key, limit);
  }
  // Read after the write, so the snapshot always includes this increment.
  const rows = await periodCounts(db, user.id, period.key);
  return { allowed, usage: toSnapshot(limits, rows), period: publicPeriod(period) };
}

async function takeUnit(
  db: Db,
  userId: string,
  feature: Feature,
  key: string,
  limit: number,
): Promise<boolean> {
  // At the limit the DO UPDATE's WHERE is false, so nothing is written and RETURNING yields no row.
  // The bonus sits on the same locked row, so it's read in this one statement too.
  const taken = await db
    .insert(usage)
    .values({ subject: userId, feature, period: key, count: 1 })
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: { count: sql`${usage.count} + 1` },
      setWhere: sql`${usage.count} < ${limit} + ${usage.bonus}`,
    })
    .returning({ count: usage.count });
  return taken.length > 0;
}

// Uncapped: the month row only matters if the account moves to a monthly allowance later.
async function countTowardMonth(db: Db, userId: string, feature: Feature, now: number) {
  await db
    .insert(usage)
    .values({ subject: userId, feature, period: monthKey(now), count: 1 })
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: { count: sql`${usage.count} + 1` },
    });
}

// Never below zero. Pass consumeUsage()'s `now` so a refund just after a reset lands in the period
// that was charged.
export async function refundUsage(user: SessionUser, feature: Feature, now = Date.now()): Promise<void> {
  const db = await getDb();
  const period = await resolvePeriod(db, user, now);
  if (period.kind !== "week") return giveBack(db, user.id, feature, period.key);
  // Week row, then month row: the same order consumeUsage() locks them in, so the two can't deadlock.
  await db.transaction(async (tx) => {
    await giveBack(tx, user.id, feature, period.key);
    await giveBack(tx, user.id, feature, monthKey(now));
  });
}

async function giveBack(db: Db, userId: string, feature: Feature, key: string): Promise<void> {
  await db
    .update(usage)
    .set({ count: sql`${usage.count} - 1` })
    .where(
      and(
        eq(usage.subject, userId),
        eq(usage.feature, feature),
        eq(usage.period, key),
        gt(usage.count, 0),
      ),
    );
}
