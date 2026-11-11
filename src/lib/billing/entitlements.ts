import { and, eq, isNull, lte, ne, or } from "drizzle-orm";
import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import { getDb, type Db } from "@/db/client";
import { billingEvents, trialReplacements, users, type UserRow } from "@/db/schema";
import { normalizeEmail } from "@/lib/auth/policy";
import { carryUsageOver, type PeriodAccount } from "@/lib/usage";
import { isUserId } from "@/lib/users";
import { recordTrialHistory } from "./trial";

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

const ENDED_STATUSES: ReadonlySet<string> = new Set(["canceled", "expired"]);

export function isEndedStatus(status: string): boolean {
  return ENDED_STATUSES.has(status);
}

export function isLiveStatus(status: string): boolean {
  return !isEndedStatus(status) && status !== "incomplete";
}

export function planForStatus(status: string): StatusGrant {
  return isKnownStatus(status) ? (PLAN_BY_STATUS[status] ?? null) : null;
}

export type SubscriptionState = {
  userId?: string;
  email?: string;
  customerId: string;
  subscriptionId: string;
  productPlan: PaidPlanId | null;
  productInterval: BillingInterval | null;
  status: string;
  renewsAt: number | null;
  periodStartsAt: number | null;
  periodEndsAt: number | null;
  eventAt: number | null;
  replacesSubscriptionId?: string | null;
};

export type WebhookSource = { eventId: string; eventType: string };

export type IgnoreReason =
  | "unknown_status"
  | "no_change"
  | "no_user"
  | "other_product"
  | "superseded"
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

const LOOKUP_LIMIT = 10;

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
  return (
    rows.find((row) => state.userId !== undefined && row.id === state.userId) ??
    rows.find((row) => row.billingSubscriptionId === state.subscriptionId) ??
    rows.find((row) => row.billingCustomerId === state.customerId) ??
    rows.find((row) => email !== undefined && row.email === email) ??
    null
  );
}

type FoundUser = NonNullable<Awaited<ReturnType<typeof findUser>>>;

function trialEndFor(state: SubscriptionState, user: FoundUser, plan: PlanId): number | null {
  if (plan === "free" || state.status === "active") return null;
  if (state.status === "trialing") {
    return state.periodEndsAt ?? state.renewsAt ?? user.trialEndsAt ?? null;
  }
  return user.billingSubscriptionId === state.subscriptionId ? user.trialEndsAt : null;
}

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
  // A late "trialing" or first payment on the replaced trial would otherwise overwrite its plan.
  if (await isReplaced(db, state.subscriptionId)) return { outcome: "ignored", reason: "replaced" };
  const user = await findUser(db, state);
  if (!user) return { outcome: "ignored", reason: "no_user" };
  // Other products on the same Creem store must not grant a plan.
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
          // Creem retries for up to a day, so an older event must not undo a newer one.
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
