import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { billingEvents, users, type UserRow } from "@/db/schema";
// Same rule auth uses to store users.email; policy.ts keeps billing out of the sign-in module.
import { normalizeEmail } from "@/lib/auth/policy";
import { isUserId } from "@/lib/users";
import { recordTrialHistory } from "./trial";

// Server-only. Copies Creem's view of a subscription onto the user row, so every request reads the
// plan locally instead of asking Creem.

// https://docs.creem.io/features/subscriptions/introduction#subscription-status
// - trialing: in the trial, before the first regular payment. The plan, with the trial's allowance.
// - active: paid and renewing. past_due: a renewal failed and Creem is retrying it; access stays
//   until it gives up. scheduled_cancel: "still active until" the period ends, then canceled.
// - canceled: over. expired: the period ended without a payment (also forced by the
//   subscription.expired event, whose status field still shows the old value). paused and unpaid:
//   no access, as Creem's own access helpers revoke it.
// - incomplete: checkout isn't finished. It can only become active or canceled, so it changes nothing.
// "paid": the plan the subscription's product sells (Pro or Max).
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

/**
 * A subscription that can still charge: not ended, and past checkout. Paused and unpaid ones count,
 * since they charge again once resumed or once the card is fixed.
 */
export function isLiveStatus(status: string): boolean {
  return !isEndedStatus(status) && status !== "incomplete";
}

/**
 * What a Creem subscription status grants: its product's paid plan, Free, or null when the status
 * shouldn't change the plan.
 */
export function planForStatus(status: string): StatusGrant {
  return isKnownStatus(status) ? (PLAN_BY_STATUS[status] ?? null) : null;
}

export type SubscriptionState = {
  /** metadata.user_id from our checkout session, which Creem copies onto the subscription. */
  userId?: string;
  email?: string;
  customerId: string;
  subscriptionId: string;
  /** The plan the product sells; null for other products sold from the same Creem store. */
  productPlan: PaidPlanId | null;
  /** How often that product bills; null exactly when productPlan is. */
  productInterval: BillingInterval | null;
  /** Creem's subscription status, e.g. "active" or "trialing". */
  status: string;
  /** Next renewal (epoch ms), or null when the subscription won't renew. */
  renewsAt: number | null;
  /** When the current period ends (epoch ms); on a trial, when the trial ends. */
  periodEndsAt: number | null;
  /** When Creem created the event (epoch ms), to drop an older event that arrives late. */
  eventAt: number | null;
};

/** The webhook that reported the state. Its id is stored with the update, so a retry can't apply twice. */
export type WebhookSource = { eventId: string; eventType: string };

export type IgnoreReason = "unknown_status" | "no_change" | "no_user" | "other_product" | "superseded";

export type ApplyResult =
  | {
      outcome: "applied";
      userId: string;
      plan: PlanId;
      trialing: boolean;
      /** The plan and trial the row had before, so callers can react to a change. */
      before: { plan: PlanId; trialing: boolean };
    }
  | { outcome: "duplicate" }
  | { outcome: "ignored"; reason: IgnoreReason };

type UserLookup = Pick<SubscriptionState, "userId" | "email" | "customerId" | "subscriptionId">;

// Each identifier matches at most one row in practice; the cap only bounds a pathological case.
const LOOKUP_LIMIT = 10;

/**
 * Every way we might know the user, in one round trip. Postgres answers each OR branch from its
 * own index (id, email, both billing ids) with a bitmap OR, so this never scans the table. `email`
 * must be normalized.
 */
export function findUserQuery(db: Db, lookup: UserLookup) {
  return db
    .select({
      id: users.id,
      email: users.email,
      plan: users.plan,
      planInterval: users.planInterval,
      trialEndsAt: users.trialEndsAt,
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

// The trial lasts until the first regular payment: "active" ends it. A failed first payment
// (past_due) or a cancellation scheduled during the trial keeps its allowance, so neither turns a
// trial into a full month of Pro that nobody paid for.
function trialEndFor(state: SubscriptionState, user: FoundUser, plan: PlanId): number | null {
  if (plan === "free" || state.status === "active") return null;
  if (state.status === "trialing") {
    return state.periodEndsAt ?? state.renewsAt ?? user.trialEndsAt ?? null;
  }
  return user.billingSubscriptionId === state.subscriptionId ? user.trialEndsAt : null;
}

/**
 * Finds the user (metadata user_id, then subscription id, then customer id, then email) and stores
 * the plan, billing interval, trial, status, ids and renewal date from Creem, at most once per
 * event id, and never from an event older than the last one applied for the same subscription.
 */
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
  // An unlisted product on the user's own subscription keeps the interval it had, like the plan.
  const planInterval: BillingInterval | null =
    plan === "free" ? null : (state.productInterval ?? user.planInterval);
  const trialEndsAt = trialEndFor(state, user, plan);
  const before = { plan: user.plan, trialing: user.plan !== "free" && user.trialEndsAt !== null };

  // One transaction, event id first: a redelivery of an event that already committed finds its id
  // and changes nothing, a parallel one waits on the unique key and then does the same, and a
  // failure rolls both writes back so Creem's retry applies it.
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
        planRenewsAt: plan === "free" ? null : state.renewsAt,
        trialEndsAt,
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

/**
 * The stored subscription Creem could still charge, or null. Paused and unpaid subscriptions count:
 * they start charging again once resumed or once the card is fixed. An unknown status counts too.
 */
export function chargeableSubscriptionId(record: BillingRecord): string | null {
  const { billingSubscriptionId, planStatus } = record;
  if (!billingSubscriptionId) return null;
  return planStatus !== null && isEndedStatus(planStatus) ? null : billingSubscriptionId;
}

/**
 * Records a cancellation we made ourselves, without waiting for the webhook. Only touches the row
 * while it still tracks that subscription, so a newer one stored meanwhile is left alone.
 */
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
      updatedAt: now,
    })
    .where(and(eq(users.id, userId), eq(users.billingSubscriptionId, subscriptionId)));
}
