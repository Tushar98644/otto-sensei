import { and, eq, gt, inArray, like, min, sql } from "drizzle-orm";
import {
  allowancePeriodFor,
  FEATURES,
  isTrialing,
  planLimits,
  type Feature,
  type Usage,
  type UsagePeriod,
  type UsageSnapshot,
} from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { usage, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";

// Server-only. Allowances per user from planLimits(), stored in the `usage` table as one row per
// (user, feature, period). Free, monthly and yearly accounts count per UTC calendar month
// ("2026-11"). Weekly subscribers count per billing week ("week:<ISO instant it ends>"): the 7 days
// ending at plan_renews_at, or the ISO week in UTC when there is no renewal date (mock billing).
// A trial counts in one fixed row, "trial": a person gets one trial, so a trial end date that moves
// (or a month that turns mid-trial) can never open a second allowance. Free's limits are all zero.
//
// Switching interval never starts an allowance over:
// - every period keeps its own row, so coming back to an interval within the same month or week
//   finds the count it left there;
// - a weekly use also counts toward the calendar month, so going from weekly to monthly mid-month
//   doesn't open a fresh month;
// - a billing week, once started, runs its full 7 days even if the renewal date moves or is cleared
//   (a plan change, a scheduled cancellation), so neither can open a fresh week early.

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
export const WEEK_MS = 7 * DAY_MS;
const WEEK_PREFIX = "week:";
export const TRIAL_PERIOD_KEY = "trial";

/** A period with its row key. Only kind and resetsAt leave the server. */
export type ResolvedPeriod = UsagePeriod & { key: string };

type PeriodAccount = Pick<SessionUser, "id" | "plan" | "planInterval" | "planRenewsAt" | "trialEndsAt">;

/** The UTC calendar month's key, e.g. "2026-11". */
export function monthKey(now = Date.now()): string {
  const date = new Date(now);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function weekKey(end: number): string {
  return `${WEEK_PREFIX}${new Date(end).toISOString()}`;
}

function monthPeriod(now: number): ResolvedPeriod {
  const date = new Date(now);
  const resetsAt = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
  return { kind: "month", key: monthKey(now), resetsAt };
}

function weekPeriod(end: number): ResolvedPeriod {
  return { kind: "week", key: weekKey(end), resetsAt: end };
}

/** When the billing week holding `now` ends: 7-day windows lined up with the renewal date. */
export function billingWeekEnd(renewsAt: number, now: number): number {
  // Whole minutes, so one renewal reported with different milliseconds is still one week.
  const anchor = Math.floor(renewsAt / MINUTE_MS) * MINUTE_MS;
  // The windows repeat on both sides of the date, so a renewal webhook that is late (now past the
  // date) or a date more than a week out still puts now in exactly one window.
  return anchor + (Math.floor((now - anchor) / WEEK_MS) + 1) * WEEK_MS;
}

/** When the ISO week holding `now` ends: the next Monday, 00:00 UTC. */
export function isoWeekEnd(now: number): number {
  const date = new Date(now);
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - sinceMonday + 7);
}

/** The period the account's allowance counts in at `now`. Takes a transaction too. */
export async function resolvePeriod(
  db: Db,
  account: PeriodAccount,
  now = Date.now(),
): Promise<ResolvedPeriod> {
  const kind = allowancePeriodFor(account.plan, account.planInterval, isTrialing(account));
  if (kind === "trial") {
    return { kind, key: TRIAL_PERIOD_KEY, resetsAt: account.trialEndsAt ?? now };
  }
  if (kind === "month") return monthPeriod(now);
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
    account.planRenewsAt === null ? isoWeekEnd(now) : billingWeekEnd(account.planRenewsAt, now),
  );
}

/** resolvePeriod() for an account known only by id, e.g. both sides of an invite. */
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
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return account ? resolvePeriod(db, account, now) : null;
}

function publicPeriod({ kind, resetsAt }: ResolvedPeriod): UsagePeriod {
  return { kind, resetsAt };
}

type CountRow = { feature: string; count: number; bonus: number };

// Exact primary-key lookups: one (subject, feature, period) seek per feature.
function periodCounts(db: Db, userId: string, key: string) {
  return db
    .select({ feature: usage.feature, count: usage.count, bonus: usage.bonus })
    .from(usage)
    .where(and(eq(usage.subject, userId), inArray(usage.feature, FEATURES), eq(usage.period, key)));
}

function toSnapshot(limits: Record<Feature, number>, rows: CountRow[]): UsageSnapshot {
  const entry = (feature: Feature): Usage => {
    const row = rows.find((candidate) => candidate.feature === feature);
    // Invite bonuses (src/lib/referrals) count for this period on top of the plan's limit, on plans
    // that include the feature at all: Free has no AI, bonus or not.
    const limit = limits[feature] > 0 ? limits[feature] + (row?.bonus ?? 0) : 0;
    // A downgrade can leave this period's count above the new limit; never report over 100% used.
    return { used: Math.min(row?.count ?? 0, limit), limit };
  };
  return Object.fromEntries(FEATURES.map((feature) => [feature, entry(feature)])) as UsageSnapshot;
}

export async function getUsageState(
  user: SessionUser,
  now = Date.now(),
): Promise<{ usage: UsageSnapshot; period: UsagePeriod }> {
  const db = await getDb();
  const period = await resolvePeriod(db, user, now);
  const rows = await periodCounts(db, user.id, period.key);
  return { usage: toSnapshot(planLimits(user.plan, period.kind), rows), period: publicPeriod(period) };
}

export async function getUsage(user: SessionUser, now = Date.now()): Promise<UsageSnapshot> {
  return (await getUsageState(user, now)).usage;
}

/**
 * Atomically checks the allowance and increments it: one upsert whose update only runs below the
 * limit, so two concurrent requests can't both take the last unit (Postgres locks the row for the
 * second until the first commits, then re-checks). allowed=false leaves the count unchanged.
 */
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

// Gives a unit back when the AI call failed after consumeUsage(). Never goes below zero.
// Pass the `now` given to consumeUsage() so a refund just after a reset still lands in the period
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
