import { z } from "zod";
import {
  isPaidPlan,
  PRICES_USD,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import type {
  BillingKind,
  ChargeType,
  ServerEvent,
  ServerEventProps,
  SubscriptionEndStatus,
} from "@/lib/analytics/events";
import { ANONYMOUS_ID, captureServerEvent } from "@/lib/analytics/server";
import type { DodoDispute, DodoPayment, DodoRefund } from "./dodo-events";
import type { DodoSubscription } from "./dodo-status";
import { planForStatus, type ApplyResult, type SubscriptionState } from "./entitlements";
import type { ChangeCharge, PlanChange } from "./plan-change-charge";

// PostHog gets plans, amounts and statuses under our user id: never Dodo ids, emails, names or card details.

const Minor = z.number().int().nonnegative().nullish().catch(null);
const Text = z.string().max(64).nullish().catch(null);

const NO_FIELDS = {
  total_amount: null,
  tax: null,
  recurring_pre_tax_amount: null,
  currency: null,
  retry_attempt: null,
  error_code: null,
  customer: null,
};

// Read leniently: an odd amount falls back to the price and never fails the webhook.
const ChargeFields = z
  .object({
    total_amount: Minor,
    tax: Minor,
    recurring_pre_tax_amount: Minor,
    currency: Text,
    retry_attempt: Minor,
    error_code: Text,
    customer: z
      .object({ customer_id: z.string().min(1).max(200) })
      .nullish()
      .catch(null),
  })
  .catch(NO_FIELDS);

const CHARGE_TYPES: readonly ChargeType[] = ["new", "renewal", "plan_change", "on_demand"];
// A code, never Dodo's free-text message.
const REASON = /^[A-Za-z0-9_.:-]{1,64}$/;

const END_STATUS: Readonly<Record<string, SubscriptionEndStatus>> = {
  cancelled: "cancelled",
  canceled: "cancelled",
  expired: "expired",
  on_hold: "on_hold",
  paused: "paused",
};

function usd(minor: number | string | null | undefined, currency: string | null | undefined) {
  const amount = minor == null ? Number.NaN : Number(minor);
  if (!Number.isFinite(amount) || amount < 0 || currency?.toUpperCase() !== "USD") return undefined;
  return amount / 100;
}

export function customerIdOf(data: unknown): string | null {
  return ChargeFields.parse(data).customer?.customer_id ?? null;
}

// A payment's cents before tax, when it was charged in dollars.
export function preTaxCents(data: unknown): number | null {
  const fields = ChargeFields.parse(data);
  if (fields.total_amount == null) return null;
  const cents = fields.total_amount - (fields.tax ?? 0);
  return usd(cents, fields.currency) === undefined ? null : cents;
}

function withUsd(change: PlanChange, cents: number | null) {
  return cents === null ? change : { ...change, usd: cents / 100 };
}

export function trackCheckout(
  userId: string,
  choice: { plan: PaidPlanId; interval: BillingInterval; trial: boolean },
  data: unknown,
): void {
  const { plan, interval, trial } = choice;
  const cents = preTaxCents(data);
  const paid =
    cents === null ? (trial ? PRO_TRIAL.priceUsd : PRICES_USD[plan][interval]) : cents / 100;
  captureServerEvent(userId, "checkout_completed", { plan, trial, usd: paid }, { set: { plan } });
}

function renewalOf(
  data: unknown,
  state: SubscriptionState,
  result: ApplyResult,
): ServerEventProps["subscription_renewed"] | null {
  if (planForStatus(state.status) !== "paid" || state.status === "trialing") return null;
  const applied = result.outcome === "applied" ? result : null;
  const plan = state.pricePlan ?? (applied && isPaidPlan(applied.plan) ? applied.plan : null);
  const interval = state.priceInterval ?? applied?.interval ?? null;
  if (!plan || !interval) return null;
  const fields = ChargeFields.parse(data);
  const charged = usd(fields.recurring_pre_tax_amount, fields.currency);
  return { plan, interval, usd: charged ?? PRICES_USD[plan][interval] };
}

type AppliedChange = { userId: string; change: PlanChange; charges: boolean };

// Our own changes are charged: a trial ends paid in full, an upgrade pays the prorated difference.
export function planChangeOf(result: ApplyResult): AppliedChange | null {
  if (result.outcome !== "applied") return null;
  const { userId, plan, interval, before } = result;
  if (before.status === null || before.plan === plan || !interval) return null;
  if (!isPaidPlan(before.plan) || !isPaidPlan(plan)) return null;
  return {
    userId,
    change: { from_plan: before.plan, to_plan: plan, interval },
    charges: before.trialing || PRICES_USD[plan].month > PRICES_USD[before.plan].month,
  };
}

export function trackChargedChange(userId: string, change: PlanChange, cents: number | null) {
  captureServerEvent(userId, "subscription_plan_changed", withUsd(change, cents), {
    set: { plan: change.to_plan },
  });
}

// Changes are read from the plan and status before and after, so out-of-order events still count once.
export function trackSubscription(
  type: string,
  subscription: DodoSubscription,
  data: unknown,
  state: SubscriptionState,
  result: ApplyResult,
  charge: ChangeCharge,
): void {
  const renewal = type === "subscription.renewed" ? renewalOf(data, state, result) : null;
  if (result.outcome !== "applied") {
    // A renewal is money taken even when a newer event already set the plan.
    if (renewal && result.outcome === "ignored" && result.userId) {
      captureServerEvent(result.userId, "subscription_renewed", renewal);
    }
    return;
  }
  const { userId, plan, before } = result;
  const sent: ServerEvent[] = [];
  const send = <E extends ServerEvent>(event: E, props: ServerEventProps[E]) => {
    captureServerEvent(userId, event, props, { set: { plan } });
    sent.push(event);
  };
  if (renewal) send("subscription_renewed", renewal);
  const changed = planChangeOf(result);
  // A change waiting on its charge is sent when the payment comes.
  if (changed && charge.outcome !== "waiting") {
    const cents = charge.outcome === "charged" ? charge.cents : null;
    send("subscription_plan_changed", withUsd(changed.change, cents));
  }
  if (
    isPaidPlan(plan) &&
    state.status === "scheduled_cancel" &&
    before.status !== "scheduled_cancel"
  ) {
    send("subscription_cancelled", { plan, at_period_end: true, trial: result.trialing });
  }
  const ended = END_STATUS[subscription.status];
  if (ended && isPaidPlan(before.plan) && plan === "free") {
    const trial = before.trialing;
    if (ended === "cancelled" && before.status !== "scheduled_cancel") {
      send("subscription_cancelled", { plan: before.plan, at_period_end: false, trial });
    }
    send("subscription_ended", { plan: before.plan, status: ended, trial });
  }
  if (sent.length === 0 && plan !== before.plan) {
    captureServerEvent(userId, "$set", {}, { set: { plan } });
  }
}

export function trackPaymentFailure(
  userId: string,
  kind: BillingKind,
  plan: PaidPlanId | null,
  payment: DodoPayment,
  data: unknown,
): void {
  const fields = ChargeFields.parse(data);
  const code = fields.error_code;
  captureServerEvent(userId, "payment_failed", {
    kind,
    plan: plan ?? undefined,
    charge: CHARGE_TYPES.find((type) => type === payment.charge_type),
    reason: code && REASON.test(code) ? code : undefined,
    attempt: fields.retry_attempt ?? undefined,
  });
}

// Without a known account the event still counts, under the anonymous id with no person profile.
export function trackRefund(userId: string | null, kind: BillingKind, refund: DodoRefund): void {
  captureServerEvent(userId ?? ANONYMOUS_ID, "refund_issued", {
    kind,
    partial: refund.is_partial,
    usd: usd(refund.amount, refund.currency),
  });
}

export function trackDispute(
  event: "dispute_opened" | "dispute_lost",
  userId: string | null,
  kind: BillingKind,
  dispute: DodoDispute,
): void {
  const distinctId = userId ?? ANONYMOUS_ID;
  if (event === "dispute_opened") {
    captureServerEvent(distinctId, event, { kind });
    return;
  }
  captureServerEvent(distinctId, event, { kind, usd: usd(dispute.amount, dispute.currency) });
}
