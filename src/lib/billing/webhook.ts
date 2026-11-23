import type { z } from "zod";
import {
  BILLING_INTERVALS,
  isPaidPlan,
  PAID_PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import type { BillingKind } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";
import { isProduction } from "@/lib/env";
import { log } from "@/lib/log";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioSlugsOf } from "@/lib/portfolio/records";
import { isUserId } from "@/lib/users";
import {
  cartProducts,
  DodoDisputeSchema,
  DodoPaymentSchema,
  DodoRefundSchema,
  metadataIds,
  readEnvelope,
  toState,
  TopupPaymentSchema,
  verifyWebhook,
  webhookKey,
  type DodoEvent,
  type DodoPayment,
} from "./dodo-events";
import { DodoSubscriptionSchema, inTrialWindow, type DodoSubscription } from "./dodo-status";
import {
  applySubscriptionState,
  claimBillingEvent,
  findBillingUser,
  findBillingUserId,
  isLiveStatus,
  planForStatus,
  type ApplyResult,
} from "./entitlements";
import { verifyBillingId } from "./billing-sign";
import {
  chargedRef,
  creditTopup,
  findTopupCheckout,
  MAX_BALANCE_CENTS,
  takeBackTopup,
  topupBuyer,
  type TakeBack,
} from "./credit";
import { TOPUP_METADATA_KEY } from "./credit-types";
import {
  changeForCharge,
  chargeForChange,
  UNCHARGED,
  type ChangeCharge,
} from "./plan-change-charge";
import {
  isOrphan,
  isRefusedTrial,
  refundRefusedTrial,
  settleOrphan,
  settleReplacement,
  type OrphanOutcome,
} from "./replacements";
import {
  customerIdOf,
  planChangeOf,
  preTaxCents,
  trackChargedChange,
  trackCheckout,
  trackDispute,
  trackPaymentFailure,
  trackRefund,
  trackSubscription,
} from "./webhook-analytics";

// Dodo redelivers any non-2xx for about 27 hours, so only retryable failures get a 5xx.

export type WebhookResult = { status: number; message: string };

type ProductPlan = { plan: PaidPlanId; interval: BillingInterval };

export type WebhookConfig = {
  secret: string | undefined;
  signingSecret: string | undefined;
  productIds: readonly string[];
  planForProduct: (productId: string) => ProductPlan | null | undefined;
  trialProductId?: string | null;
  topupProductId?: string | null;
  // Asks Dodo whether a payment we hold no credit for is a top-up, so its refund waits for the credit.
  isTopupPayment?: (paymentId: string) => Promise<boolean>;
  customerEmail?: (customerId: string) => Promise<string | null>;
};

type ReadyConfig = WebhookConfig & { secret: string; signingSecret: string };

const MAX_BODY_CHARS = 256 * 1024;
// A subscription still being set up, or one whose first charge failed: neither changes a plan.
const QUIET_STATUSES: ReadonlySet<string> = new Set(["dodo:pending", "dodo:failed"]);

type Context = { eventId: string; eventType: string };

export async function processWebhook(
  rawBody: string,
  headers: Headers,
  config: WebhookConfig,
  now = Date.now(),
): Promise<WebhookResult> {
  const { secret, signingSecret } = config;
  // A secret that can't be a key would refuse every delivery as unsigned, so it counts as unset.
  const key = secret ? webhookKey(secret) : null;
  if (!secret || !key || !signingSecret) {
    log.warn("billing.webhook_not_configured", {
      secret: key !== null,
      signingSecret: Boolean(signingSecret),
    });
    return { status: 503, message: "not_configured" };
  }
  if (rawBody.length > MAX_BODY_CHARS) {
    log.warn("billing.webhook_too_large", { chars: rawBody.length });
    return { status: 413, message: "too_large" };
  }
  const verified = verifyWebhook(rawBody, headers, secret, now);
  if (verified.check !== "valid") {
    log.warn("billing.webhook_invalid", { reason: verified.check });
    return { status: 401, message: "invalid_signature" };
  }
  // webhook-id is signed and stays the same across Dodo's retries.
  const envelope = readEnvelope(rawBody);
  if (!envelope.ok) {
    log.error("billing.webhook_malformed", `unreadable ${envelope.problem}`, {
      eventId: verified.eventId,
    });
    return { status: 500, message: "malformed" };
  }
  const { event } = envelope;
  const context: Context = { eventId: verified.eventId, eventType: event.type };
  const ready: ReadyConfig = { ...config, secret, signingSecret };
  switch (event.kind) {
    case "subscription":
      return recordSubscription(event, context, ready, now);
    case "payment_succeeded":
      return recordPayment(event.data, context, ready, now);
    case "payment_failed":
      return recordPaymentFailure(event.data, context, ready, now);
    case "refund":
    case "dispute":
      return recordAdjustment(event, context, ready, now);
    default:
      log.info("billing.webhook_ignored", { ...context, reason: "event_type" });
      return { status: 200, message: "ignored" };
  }
}

// Every subscription.* event carries the subscription's current state, so its status decides.
async function recordSubscription(
  event: DodoEvent,
  context: Context,
  config: ReadyConfig,
  now: number,
): Promise<WebhookResult> {
  const parsed = DodoSubscriptionSchema.safeParse(event.data);
  if (!parsed.success) return malformed(parsed.error, context);
  const subscription = parsed.data;
  const ids = metadataIds(subscription.metadata, config.signingSecret, {
    ...context,
    subscriptionId: subscription.subscription_id,
  });
  const state = toState(subscription, event.eventAt, config, ids);
  let result: ApplyResult;
  try {
    result = await applySubscriptionState(state, context, now, {
      resolveEmail: config.customerEmail,
    });
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  if (result.outcome === "rejected") {
    log.warn("billing.trial_reused", {
      ...context,
      userId: result.userId,
      subscriptionId: state.subscriptionId,
    });
    await cancelReusedTrial(state.subscriptionId, context, now);
    return { status: 200, message: "ignored" };
  }
  // Accounts exist before any checkout, so in production a verified id with no row was deleted.
  const orphanOf =
    isProduction() &&
    result.outcome === "ignored" &&
    result.reason === "no_user" &&
    ids.userId !== undefined &&
    isUserId(ids.userId) &&
    planForStatus(state.status) !== null &&
    isLiveStatus(state.status)
      ? ids.userId
      : null;
  if (orphanOf) return cancelOrphan(state.subscriptionId, orphanOf, context, now);
  await report(result, { ...context, status: state.status, subscriptionId: state.subscriptionId });
  const charge = await changeCharge(result, state.subscriptionId, context, now);
  trackSubscription(event.type, subscription, event.data, state, result, charge);
  if (result.outcome === "applied") {
    warnIfTrialMissed(subscription, event.eventAt ?? now, config, context);
  }
  const replaced = state.replacesSubscriptionId;
  if (replaced) {
    let settled: boolean;
    try {
      settled = await settleReplacement(replaced, now);
    } catch (error) {
      log.error("billing.replace_cancel_failed", error, { ...context, subscriptionId: replaced });
      settled = false;
    }
    if (!settled) return { status: 500, message: "retry" };
  }
  return result.outcome === "applied"
    ? { status: 200, message: "applied" }
    : { status: 200, message: result.outcome === "duplicate" ? "duplicate" : "ignored" };
}

// The event is claimed by now, so a failure here costs only the change's dollars in PostHog.
async function changeCharge(
  result: ApplyResult,
  subscriptionId: string,
  context: Context,
  now: number,
): Promise<ChangeCharge> {
  const applied = planChangeOf(result);
  if (!applied) return UNCHARGED;
  try {
    return await chargeForChange({ ...applied, subscriptionId }, now);
  } catch (error) {
    log.warn("billing.plan_change_charge_failed", { ...context, userId: applied.userId }, error);
    return UNCHARGED;
  }
}

// Dodo has no trial status: a trial-product subscription not seen as one in its first days needs a look.
function warnIfTrialMissed(
  subscription: DodoSubscription,
  at: number,
  config: ReadyConfig,
  context: Context,
): void {
  if (!config.trialProductId || subscription.product_id !== config.trialProductId) return;
  if (subscription.status !== "active" && subscription.status !== "past_due") return;
  if (inTrialWindow(subscription)) return;
  const created = subscription.created_at ? Date.parse(subscription.created_at) : NaN;
  if (!Number.isFinite(created) || at - created >= PRO_TRIAL.days * DAY_MS - HOUR_MS) return;
  log.warn("billing.trial_not_detected", {
    ...context,
    subscriptionId: subscription.subscription_id,
    status: subscription.status,
    trialDays: subscription.trial_period_days ?? null,
  });
}

type CheckoutChoice = { plan: PaidPlanId; interval: BillingInterval; trial: boolean };

// Subscription payments carry no product, so the plan comes from the metadata our checkout set.
function checkoutChoice(metadata: DodoPayment["metadata"]): CheckoutChoice | null {
  const plan = PAID_PLANS.find((candidate) => candidate === metadata?.plan);
  const interval = BILLING_INTERVALS.find((candidate) => candidate === metadata?.interval);
  if (!plan || !interval) return null;
  return { plan, interval, trial: metadata?.trial === true || metadata?.trial === "true" };
}

async function recordPayment(
  object: unknown,
  context: Context,
  config: ReadyConfig,
  now: number,
): Promise<WebhookResult> {
  const parsed = DodoPaymentSchema.safeParse(object);
  if (!parsed.success) return malformed(parsed.error, context);
  const payment = parsed.data;
  const ignore = (reason: string): WebhookResult => {
    log.info("billing.webhook_ignored", { ...context, reason });
    return { status: 200, message: "ignored" };
  };
  const subscriptionId = payment.subscription_id;
  if (!subscriptionId) {
    if (isTopup(object, payment, config)) return recordTopup(object, context, config, now);
    return ignore("no_subscription");
  }
  // A charge can succeed after a refused trial or a deleted account's subscription was cancelled.
  try {
    const refusedUser = await isRefusedTrial(subscriptionId);
    if (refusedUser) {
      await refundRefusedTrial(subscriptionId, refusedUser, [payment.payment_id], now);
      return ignore("refused_trial");
    }
    if (await isOrphan(subscriptionId)) {
      await refundRefusedTrial(subscriptionId, null, [payment.payment_id], now);
      return ignore("orphan_subscription");
    }
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  if (payment.charge_type === "plan_change") {
    return recordChangeCharge(object, payment, subscriptionId, context, config, now);
  }
  // A subscription's first payment is its checkout; renewals have their own subscription event.
  if (payment.charge_type !== "new") return ignore("not_checkout");
  const choice = checkoutChoice(payment.metadata);
  if (!choice) return ignore("other_product");
  const ids = metadataIds(payment.metadata, config.signingSecret, {
    ...context,
    paymentId: payment.payment_id,
  });
  try {
    const userId = await findBillingUserId({
      userId: ids.userId,
      customerId: payment.customer.customer_id,
      subscriptionId,
    });
    if (!userId) return ignore("no_user");
    // Keyed by subscription, so a replay with a new webhook-id still counts once.
    if (!(await claimBillingEvent(`checkout:${subscriptionId}`, context.eventType, now))) {
      log.info("billing.webhook_duplicate", context);
      return { status: 200, message: "duplicate" };
    }
    trackCheckout(userId, choice, object);
    log.info("billing.checkout_completed", { ...context, userId, ...choice });
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  return { status: 200, message: "applied" };
}

// Counted once per payment, and sent with the plan change it paid for.
async function recordChangeCharge(
  object: unknown,
  payment: DodoPayment,
  subscriptionId: string,
  context: Context,
  config: ReadyConfig,
  now: number,
): Promise<WebhookResult> {
  const paymentId = payment.payment_id;
  const ids = metadataIds(payment.metadata, config.signingSecret, { ...context, paymentId });
  const cents = preTaxCents(object);
  const noUser = (): WebhookResult => {
    log.info("billing.webhook_ignored", { ...context, reason: "no_user" });
    return { status: 200, message: "ignored" };
  };
  try {
    const userId = await findBillingUserId({
      userId: ids.userId,
      customerId: payment.customer.customer_id,
      subscriptionId,
    });
    if (!userId) return noUser();
    const match = await changeForCharge({ userId, subscriptionId, paymentId, cents }, now);
    if (match.outcome === "no_user") return noUser();
    if (match.outcome === "duplicate") {
      log.info("billing.webhook_duplicate", context);
      return { status: 200, message: "duplicate" };
    }
    if (match.outcome === "matched") trackChargedChange(userId, match.change, cents);
    log.info("billing.plan_change_charged", {
      ...context,
      paymentId,
      userId,
      cents,
      matched: match.outcome === "matched",
    });
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  return { status: 200, message: "applied" };
}

// Our top-up checkout names its record in the metadata; the product alone marks one bought some other way.
function isTopup(object: unknown, payment: DodoPayment, config: ReadyConfig): boolean {
  const product = config.topupProductId;
  if (payment.metadata?.[TOPUP_METADATA_KEY] != null) return true;
  return Boolean(product) && cartProducts(object).includes(product ?? "");
}

// Credits exactly the dollars our own record of the checkout holds, once per payment; anything else is logged, not credited.
async function recordTopup(
  object: unknown,
  context: Context,
  config: ReadyConfig,
  now: number,
): Promise<WebhookResult> {
  const parsed = TopupPaymentSchema.safeParse(object);
  const fields = { ...context, paymentId: parsed.success ? parsed.data.payment_id : "unreadable" };
  const refuse = (reason: string, extra: Record<string, string | number | null> = {}) => {
    log.error("billing.topup_mismatch", `top-up not credited: ${reason}`, { ...fields, ...extra });
    return { status: 200, message: "ignored" };
  };
  if (!parsed.success) {
    return refuse("malformed", { path: parsed.error.issues[0]?.path.map(String).join(".") ?? "" });
  }
  const payment = parsed.data;
  const [item, ...more] = payment.product_cart;
  // Unset, the flag only stops new sales: a checkout already signed and recorded still lands.
  const product = config.topupProductId;
  if (!item || more.length > 0 || (product && item.product_id !== product)) {
    return refuse("cart", { items: payment.product_cart.length });
  }
  const topupId = payment.metadata?.[TOPUP_METADATA_KEY];
  if (
    typeof topupId !== "string" ||
    !verifyBillingId(topupId, payment.metadata?.topup_sig, config.signingSecret)
  ) {
    return refuse("unsigned");
  }
  const ids = metadataIds(payment.metadata, config.signingSecret, fields);
  let checkout: Awaited<ReturnType<typeof findTopupCheckout>>;
  try {
    checkout = await findTopupCheckout(topupId);
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  if (!checkout) return refuse("no_checkout");
  if (checkout.userId !== ids.userId) return refuse("account");
  if (checkout.cents !== item.quantity * 100) {
    return refuse("quantity", { quantity: item.quantity, cents: checkout.cents });
  }
  const session = payment.checkout_session_id;
  if (checkout.sessionId && session && checkout.sessionId !== session) return refuse("session");
  const currency = payment.currency.toUpperCase();
  const total = payment.total_amount;
  const preTax = total - (payment.tax ?? 0);
  if (currency === "USD" && preTax !== checkout.cents) {
    return refuse("amount", { preTax, cents: checkout.cents });
  }
  // Adaptive Currency is off, so another currency is unexpected; the quantity still says what was bought.
  if (currency !== "USD") log.warn("billing.topup_currency", { ...fields, currency });
  try {
    const result = await creditTopup(
      {
        checkoutId: checkout.id,
        userId: checkout.userId,
        paymentId: payment.payment_id,
        cents: checkout.cents,
        charged: chargedRef(total, currency),
      },
      now,
    );
    if (result.outcome !== "credited") {
      if (result.outcome === "already_paid") return refuse("checkout_already_paid");
      if (result.outcome === "duplicate") {
        log.info("billing.webhook_duplicate", fields);
        return { status: 200, message: "duplicate" };
      }
      log.warn("billing.webhook_ignored", { ...fields, reason: "no_user" });
      return { status: 200, message: "ignored" };
    }
    const credited = { ...fields, userId: checkout.userId, cents: checkout.cents };
    log.info("billing.topup_credited", { ...credited, balanceCents: result.balanceCents });
    captureServerEvent(checkout.userId, "credit_added", { usd: checkout.cents / 100 });
    if (result.balanceCents > MAX_BALANCE_CENTS) {
      log.warn("billing.topup_over_cap", { ...credited, balanceCents: result.balanceCents });
    }
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  return { status: 200, message: "applied" };
}

// With prevent_change, a declined plan-change charge leaves the old plan; the owner hears of it here.
async function recordPaymentFailure(
  object: unknown,
  context: Context,
  config: ReadyConfig,
  now: number,
): Promise<WebhookResult> {
  const parsed = DodoPaymentSchema.safeParse(object);
  if (!parsed.success) return malformed(parsed.error, context);
  const payment = parsed.data;
  const ignore = (reason: string): WebhookResult => {
    log.info("billing.webhook_ignored", { ...context, reason });
    return { status: 200, message: "ignored" };
  };
  const subscriptionId = payment.subscription_id ?? undefined;
  let kind: BillingKind | null = null;
  if (subscriptionId || payment.charge_type) kind = "subscription";
  else if (isTopup(object, payment, config)) kind = "credit";
  if (!kind) return ignore("not_billing");
  const planChange = payment.charge_type === "plan_change";
  const ids = metadataIds(payment.metadata, config.signingSecret, {
    ...context,
    paymentId: payment.payment_id,
  });
  let payer: Awaited<ReturnType<typeof findBillingUser>>;
  try {
    payer = await findBillingUser({
      userId: ids.userId,
      customerId: payment.customer.customer_id,
      subscriptionId,
    });
    if (!payer && !planChange) return ignore("no_user");
    if (!(await claimBillingEvent(context.eventId, context.eventType, now))) {
      log.info("billing.webhook_duplicate", context);
      return { status: 200, message: "duplicate" };
    }
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  if (planChange) {
    log.warn("billing.plan_change_payment_failed", {
      ...context,
      paymentId: payment.payment_id,
      subscriptionId: payment.subscription_id ?? null,
      customerId: payment.customer.customer_id,
    });
  }
  if (payer) {
    const plan = kind === "credit" ? null : failedPlan(payment, payer.plan);
    trackPaymentFailure(payer.id, kind, plan, payment, object);
  }
  return { status: 200, message: "applied" };
}

// A checkout names the plan it tried to buy; later charges are for the plan the account is on.
function failedPlan(payment: DodoPayment, current: PlanId): PaidPlanId | null {
  const tried = checkoutChoice(payment.metadata)?.plan ?? null;
  const held = isPaidPlan(current) ? current : null;
  return payment.charge_type === "new" ? (tried ?? held) : (held ?? tried);
}

const DISPUTE_LOSSES: ReadonlySet<string> = new Set(["dispute.lost", "dispute.accepted"]);

// Refunds and disputes change no plan; they're logged for the owner, and a top-up's take its credit back.
async function recordAdjustment(
  event: DodoEvent,
  context: Context,
  config: ReadyConfig,
  now: number,
): Promise<WebhookResult> {
  let fields: Record<string, string | number | boolean | null>;
  let takeBack: TakeBack | null = null;
  let paymentId: string;
  // What PostHog hears of it, once the event is claimed.
  let track: ((owner: AdjustmentOwner) => void) | null = null;
  let lossKey: string | null = null;
  if (event.kind === "refund") {
    const parsed = DodoRefundSchema.safeParse(event.data);
    if (!parsed.success) return malformed(parsed.error, context);
    const refund = parsed.data;
    paymentId = refund.payment_id;
    if (event.type === "refund.succeeded") {
      track = (owner) => trackRefund(owner.userId, owner.kind, refund);
      // A partial refund whose amount can't be read takes the whole credit back.
      const amount = refund.amount == null ? Number.NaN : Number(refund.amount);
      takeBack = {
        paymentId: refund.payment_id,
        key: `refund:${refund.refund_id}`,
        share:
          refund.is_partial && Number.isFinite(amount)
            ? { amount, currency: refund.currency ?? null }
            : "all",
      };
    }
    fields = {
      kind: "refund",
      refundId: refund.refund_id,
      paymentId: refund.payment_id,
      status: refund.status,
      partial: refund.is_partial,
      amount: refund.amount ?? null,
      currency: refund.currency ?? null,
    };
  } else {
    const parsed = DodoDisputeSchema.safeParse(event.data);
    if (!parsed.success) return malformed(parsed.error, context);
    const dispute = parsed.data;
    paymentId = dispute.payment_id;
    if (event.type === "dispute.opened") {
      track = (owner) => trackDispute("dispute_opened", owner.userId, owner.kind, dispute);
    }
    if (DISPUTE_LOSSES.has(event.type)) {
      track = (owner) => trackDispute("dispute_lost", owner.userId, owner.kind, dispute);
      lossKey = `dispute_lost:${dispute.dispute_id}`;
      takeBack = {
        paymentId: dispute.payment_id,
        key: `dispute:${dispute.dispute_id}`,
        share: "all",
      };
    }
    fields = {
      kind: "dispute",
      disputeId: dispute.dispute_id,
      paymentId: dispute.payment_id,
      status: dispute.dispute_status,
      stage: dispute.dispute_stage,
      amount: dispute.amount,
      currency: dispute.currency,
      rdr: dispute.is_resolved_by_rdr ?? null,
    };
  }
  let owner: AdjustmentOwner | null;
  try {
    // Keyed by the refund or dispute, so it runs before the event's own claim and a retry repeats nothing.
    if (takeBack) {
      const taken = await takeBackTopup(takeBack, now);
      // A top-up refunded before its credit landed: Dodo's retry takes it back once the credit is in.
      if (
        taken.outcome === "not_topup" &&
        config.isTopupPayment &&
        (await config.isTopupPayment(takeBack.paymentId))
      ) {
        log.warn("billing.topup_takeback_early", { ...context, paymentId: takeBack.paymentId });
        return { status: 500, message: "retry" };
      }
      if (taken.outcome === "taken") {
        log.warn("billing.topup_taken_back", {
          ...context,
          paymentId: takeBack.paymentId,
          userId: taken.userId,
          cents: taken.wantedCents,
          removedCents: taken.removedCents,
          balanceCents: taken.balanceCents,
        });
      }
    }
    owner = track ? await adjustmentOwner(paymentId, event.data) : null;
    if (!(await claimBillingEvent(context.eventId, context.eventType, now))) {
      log.info("billing.webhook_duplicate", context);
      return { status: 200, message: "duplicate" };
    }
    // Lost and accepted may both come for one dispute; it counts once.
    if (lossKey && !(await claimBillingEvent(lossKey, context.eventType, now))) owner = null;
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  log.warn("billing.adjustment", { ...context, ...fields });
  if (track && owner) track(owner);
  return { status: 200, message: "applied" };
}

type AdjustmentOwner = { userId: string | null; kind: BillingKind };

// Our own top-up record names a credit's buyer; anything else is a subscription charge, found by its customer.
async function adjustmentOwner(paymentId: string, data: unknown): Promise<AdjustmentOwner> {
  const buyer = await topupBuyer(paymentId);
  if (buyer) return { userId: buyer, kind: "credit" };
  const customerId = customerIdOf(data);
  const userId = customerId ? await findBillingUserId({ customerId }) : null;
  return { userId, kind: "subscription" };
}

// A failed cancel keeps its trial_replacements row for the daily cron, so Dodo needn't redeliver.
async function cancelReusedTrial(
  subscriptionId: string,
  context: Context,
  now: number,
): Promise<void> {
  try {
    await settleReplacement(subscriptionId, now);
  } catch (error) {
    log.error("billing.replace_cancel_failed", error, { ...context, subscriptionId });
  }
}

async function cancelOrphan(
  subscriptionId: string,
  userId: string,
  context: Context,
  now: number,
): Promise<WebhookResult> {
  const fields = { ...context, userId, subscriptionId };
  let outcome: OrphanOutcome;
  try {
    outcome = await settleOrphan(subscriptionId, userId, now);
  } catch (error) {
    // Nothing marks a failed cancel for the cron, so Dodo's redelivery is the retry.
    log.error("billing.orphan_cancel_failed", error, fields);
    return { status: 500, message: "retry" };
  }
  if (outcome === "cancelled") {
    log.error(
      "billing.orphan_subscription_cancelled",
      "a subscription signed for a deleted account was cancelled and refunded",
      fields,
    );
  } else {
    log.info("billing.webhook_ignored", { ...fields, reason: `orphan_${outcome}` });
  }
  return { status: 200, message: "ignored" };
}

function malformed(error: z.ZodError, context: Context): WebhookResult {
  const path = error.issues[0]?.path.map(String).join(".") || "object";
  log.error("billing.webhook_malformed", `invalid ${path}`, context);
  return { status: 500, message: "malformed" };
}

async function report(
  result: Exclude<ApplyResult, { outcome: "rejected" }>,
  context: Context & { status: string; subscriptionId: string },
): Promise<void> {
  if (result.outcome === "applied") {
    log.info("billing.plan_updated", {
      ...context,
      userId: result.userId,
      plan: result.plan,
      trialing: result.trialing,
    });
    if (result.otherLiveSubscriptionId) {
      log.error("billing.second_live_subscription", "a second live subscription took over", {
        ...context,
        userId: result.userId,
        otherSubscriptionId: result.otherLiveSubscriptionId,
      });
    }
    await refreshPublishedPage(result);
    return;
  }
  if (result.outcome === "duplicate") {
    log.info("billing.webhook_duplicate", context);
    return;
  }
  const fields = { ...context, reason: result.reason };
  if (result.reason === "unsigned") {
    log.error(
      "billing.unsigned_subscription",
      "a subscription without our signed id was not applied",
      fields,
    );
    return;
  }
  const paidWithoutUser = result.reason === "no_user" && planForStatus(context.status) === "paid";
  const unknown = result.reason === "unknown_status" && !QUIET_STATUSES.has(context.status);
  if (paidWithoutUser || unknown) {
    log.warn("billing.webhook_ignored", fields);
  } else {
    log.info("billing.webhook_ignored", fields);
  }
}

async function refreshPublishedPage(result: Extract<ApplyResult, { outcome: "applied" }>) {
  if (canPublishPortfolio(result.before.plan) === canPublishPortfolio(result.plan)) return;
  try {
    refreshPortfolioPages(await portfolioSlugsOf(result.userId));
  } catch (error) {
    log.warn("billing.portfolio_refresh_failed", { userId: result.userId }, error);
  }
}
