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
import { DAY_MS, MINUTE_MS } from "@/lib/time";

export const WEEK_MS = 7 * DAY_MS;
const WEEK_PREFIX = "week:";
const CYCLE_PREFIX = "cycle:";
export const TRIAL_PERIOD_KEY = "trial";
export const AI_TOKENS = "ai_tokens";
const COUNTED = [...FEATURES, AI_TOKENS];
const RENEWAL_SLACK_MS = DAY_MS;

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

export function addMonths(at: number, months: number): number {
  const date = new Date(at);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
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

export function monthWindow(anchor: number, now: number): BillingWindow {
  const from = new Date(anchor);
  const at = new Date(now);
  let steps =
    (at.getUTCFullYear() - from.getUTCFullYear()) * 12 + (at.getUTCMonth() - from.getUTCMonth());
  if (addMonths(anchor, steps) > now) steps -= 1;
  return { start: addMonths(anchor, steps), end: addMonths(anchor, steps + 1) };
}

const toMinute = (at: number) => Math.floor(at / MINUTE_MS) * MINUTE_MS;

export function billingMonth(
  account: Pick<PeriodAccount, "planInterval" | "planPeriodStartsAt" | "planPeriodEndsAt">,
  now: number,
): BillingWindow | null {
  // Whole minutes, so one period reported with different milliseconds is still one month.
  const start = account.planPeriodStartsAt == null ? null : toMinute(account.planPeriodStartsAt);
  const end = account.planPeriodEndsAt == null ? null : toMinute(account.planPeriodEndsAt);
  const anchor = start ?? end;
  if (anchor === null) return null;
  if (account.planInterval === "year") return monthWindow(anchor, now);
  if (start !== null && end !== null && start <= now && now < end) return { start, end };
  if (end !== null && now >= end) return monthWindow(end, now);
  return monthWindow(anchor, now);
}

export function billingWeekEnd(renewsAt: number, now: number): number {
  const anchor = toMinute(renewsAt);
  return anchor + (Math.floor((now - anchor) / WEEK_MS) + 1) * WEEK_MS;
}

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
  // Keys are fixed-width ISO instants, so "C" byte order is time order under any collation.
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

// Call inside the plan's transaction; takes the higher count so a retried webhook adds nothing.
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
    const limit = limits[feature] > 0 ? limits[feature] + (row?.bonus ?? 0) : 0;
    return { used: Math.min(row?.count ?? 0, limit), limit };
  };
  return Object.fromEntries(FEATURES.map((feature) => [feature, entry(feature)])) as UsageSnapshot;
}

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

// Updates only below the limit, so concurrent requests can't both take the last unit.
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

async function countTowardMonth(db: Db, userId: string, feature: Feature, now: number) {
  await db
    .insert(usage)
    .values({ subject: userId, feature, period: monthKey(now), count: 1 })
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: { count: sql`${usage.count} + 1` },
    });
}

// Pass consumeUsage()'s now, so a refund just after a reset lands in the charged period.
export async function refundUsage(user: SessionUser, feature: Feature, now = Date.now()): Promise<void> {
  const db = await getDb();
  const period = await resolvePeriod(db, user, now);
  if (period.kind !== "week") return giveBack(db, user.id, feature, period.key);
  // Week row, then month row: consumeUsage()'s lock order, so the two can't deadlock.
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
