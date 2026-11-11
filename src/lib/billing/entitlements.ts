import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { billingEvents, trialReplacements, users, type UserRow } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/policy";
import { carryUsageOver, type PeriodAccount } from "@/lib/usage";
import { isUserId } from "@/lib/users";
import { recordTrialHistory } from "./trial";

// Copies Creem's view of a subscription onto the user row, so requests read the plan locally.

// https://docs.creem.io/features/subscriptions/introduction#subscription-status trialing: the plan
// with the trial's allowance. active, past_due (Creem retrying a renewal) and scheduled_cancel:
// paid until the period ends. canceled, expired (also forced by subscription.expired, whose status
// still shows the old value), paused, unpaid: no access. incomplete: changes nothing.
type StatusGrant = "paid" | "free" | null;

const PLAN_BY_STATUS: Record<string, StatusGrant> = {
  trialing: "paid",
  active: "paid",
  past_due: "paid",
  scheduled_cancel: "paid",
  canceled: "free",
  expired: "free",
  paused: "free",
  unpaid: "free",
  incomplete: null,
};

function isKnownStatus(status: string): boolean {
  return Object.hasOwn(PLAN_BY_STATUS, status);
}

// Final states: Creem never charges these again, so there is nothing left to cancel.
const ENDED_STATUSES: ReadonlySet<string> = new Set(["canceled", "expired"]);

export function isEndedStatus(status: string): boolean {
  return ENDED_STATUSES.has(status);
}

// Paused and unpaid count: they charge again once resumed or once the card is fixed.
export function isLiveStatus(status: string): boolean {
  return !isEndedStatus(status) && status !== "incomplete";
}

// null when the status shouldn't change the plan.
export function planForStatus(status: string): StatusGrant {
  return isKnownStatus(status) ? (PLAN_BY_STATUS[status] ?? null) : null;
}

export type SubscriptionState = {
  /** metadata.user_id from our checkout session, which Creem copies onto the subscription. */
  userId?: string;
  email?: string;
  customerId: string;
  subscriptionId: string;
  /** null for other products sold from the same Creem store. */
  productPlan: PaidPlanId | null;
  productInterval: BillingInterval | null;
  status: string;
  renewsAt: number | null;
  /** On a trial, when the trial started. */
  periodStartsAt: number | null;
  /** On a trial, when the trial ends. */
  periodEndsAt: number | null;
  /** To drop an older event that arrives late. */
  eventAt: number | null;
  /** Once this one is active, the trial it replaces is written down to be cancelled. */
  replacesSubscriptionId?: string | null;
};

/** Its id is stored with the update, so a retry can't apply twice. */
export type WebhookSource = { eventId: string; eventType: string };

export type IgnoreReason =
  | "unknown_status"
  | "no_change"
  | "no_user"
  | "other_product"
  | "superseded"
  // A trial another plan replaced: it's being cancelled, and nothing it says changes the plan.
  | "replaced";

export type ApplyResult =
  | {
      outcome: "applied";
      userId: string;
      plan: PlanId;
      trialing: boolean;
      before: { plan: PlanId; trialing: boolean };
    }
  | { outcome: "duplicate" }
  | { outcome: "ignored"; reason: IgnoreReason };

type UserLookup = Pick<SubscriptionState, "userId" | "email" | "customerId" | "subscriptionId">;

// Each identifier matches at most one row in practice; the cap only bounds a pathological case.
const LOOKUP_LIMIT = 10;

// One round trip: Postgres answers each OR branch from its own index, so this never scans the
// table. `email` must be normalized.
export function findUserQuery(db: Db, lookup: UserLookup) {
  return db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      planInterval: users.planInterval,
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
        // Metadata is free text to Creem; a value that isn't a uuid can't be one of our ids.
        lookup.userId && isUserId(lookup.userId) ? eq(users.id, lookup.userId) : undefined,
        eq(users.billingSubscriptionId, lookup.subscriptionId),
        eq(users.billingCustomerId, lookup.customerId),
        lookup.email ? eq(users.email, lookup.email) : undefined,
      ),
    )
    .limit(LOOKUP_LIMIT);
}

async function findUser(db: Db, state: SubscriptionState) {
  const email = state.email ? normalizeEmail(state.email) : undefined;
  const lookup = { ...state, email };
  const rows = await findUserQuery(db, lookup);
  // Most specific wins: our own id, then the subscription, then the customer, then the email.
  return (
    rows.find((row) => state.userId !== undefined && row.id === state.userId) ??
    rows.find((row) => row.billingSubscriptionId === state.subscriptionId) ??
    rows.find((row) => row.billingCustomerId === state.customerId) ??
    rows.find((row) => email !== undefined && row.email === email) ??
    null
  );
}

type FoundUser = NonNullable<Awaited<ReturnType<typeof findUser>>>;

// "active" ends the trial. A failed first payment or a cancellation scheduled during the trial
// keeps its allowance, so neither turns a trial into an unpaid month of Pro.
function trialEndFor(state: SubscriptionState, user: FoundUser, plan: PlanId): number | null {
  if (plan === "free" || state.status === "active") return null;
  if (state.status === "trialing") {
    return state.periodEndsAt ?? state.renewsAt ?? user.trialEndsAt ?? null;
  }
  return user.billingSubscriptionId === state.subscriptionId ? user.trialEndsAt : null;
}

// Stores the plan at most once per event id, and never from an event older than the last one
// applied for the subscription. An active subscription replacing a trial writes the trial down to
// be cancelled in the same transaction; events from a replaced trial are ignored.
export async function applySubscriptionState(
  state: SubscriptionState,
  source: WebhookSource,
  now = Date.now(),
): Promise<ApplyResult> {
  const grant = planForStatus(state.status);
  if (grant === null) {
    return { outcome: "ignored", reason: isKnownStatus(state.status) ? "no_change" : "unknown_status" };
  }

  const db = await getDb();
  // A late "trialing" or a first payment on the replaced trial would otherwise overwrite the plan
  // that replaced it.
  if (await isReplaced(db, state.subscriptionId)) return { outcome: "ignored", reason: "replaced" };
  const user = await findUser(db, state);
  if (!user) return { outcome: "ignored", reason: "no_user" };
  // Other products on the same Creem store must not grant a plan. The user's own subscription
  // still counts after a plan change moves it to a product we don't list, as the plan it had.
  const own = user.billingSubscriptionId === state.subscriptionId;
  if (state.productPlan === null && !own) {
    return { outcome: "ignored", reason: "other_product" };
  }
  const plan: PlanId =
    grant === "free" ? "free" : (state.productPlan ?? (user.plan === "free" ? "pro" : user.plan));
  const planInterval: BillingInterval | null =
    plan === "free" ? null : (state.productInterval ?? user.planInterval);
  const trialEndsAt = trialEndFor(state, user, plan);
  const before = { plan: user.plan, trialing: user.plan !== "free" && user.trialEndsAt !== null };
  // An event without dates keeps the ones stored for the same subscription.
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

  // Event id first: a redelivery finds its id and changes nothing, a parallel one waits on the
  // unique key, and a failure rolls both writes back so Creem's retry applies it.
  return db.transaction(async (tx): Promise<ApplyResult> => {
    const recorded = await tx
      .insert(billingEvents)
      .values({ id: source.eventId, type: source.eventType, receivedAt: now })
      .onConflictDoNothing()
      .returning({ id: billingEvents.id });
    if (recorded.length === 0) return { outcome: "duplicate" };
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
          // Only the subscription we already track can take a paid plan away, so a failed second
          // checkout or a late event for an old subscription can't downgrade someone who is paying.
          plan === "free"
            ? or(eq(users.plan, "free"), eq(users.billingSubscriptionId, state.subscriptionId))
            : undefined,
          // A retry of an older event for the same subscription (Creem retries for up to a day)
          // can't undo a newer one, e.g. a late "trialing" after the first payment made it active.
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
    const replaces =
      state.status === "active" && plan !== "free" ? state.replacesSubscriptionId : null;
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
      await recordTrialHistory(tx, row.email, state.status === "trialing" ? "trial" : "paid", now);
    }
    return {
      outcome: "applied",
      userId: user.id,
      plan,
      trialing: plan !== "free" && trialEndsAt !== null,
      before,
    };
  });
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

// Paused, unpaid and unknown statuses count: they can start charging again.
export function chargeableSubscriptionId(record: BillingRecord): string | null {
  const { billingSubscriptionId, planStatus } = record;
  if (!billingSubscriptionId) return null;
  return planStatus !== null && isEndedStatus(planStatus) ? null : billingSubscriptionId;
}

// Records our own cancel without waiting for the webhook, only while the row still tracks that
// subscription.
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
