import { and, eq, gt, inArray, sql } from "drizzle-orm";
import {
  aiTokenBudget,
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

function calendarMonth(now: number): ResolvedPeriod {
  const date = new Date(now);
  return {
    kind: "month",
    key: monthKey(now),
    startsAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    resetsAt: Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  };
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

export function resolvePeriod(
  account: PeriodAccount,
  now = Date.now(),
  { quiet = false }: { quiet?: boolean } = {},
): ResolvedPeriod {
  if (isTrialing(account)) {
    return {
      kind: "trial",
      key: TRIAL_PERIOD_KEY,
      startsAt: null,
      resetsAt: account.trialEndsAt ?? now,
    };
  }
  return monthPeriod(account, now, quiet);
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
  return account ? resolvePeriod(account, now) : null;
}

// Call inside the plan's transaction, under its user row lock, so a retried webhook adds nothing.
export async function carryUsageOver(
  db: Db,
  before: PeriodAccount,
  after: PeriodAccount,
  now = Date.now(),
): Promise<void> {
  const to = resolvePeriod(after, now, { quiet: true });
  if (to.kind !== "trial" && !to.key.startsWith(CYCLE_PREFIX)) return;
  const from = resolvePeriod(before, now, { quiet: true });
  if (from.key === to.key) return;
  // Counts move only between paid months; Free and a trial keep their own, and pass on unspent invite extras.
  const keepCounts = isPaidPlan(before.plan) && from.kind !== "trial" && to.kind !== "trial";
  if (keepCounts && isRenewal(before, from, to)) return;
  const limits = planLimits(before.plan, from.kind);
  const rows = await periodCounts(db, after.id, from.key);
  const carried = rows
    .map((row) => (keepCounts ? row : { ...row, count: 0, bonus: unspentBonus(row, limits) }))
    .filter((row) => row.count > 0 || row.bonus > 0);
  if (carried.length === 0) return;
  await db
    .insert(usage)
    .values(carried.map((row) => ({ ...row, subject: after.id, period: to.key })))
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: keepCounts
        ? {
            count: sql`greatest(${usage.count}, excluded.count)`,
            bonus: sql`greatest(${usage.bonus}, excluded.bonus)`,
          }
        : { bonus: sql`${usage.bonus} + excluded.bonus` },
    });
  if (keepCounts) return;
  // Moved, not copied: going back to Free that month must not spend the same extras twice.
  for (const row of carried) {
    await db
      .update(usage)
      .set({ bonus: sql`greatest(0, ${usage.bonus} - ${row.bonus})` })
      .where(
        and(
          eq(usage.subject, after.id),
          eq(usage.feature, row.feature),
          eq(usage.period, from.key),
        ),
      );
  }
}

function unspentBonus(row: CountRow, limits: Record<Feature, number>): number {
  const feature = FEATURES.find((candidate) => candidate === row.feature);
  const pastPlan = Math.max(0, row.count - (feature ? limits[feature] : 0));
  return Math.max(0, row.bonus - pastPlan);
}

function isRenewal(before: PeriodAccount, from: ResolvedPeriod, to: ResolvedPeriod): boolean {
  if (!isPaidPlan(before.plan) || to.startsAt === null) return false;
  const boundary = from.key.startsWith(CYCLE_PREFIX) ? from.resetsAt : before.planRenewsAt;
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

// Invite extras add to what the plan includes, Free's fixes too; a feature it leaves out stays shut.
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
  const period = resolvePeriod(user, now);
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
  const period = resolvePeriod(user, now);
  const limits = planLimits(user.plan, period.kind);
  const limit = limits[feature];
  // The other counts are read beside the take; the taken row's own count comes back with it.
  const [taken, rows] = await Promise.all([
    limit > 0 ? takeUnit(db, user.id, feature, period.key, limit) : null,
    periodCounts(db, user.id, period.key),
  ]);
  const counts = taken ? [...rows.filter((row) => row.feature !== feature), taken] : rows;
  return {
    allowed: taken !== null,
    usage: toSnapshot(limits, counts),
    period: publicPeriod(period),
  };
}

// consumeUsage's take alone, for a caller already holding the user's lock in its transaction.
export async function takeAllowanceUnit(
  db: Db,
  user: SessionUser,
  feature: Feature,
  now: number,
): Promise<boolean> {
  const period = resolvePeriod(user, now, { quiet: true });
  const limit = planLimits(user.plan, period.kind)[feature];
  return limit > 0 && (await takeUnit(db, user.id, feature, period.key, limit)) !== null;
}

async function takeUnit(
  db: Db,
  userId: string,
  feature: Feature,
  key: string,
  limit: number,
): Promise<CountRow | null> {
  const [taken] = await db
    .insert(usage)
    .values({ subject: userId, feature, period: key, count: 1 })
    .onConflictDoUpdate({
      target: [usage.subject, usage.feature, usage.period],
      set: { count: sql`${usage.count} + 1` },
      setWhere: sql`${usage.count} < ${limit} + ${usage.bonus}`,
    })
    .returning({ feature: usage.feature, count: usage.count, bonus: usage.bonus });
  return taken ?? null;
}

// Pass consumeUsage()'s now, so a refund just after a reset lands in the charged period.
export async function refundUsage(user: SessionUser, feature: Feature, now = Date.now()): Promise<void> {
  const db = await getDb();
  const { key } = resolvePeriod(user, now);
  await db
    .update(usage)
    .set({ count: sql`${usage.count} - 1` })
    .where(
      and(
        eq(usage.subject, user.id),
        eq(usage.feature, feature),
        eq(usage.period, key),
        gt(usage.count, 0),
      ),
    );
}
