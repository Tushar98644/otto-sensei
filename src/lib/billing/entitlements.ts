import type { DodoPayments } from "dodopayments";
import { and, eq, or } from "drizzle-orm";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { billingEvents, users, type UserRow } from "@/db/schema";
// Same rule auth uses to store users.email; policy.ts keeps billing out of the sign-in module.
import { normalizeEmail } from "@/lib/auth/policy";
import { isUserId } from "@/lib/users";

// Server-only. Copies Dodo's view of a subscription onto the user row, so every request reads the
// plan locally instead of asking Dodo.

// https://docs.dodopayments.com/features/subscription#subscription-states
// - active: paid and renewing.
// - past_due: a renewal failed, but during the grace period "the customer keeps full access".
// - on_hold and paused: "access revoked". cancelled and expired: the subscription is over.
// - failed: creation failed, and Dodo says never grant entitlements for it
//   (https://docs.dodopayments.com/developer-resources/subscription-integration-guide).
// - pending: checkout isn't finished. It can only become active or failed, so it changes nothing.
// "paid": the plan the subscription's product sells (Pro or Max).
type StatusGrant = "paid" | "free" | null;

const PLAN_BY_STATUS: Record<DodoPayments.SubscriptionStatus, StatusGrant> = {
  active: "paid",
  past_due: "paid",
  on_hold: "free",
  paused: "free",
  cancelled: "free",
  expired: "free",
  failed: "free",
  pending: null,
};

function isKnownStatus(status: string): status is DodoPayments.SubscriptionStatus {
  return Object.hasOwn(PLAN_BY_STATUS, status);
}

// Final states: Dodo never charges these again, so there is nothing left to cancel.
const ENDED_STATUSES: ReadonlySet<string> = new Set<string>([
  "cancelled",
  "expired",
  "failed",
] satisfies DodoPayments.SubscriptionStatus[]);

export function isEndedStatus(status: string): boolean {
  return ENDED_STATUSES.has(status);
}

/**
 * A subscription that can still charge: not ended, and past checkout. Pending ones (a checkout left
 * open) can't charge until finished and may be impossible to cancel, so they don't count.
 */
export function isLiveStatus(status: string): boolean {
  return !isEndedStatus(status) && status !== "pending";
}

/**
 * What a Dodo subscription status grants: its product's paid plan, Free, or null when the status
 * shouldn't change the plan.
 */
export function planForStatus(status: string): StatusGrant {
  return isKnownStatus(status) ? PLAN_BY_STATUS[status] : null;
}

export type SubscriptionState = {
  /** metadata.user_id from our checkout session, when Dodo carries it onto the subscription. */
  userId?: string;
  email?: string;
  customerId: string;
  subscriptionId: string;
  /** The plan the product sells; null for other products sold from the same Dodo account. */
  productPlan: PaidPlanId | null;
  /** How often that product bills; null exactly when productPlan is. */
  productInterval: BillingInterval | null;
  /** Dodo's subscription status, e.g. "active" or "on_hold". */
  status: string;
  /** Next renewal (epoch ms), or null when the subscription won't renew. */
  renewsAt: number | null;
};

/** The webhook that reported the state. Its id is stored with the update, so a retry can't apply twice. */
export type WebhookSource = { eventId: string; eventType: string };

export type IgnoreReason = "unknown_status" | "no_change" | "no_user" | "other_product" | "superseded";

export type ApplyResult =
  | { outcome: "applied"; userId: string; plan: PlanId }
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
      billingCustomerId: users.billingCustomerId,
      billingSubscriptionId: users.billingSubscriptionId,
    })
    .from(users)
    .where(
      or(
        // Metadata is free text to Dodo; a value that isn't a uuid can't be one of our ids.
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

/**
 * Finds the user (metadata user_id, then subscription id, then customer id, then email) and stores
 * the plan, billing interval, status, ids and renewal date from Dodo, at most once per webhook id.
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
  // Other products on the same Dodo account must not grant a plan. The user's own subscription
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

  // One transaction, event id first: a redelivery of an event that already committed finds its id
  // and changes nothing, a parallel one waits on the unique key and then does the same, and a
  // failure rolls both writes back so Dodo's retry applies it.
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
        billingCustomerId: state.customerId,
        billingSubscriptionId: state.subscriptionId,
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
        ),
      )
      .returning({ id: users.id });
    if (updated.length === 0) return { outcome: "ignored", reason: "superseded" };
    return { outcome: "applied", userId: user.id, plan };
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
 * The stored subscription Dodo could still charge, or null. Paused and on-hold subscriptions count:
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
    .set({ plan: "free", planInterval: null, planStatus: "cancelled", planRenewsAt: null, updatedAt: now })
    .where(and(eq(users.id, userId), eq(users.billingSubscriptionId, subscriptionId)));
}
