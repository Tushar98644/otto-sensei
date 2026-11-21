import {
  isPaidPlan,
  isTrialing,
  PLAN_ORDER,
  PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import {
  changePlan,
  createCheckout,
  endSubscription,
  listLiveSubscriptions,
  portalUrl,
} from "./dodo";
import { internalStatus, isDodoId } from "./dodo-status";
import {
  chargeableSubscriptionId,
  getBillingCustomerId,
  getBillingRecord,
  markSubscriptionCancelled,
  type BillingRecord,
} from "./entitlements";
import { BillingError } from "./errors";
import {
  offeredIntervals,
  paidProductIds,
  planForProduct,
  productId,
  trialOffered,
  trialProductId,
} from "./intervals";
import { mockCancel, mockSubscribe } from "./mock";
import { billingMode } from "./mode";
import { isTrialEligible } from "./trial";
import { processWebhook } from "./webhook";

export type { BillingMode } from "./types";
export {
  BillingError,
  type BillingErrorCode,
  type BillingErrorDetails,
  type BillingRefusalReason,
} from "./errors";
export { billingOffer, offeredIntervals } from "./intervals";

export { billingMode } from "./mode";

export type PlanChangeRoute = "in_place" | "upgrade_trial" | "fix_payment" | "portal";

// Dodo refuses a plan change while a cancel is scheduled, so that goes to the portal to resume first.
export function planChangeRoute(status: string): PlanChangeRoute {
  if (status === "active") return "in_place";
  if (status === "trialing") return "upgrade_trial";
  if (status === "past_due") return "fix_payment";
  return "portal";
}

export async function trialAvailableFor(user: SessionUser): Promise<boolean> {
  return trialOffered() && (await isTrialEligible(user));
}

export async function createCheckoutUrl(
  user: SessionUser,
  plan: PaidPlanId = "pro",
  interval: BillingInterval = "month",
): Promise<string> {
  const mode = billingMode();
  if (mode === "disabled") throw new BillingError("unavailable", "Billing is not configured");
  if (!offeredIntervals(plan).includes(interval)) {
    throw new BillingError("unavailable", `No ${plan} product is set for "${interval}"`);
  }
  // A second checkout would start a second subscription and charge the user twice.
  if (user.plan === plan) {
    throw new BillingError("already_subscribed", `User is already on ${PLANS[plan].name}`);
  }
  // A paid plan only moves up in the app, on the billing period already paid for.
  if (isPaidPlan(user.plan) && !isTrialing(user)) {
    const down = PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(user.plan);
    const otherPeriod = user.planInterval !== null && interval !== user.planInterval;
    if (down || otherPeriod) {
      throw new BillingError("change_not_offered", `No in-app change from ${user.plan} to ${plan}`);
    }
  }
  const trial =
    plan === PRO_TRIAL.plan && interval === PRO_TRIAL.interval && (await trialAvailableFor(user));
  if (mode === "mock") {
    await mockSubscribe(user.id, plan, interval, { trial });
    return `/account?checkout=success&plan=${plan}${trial ? "&trial=1" : ""}`;
  }
  const record = await getBillingRecord(user.id);
  const existing = await existingSubscription(user, record);
  if (existing) {
    const target = productId(plan, interval);
    const route = user.plan !== "free" && target ? planChangeRoute(existing.status) : "portal";
    const fields = { userId: user.id, from: user.plan, to: plan, status: existing.status };
    if (route === "in_place" && target) {
      await changePlan(existing.subscriptionId, target, { fromTrial: false });
      log.info("billing.plan_change_requested", fields);
      return `/account?checkout=success&plan=${plan}`;
    }
    if (route === "upgrade_trial" && target) {
      if (existing.liveCount === null) {
        throw new BillingError("provider_error", "Dodo subscription lookup failed", {
          operation: "lookup",
        });
      }
      // The trial ends now and the new plan is charged in full; a second live one goes to the portal.
      if (existing.liveCount === 1) {
        await changePlan(existing.subscriptionId, target, { fromTrial: true });
        log.info("billing.trial_upgrade_requested", fields);
        return `/account?checkout=success&plan=${plan}`;
      }
    }
    if (route === "fix_payment") {
      log.info("billing.plan_change_blocked", { ...fields, reason: "past_due" });
      throw new BillingError("payment_overdue", "The subscription's last payment failed");
    }
    log.info("billing.checkout_redirected", { userId: user.id, status: existing.status });
    return portalUrl(existing.customerId);
  }
  const product = trial ? trialProductId() : productId(plan, interval);
  if (!product)
    throw new BillingError("unavailable", `No ${plan} product is set for "${interval}"`);
  const { url } = await createCheckout({
    userId: user.id,
    email: user.email,
    customerId: record?.billingCustomerId ?? null,
    productId: product,
    plan,
    interval,
    trial,
  });
  return url;
}

type LiveSubscription = { subscriptionId: string; customerId: string; status: string };

type ExistingSubscription = LiveSubscription & {
  liveCount: number | null;
};

async function existingSubscription(
  user: SessionUser,
  record: BillingRecord | null,
): Promise<ExistingSubscription | null> {
  try {
    const live = await ourLiveSubscriptions(user, record);
    const stored = live.find(
      (candidate) => candidate.subscriptionId === record?.billingSubscriptionId,
    );
    const first = stored ?? live[0];
    return first ? { ...first, liveCount: live.length } : null;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    const subscriptionId = record ? chargeableSubscriptionId(record) : null;
    const customerId = record?.billingCustomerId;
    if (!isDodoId("sub", subscriptionId) || !isDodoId("cus", customerId)) return null;
    return { subscriptionId, customerId, status: record?.planStatus ?? "unknown", liveCount: null };
  }
}

// The stored subscription, or any on one of our products, under the stored or the same-email customer.
async function ourLiveSubscriptions(
  user: SessionUser,
  record: BillingRecord | null,
): Promise<LiveSubscription[]> {
  const products = new Set(paidProductIds());
  const found = await listLiveSubscriptions({
    customerId: record?.billingCustomerId ?? null,
    email: user.email,
  });
  return found
    .filter(
      (subscription) =>
        subscription.subscription_id === record?.billingSubscriptionId ||
        products.has(subscription.product_id),
    )
    .map((subscription) => ({
      subscriptionId: subscription.subscription_id,
      customerId: subscription.customer.customer_id,
      // Pending has no status word of ours; it routes to the portal like any other.
      status: internalStatus(subscription) ?? subscription.status,
    }));
}

export async function createPortalUrl(user: SessionUser): Promise<string> {
  const mode = billingMode();
  if (mode === "disabled") throw new BillingError("unavailable", "Billing is not configured");
  if (mode === "mock") {
    if (!(await mockCancel(user.id)))
      throw new BillingError("no_subscription", "User never subscribed");
    return "/account?portal=mock";
  }
  const customerId = await getBillingCustomerId(user.id);
  if (!isDodoId("cus", customerId)) {
    throw new BillingError("no_subscription", "User has no Dodo customer");
  }
  return portalUrl(customerId);
}

export type DeletionCancelResult = "none" | "cancelled" | "already_ended";

// Call before deleting the account, and keep it if this throws so the user can try again.
export async function cancelSubscriptionForDeletion(
  user: SessionUser,
  now = Date.now(),
): Promise<DeletionCancelResult> {
  const record = await getBillingRecord(user.id);
  if (!record) return "none";
  if (billingMode() === "mock") {
    return record.plan !== "free" && (await mockCancel(user.id, now)) ? "cancelled" : "none";
  }
  const chargeable = chargeableSubscriptionId(record);
  // Old Paddle ids never go to Dodo; a checkout paid before its webhook stores nothing, so the lookup always runs.
  const stored = isDodoId("sub", chargeable) ? chargeable : null;
  if (!env().DODO_API_KEY) {
    if (!stored) return "none";
    // Only production gets here (billing is mocked elsewhere); deleting would leave Dodo charging.
    throw new BillingError("unavailable", "DODO_API_KEY is not set");
  }
  const subscriptionIds = new Set(stored ? [stored] : []);
  for (const live of await otherLiveSubscriptions(user, record))
    subscriptionIds.add(live.subscriptionId);
  if (subscriptionIds.size === 0) return "none";

  let cancelled = false;
  for (const subscriptionId of subscriptionIds) {
    cancelled = (await endSubscription(subscriptionId)) === "cancelled" || cancelled;
    await markSubscriptionCancelled(user.id, subscriptionId, now);
  }
  const result = cancelled ? "cancelled" : "already_ended";
  log.info("billing.subscription_cancelled", {
    userId: user.id,
    reason: "account_deleted",
    result,
    subscriptions: subscriptionIds.size,
  });
  return result;
}

async function otherLiveSubscriptions(
  user: SessionUser,
  record: BillingRecord,
): Promise<LiveSubscription[]> {
  try {
    return await ourLiveSubscriptions(user, record);
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    log.error("billing.lookup_failed", error, { userId: user.id, reason: "account_deleted" });
    return [];
  }
}

export async function handleWebhook(
  rawBody: string,
  headers: Headers,
): Promise<{ status: number; message: string }> {
  const e = env();
  return processWebhook(rawBody, headers, {
    secret: e.DODO_WEBHOOK_SECRET,
    signingSecret: e.BILLING_SIGNING_SECRET,
    productIds: paidProductIds(),
    planForProduct,
    trialProductId: trialProductId(),
  });
}
