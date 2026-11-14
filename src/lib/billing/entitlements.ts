import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { billingEvents, trialReplacements, users, type UserRow } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/policy";
import { carryUsageOver, type PeriodAccount } from "@/lib/usage";
import { isUserId } from "@/lib/users";
import { isTrialEligible, recordTrialHistory } from "./trial";

type StatusGrant = "paid" | "free";

// Paddle's statuses, plus scheduled_cancel for a subscription whose cancel is pending.
const PLAN_BY_STATUS: Record<string, StatusGrant> = {
  trialing: "paid",
  active: "paid",
  past_due: "paid",
  scheduled_cancel: "paid",
  canceled: "free",
  paused: "free",
};

export function isEndedStatus(status: string): boolean {
  return status === "canceled";
}

export function isLiveStatus(status: string): boolean {
  return !isEndedStatus(status);
}

export function planForStatus(status: string): StatusGrant | null {
  return Object.hasOwn(PLAN_BY_STATUS, status) ? (PLAN_BY_STATUS[status] ?? null) : null;
}

export type SubscriptionState = {
  userId?: string;
  email?: string;
  customerId: string;
  subscriptionId: string;
  pricePlan: PaidPlanId | null;
  priceInterval: BillingInterval | null;
  status: string;
  renewsAt: number | null;
  periodStartsAt: number | null;
  periodEndsAt: number | null;
  // Undefined keeps what is stored for the same subscription.
  trialEndsAt?: number | null;
  eventAt: number | null;
  replacesSubscriptionId?: string | null;
  // Trialing, or past_due on the trial price: a trial nobody has paid for, one per person.
  unpaidTrial?: boolean;
};

export type WebhookSource = { eventId: string; eventType: string };

export type ApplyOptions = {
  resolveEmail?: (customerId: string) => Promise<string | null>;
};

export type IgnoreReason =
  "unknown_status" | "no_user" | "other_product" | "superseded" | "replaced" | "unsigned";

export type ApplyResult =
  | {
      outcome: "applied";
      userId: string;
      plan: PlanId;
      trialing: boolean;
      before: { plan: PlanId; trialing: boolean };
      // A different live subscription the user was on before this one took over.
      otherLiveSubscriptionId: string | null;
    }
  | { outcome: "duplicate" }
  | { outcome: "ignored"; reason: IgnoreReason }
  | { outcome: "rejected"; reason: "trial_reused"; userId: string };

export type UserLookup = {
  userId?: string;
  email?: string;
  customerId: string;
  subscriptionId: string;
};

const LOOKUP_LIMIT = 10;

export function findUserQuery(db: Db, lookup: UserLookup) {
  return db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      planInterval: users.planInterval,
      planStatus: users.planStatus,
      planRenewsAt: users.planRenewsAt,
      trialEndsAt: users.trialEndsAt,
      planPeriodStartsAt: users.planPeriodStartsAt,
      planPeriodEndsAt: users.planPeriodEndsAt,
      billingCustomerId: users.billingCustomerId,
      billingSubscriptionId: users.billingSubscriptionId,
    })
    .from(users)
    .where(
      or(
        // custom_data is free-form at Paddle; a value that isn't a uuid can't be one of our ids.
        lookup.userId && isUserId(lookup.userId) ? eq(users.id, lookup.userId) : undefined,
        eq(users.billingSubscriptionId, lookup.subscriptionId),
        eq(users.billingCustomerId, lookup.customerId),
        lookup.email ? eq(users.email, lookup.email) : undefined,
      ),
    )
    .limit(LOOKUP_LIMIT);
}

async function findUser(db: Db, lookup: UserLookup) {
  const email = lookup.email ? normalizeEmail(lookup.email) : undefined;
  const rows = await findUserQuery(db, { ...lookup, email });
  return (
    rows.find((row) => lookup.userId !== undefined && row.id === lookup.userId) ??
    rows.find((row) => row.billingSubscriptionId === lookup.subscriptionId) ??
    rows.find((row) => row.billingCustomerId === lookup.customerId) ??
    rows.find((row) => email !== undefined && row.email === email) ??
    null
  );
}

export async function findBillingUserId(lookup: UserLookup): Promise<string | null> {
  return (await findUser(await getDb(), lookup))?.id ?? null;
}

type FoundUser = NonNullable<Awaited<ReturnType<typeof findUser>>>;

function trialEndFor(state: SubscriptionState, user: FoundUser, plan: PlanId): number | null {
  if (plan === "free" || state.status === "active") return null;
  if (state.trialEndsAt !== undefined) return state.trialEndsAt;
  if (state.status === "trialing") {
    return state.periodEndsAt ?? state.renewsAt ?? user.trialEndsAt ?? null;
  }
  return user.billingSubscriptionId === state.subscriptionId ? user.trialEndsAt : null;
}

export async function applySubscriptionState(
  state: SubscriptionState,
  source: WebhookSource,
  now = Date.now(),
  options: ApplyOptions = {},
): Promise<ApplyResult> {
  const grant = planForStatus(state.status);
  if (grant === null) return { outcome: "ignored", reason: "unknown_status" };

  const db = await getDb();
  // A late "trialing" or first payment on the replaced trial would otherwise overwrite its plan.
  if (await isReplaced(db, state.subscriptionId)) return { outcome: "ignored", reason: "replaced" };
  let user = await findUser(db, state);
  // Paddle's subscription events carry no email, so it's read only when nothing else matched.
  if (!user && grant === "paid" && !state.email && options.resolveEmail) {
    const email = await options.resolveEmail(state.customerId);
    if (email) user = await findUser(db, { ...state, email });
  }
  if (!user) return { outcome: "ignored", reason: "no_user" };
  // Other prices in the same Paddle account must not grant a plan.
  const own = user.billingSubscriptionId === state.subscriptionId;
  // Paddle reuses a customer for any checkout typing their email, so a new subscription needs our signed id.
  if (!own && state.userId !== user.id) return { outcome: "ignored", reason: "unsigned" };
  if (state.pricePlan === null && !own) {
    return { outcome: "ignored", reason: "other_product" };
  }
  const plan: PlanId =
    grant === "free" ? "free" : (state.pricePlan ?? (user.plan === "free" ? "pro" : user.plan));
  const planInterval: BillingInterval | null =
    plan === "free" ? null : (state.priceInterval ?? user.planInterval);
  const trialEndsAt = trialEndFor(state, user, plan);
  const before = { plan: user.plan, trialing: user.plan !== "free" && user.trialEndsAt !== null };
  const tracked = chargeableSubscriptionId(user);
  // A paid replacement's own trial stays live until it's cancelled, so it's no second subscription.
  const otherLiveSubscriptionId =
    plan !== "free" &&
    tracked !== null &&
    tracked !== state.subscriptionId &&
    tracked !== state.replacesSubscriptionId
      ? tracked
      : null;
  const periodOf = (reported: number | null, stored: number | null) =>
    plan === "free" ? null : (reported ?? (own ? stored : null));
  const after: PeriodAccount = {
    id: user.id,
    plan,
    planInterval,
    planRenewsAt: plan === "free" ? null : state.renewsAt,
    trialEndsAt,
    planPeriodStartsAt: periodOf(state.periodStartsAt, user.planPeriodStartsAt),
    planPeriodEndsAt: periodOf(state.periodEndsAt, user.planPeriodEndsAt),
  };

  // Event id first: a redelivery changes nothing and a parallel one waits on the unique key.
  return db.transaction(async (tx): Promise<ApplyResult> => {
    const recorded = await tx
      .insert(billingEvents)
      .values({ id: source.eventId, type: source.eventType, receivedAt: now })
      .onConflictDoNothing()
      .returning({ id: billingEvents.id });
    if (recorded.length === 0) return { outcome: "duplicate" };
    if (plan !== "free" && state.unpaidTrial) {
      if (!(await lockUser(tx, user.id))) return { outcome: "ignored", reason: "no_user" };
      if (!(await mayTrial(tx, user.id, state.subscriptionId))) {
        // Nothing on the user; the row keeps its later events out and lets the cron retry the cancel.
        await tx
          .insert(trialReplacements)
          .values({
            replacedSubscriptionId: state.subscriptionId,
            subscriptionId: state.subscriptionId,
            userId: user.id,
            createdAt: now,
          })
          .onConflictDoNothing();
        return { outcome: "rejected", reason: "trial_reused", userId: user.id };
      }
    }
    const updated = await tx
      .update(users)
      .set({
        plan,
        planInterval,
        planStatus: state.status,
        planRenewsAt: after.planRenewsAt,
        trialEndsAt,
        planPeriodStartsAt: after.planPeriodStartsAt,
        planPeriodEndsAt: after.planPeriodEndsAt,
        billingCustomerId: state.customerId,
        billingSubscriptionId: state.subscriptionId,
        ...(state.eventAt === null ? {} : { billingEventAt: state.eventAt }),
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, user.id),
          // Only the tracked subscription can take a paid plan away.
          plan === "free"
            ? or(eq(users.plan, "free"), eq(users.billingSubscriptionId, state.subscriptionId))
            : undefined,
          // Paddle doesn't deliver in order, so an older event must not undo a newer one.
          state.eventAt === null
            ? undefined
            : or(
                isNull(users.billingSubscriptionId),
                ne(users.billingSubscriptionId, state.subscriptionId),
                isNull(users.billingEventAt),
                lte(users.billingEventAt, state.eventAt),
              ),
        ),
      )
      .returning({ id: users.id, email: users.email });
    const [row] = updated;
    if (!row) return { outcome: "ignored", reason: "superseded" };
    const paying =
      plan !== "free" &&
      trialEndsAt === null &&
      (state.status === "active" || state.status === "scheduled_cancel");
    // Paddle.js can set custom_data in the browser, so only the trial this user is on gets cancelled.
    const replaces =
      paying && state.replacesSubscriptionId === user.billingSubscriptionId
        ? state.replacesSubscriptionId
        : null;
    if (replaces && replaces !== state.subscriptionId) {
      await tx
        .insert(trialReplacements)
        .values({
          replacedSubscriptionId: replaces,
          subscriptionId: state.subscriptionId,
          userId: user.id,
          createdAt: now,
        })
        .onConflictDoNothing();
    }
    await carryUsageOver(tx, user, after, now);
    if (plan !== "free") {
      await recordTrialHistory(tx, row.email, trialEndsAt === null ? "paid" : "trial", now);
    }
    return {
      outcome: "applied",
      userId: user.id,
      plan,
      trialing: plan !== "free" && trialEndsAt !== null,
      before,
      otherLiveSubscriptionId,
    };
  });
}

// Read under the row lock, so the parallel created and trialing events of one trial agree.
async function mayTrial(tx: Tx, userId: string, subscriptionId: string): Promise<boolean> {
  const [row] = await tx
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      billingSubscriptionId: users.billingSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return false;
  return row.billingSubscriptionId === subscriptionId || (await isTrialEligible(row, tx));
}

// Once per key: false when it was already claimed.
export async function claimBillingEvent(
  id: string,
  type: string,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  const claimed = await db
    .insert(billingEvents)
    .values({ id, type, receivedAt: now })
    .onConflictDoNothing()
    .returning({ id: billingEvents.id });
  return claimed.length > 0;
}

async function isReplaced(db: Db, subscriptionId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: trialReplacements.replacedSubscriptionId })
    .from(trialReplacements)
    .where(eq(trialReplacements.replacedSubscriptionId, subscriptionId))
    .limit(1);
  return row !== undefined;
}

export async function getBillingCustomerId(userId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ customerId: users.billingCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.customerId ?? null;
}

export type BillingRecord = Pick<
  UserRow,
  "plan" | "planStatus" | "billingCustomerId" | "billingSubscriptionId"
>;

export async function getBillingRecord(userId: string): Promise<BillingRecord | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      plan: users.plan,
      planStatus: users.planStatus,
      billingCustomerId: users.billingCustomerId,
      billingSubscriptionId: users.billingSubscriptionId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export function chargeableSubscriptionId(record: BillingRecord): string | null {
  const { billingSubscriptionId, planStatus } = record;
  if (!billingSubscriptionId) return null;
  return planStatus !== null && isEndedStatus(planStatus) ? null : billingSubscriptionId;
}

export async function markSubscriptionCancelled(
  userId: string,
  subscriptionId: string,
  now = Date.now(),
): Promise<void> {
  const db = await getDb();
  await db
    .update(users)
    .set({
      plan: "free",
      planInterval: null,
      planStatus: "canceled",
      planRenewsAt: null,
      trialEndsAt: null,
      planPeriodStartsAt: null,
      planPeriodEndsAt: null,
      updatedAt: now,
    })
    .where(and(eq(users.id, userId), eq(users.billingSubscriptionId, subscriptionId)));
}
