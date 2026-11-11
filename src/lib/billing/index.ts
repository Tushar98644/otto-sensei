import {
  isTrialing,
  PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import {
  cancelCreemSubscription,
  changeCreemPlan,
  createCreemCheckoutUrl,
  createCreemPortalUrl,
  findLiveSubscriptions,
  type LiveSubscription,
} from "./creem";
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

// Server-only. Creem is the merchant of record: it handles checkout, tax, invoices and the
// customer portal. We only store the plan + ids from webhooks.

export type { BillingMode } from "./types";
export { BillingError, type BillingErrorCode, type BillingErrorDetails } from "./errors";
export { billingOffer, offeredIntervals } from "./intervals";

export { billingMode } from "./mode";

/**
 * How a subscriber moves to another paid plan, by their subscription's Creem status:
 * - in_place: Creem swaps the product and prorates. Creem only allows this on "active".
 * - replace_trial: a free trial can't be modified, so the new plan is its own checkout, and the
 *   webhook cancels the trial once that's paid (./replacements.ts). Nothing was ever charged on it.
 * - fix_payment: a renewal failed (past_due) and Creem is retrying it. The card comes first.
 * - portal: paused, unpaid, a paid plan that's set to end, or a status we don't know. The portal
 *   shows what's going on, and a second subscription would charge alongside the first.
 */
export type PlanChangeRoute = "in_place" | "replace_trial" | "fix_payment" | "portal";

export function planChangeRoute(
  status: string,
  user: Pick<SessionUser, "plan" | "trialEndsAt">,
): PlanChangeRoute {
  if (status === "active") return "in_place";
  if (status === "trialing") return "replace_trial";
  // A trial cancelled in the portal keeps access until the trial ends, and still charged nothing.
  if (status === "scheduled_cancel" && isTrialing(user)) return "replace_trial";
  if (status === "past_due") return "fix_payment";
  return "portal";
}

/**
 * Whether this account would get the free trial at checkout now: trials are on sale here and it
 * has never trialed or paid (src/lib/billing/trial.ts).
 */
export async function trialAvailableFor(user: SessionUser): Promise<boolean> {
  return trialOffered() && (await isTrialEligible(user));
}

/**
 * Returns a URL to send the browser to. creem: a hosted checkout for `plan` billed every
 * `interval`, tied to the user (metadata user_id + customer email), returning to
 * /account?checkout=success. Pro monthly for someone who has never trialed or paid uses the trial
 * product: free for PRO_TRIAL.days, card taken at checkout, then Pro monthly. A subscriber who
 * picks the other paid plan follows planChangeRoute: an active subscription moves to it in place
 * (prorated, no second checkout) and goes straight back to /account?checkout=success; one on the
 * free trial gets a checkout for the new plan that ends the trial once paid; a failed renewal
 * throws BillingError("payment_overdue"). Anyone else with a subscription that can still charge
 * goes to the customer portal instead of a second subscription. mock: switches the plan at once
 * (on the trial when it applies). disabled, or an option with no product: throws
 * BillingError("unavailable"). Already on that plan: throws BillingError("already_subscribed").
 */
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
  const trial =
    plan === PRO_TRIAL.plan && interval === PRO_TRIAL.interval && (await trialAvailableFor(user));
  if (mode === "mock") {
    await mockSubscribe(user.id, plan, interval, { trial });
    return `/account?checkout=success&plan=${plan}${trial ? "&trial=1" : ""}`;
  }
  // Free here doesn't mean nothing bills: a renewal can be unpaid or paused, or a payment's webhook
  // can still be on its way. A second subscription would then charge alongside the first, and only
  // one fits in our row.
  const existing = await existingSubscription(user);
  if (existing) {
    const target = productId(plan, interval);
    const route =
      user.plan !== "free" && target ? planChangeRoute(existing.status, user) : "portal";
    const fields = { userId: user.id, from: user.plan, to: plan, status: existing.status };
    if (route === "in_place" && target) {
      await changeCreemPlan(existing.subscriptionId, target);
      log.info("billing.plan_change_requested", fields);
      return `/account?checkout=success&plan=${plan}`;
    }
    if (route === "replace_trial" && target) {
      // Only when Creem listed the trial as the one live subscription: a second one means a plan
      // bought a moment ago is still on its way, and a failed lookup can't rule that out.
      if (existing.liveCount === null) {
        throw new BillingError("provider_error", "Creem subscription lookup failed", {
          operation: "lookup",
        });
      }
      if (existing.liveCount === 1) {
        const url = await createCreemCheckoutUrl(user, target, {
          plan,
          trial: false,
          replaces: existing.subscriptionId,
        });
        log.info("billing.trial_replacement_started", {
          ...fields,
          replaces: existing.subscriptionId,
        });
        return url;
      }
    }
    if (route === "fix_payment") {
      log.info("billing.plan_change_blocked", { ...fields, reason: "past_due" });
      throw new BillingError("payment_overdue", "The subscription's last payment failed");
    }
    log.info("billing.checkout_redirected", { userId: user.id, status: existing.status });
    return createCreemPortalUrl(existing.customerId);
  }
  const product = trial ? trialProductId() : productId(plan, interval);
  if (!product) throw new BillingError("unavailable", `No ${plan} product is set for "${interval}"`);
  return createCreemCheckoutUrl(user, product, { plan, trial });
}

type ExistingSubscription = LiveSubscription & {
  // How many live subscriptions Creem listed; null when the lookup failed and the stored one
  // stands in.
  liveCount: number | null;
};

// Creem's answer when it gives one (the stored subscription first), else the stored subscription,
// so a failed lookup neither blocks checkout for everyone nor lets a stored one be bought twice.
async function existingSubscription(user: SessionUser): Promise<ExistingSubscription | null> {
  const record = await getBillingRecord(user.id);
  try {
    const live = await findLiveSubscriptions(lookupFor(user, record));
    const stored = live.find(
      (candidate) => candidate.subscriptionId === record?.billingSubscriptionId,
    );
    const first = stored ?? live[0];
    return first ? { ...first, liveCount: live.length } : null;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    const subscriptionId = record ? chargeableSubscriptionId(record) : null;
    const customerId = record?.billingCustomerId;
    if (!subscriptionId || !customerId) return null;
    return { subscriptionId, customerId, status: record?.planStatus ?? "unknown", liveCount: null };
  }
}

function lookupFor(user: SessionUser, record: BillingRecord | null) {
  return {
    email: user.email,
    customerId: record?.billingCustomerId ?? null,
    subscriptionId: record?.billingSubscriptionId ?? null,
  };
}

/**
 * Customer portal URL for managing/cancelling the subscription. mock: downgrades to free and returns
 * "/account?portal=mock". Throws BillingError("no_subscription") when the user never subscribed.
 */
export async function createPortalUrl(user: SessionUser): Promise<string> {
  const mode = billingMode();
  if (mode === "disabled") throw new BillingError("unavailable", "Billing is not configured");
  if (mode === "mock") {
    if (!(await mockCancel(user.id)))
      throw new BillingError("no_subscription", "User never subscribed");
    return "/account?portal=mock";
  }
  const customerId = await getBillingCustomerId(user.id);
  if (!customerId) throw new BillingError("no_subscription", "User has no billing customer");
  return createCreemPortalUrl(customerId);
}

/**
 * What happened to the user's subscription before their account was deleted. "not_configured":
 * Creem may still be charging it, but there's no API key to stop it with (logged as a warning).
 */
export type DeletionCancelResult = "none" | "cancelled" | "already_ended" | "not_configured";

/**
 * Stops every subscription that could still charge the user, immediately rather than at the end of
 * the period, because the account it pays for is about to be deleted: the stored one, and any
 * other paid subscription Creem has for their customer or email (see findLiveSubscriptions). Call
 * it before deleting and keep the account if it throws (BillingError "provider_error"), so the user
 * can try again. mock: downgrades locally. Nothing that can charge: does nothing.
 */
export async function cancelSubscriptionForDeletion(
  user: SessionUser,
  now = Date.now(),
): Promise<DeletionCancelResult> {
  const record = await getBillingRecord(user.id);
  if (!record) return "none";
  if (billingMode() === "mock") {
    return record.plan !== "free" && (await mockCancel(user.id, now)) ? "cancelled" : "none";
  }
  const stored = chargeableSubscriptionId(record);
  // Someone Creem never told us about has nothing there to cancel, and deleting their account
  // shouldn't wait on Creem.
  if (!stored && record.billingCustomerId === null && record.billingSubscriptionId === null)
    return "none";
  // Only the API key is needed to cancel, so this still works while checkout is switched off for a
  // missing product id or webhook secret.
  if (!env().CREEM_API_KEY) {
    if (!stored) return "none";
    log.warn("billing.cancel_skipped", {
      userId: user.id,
      reason: "not_configured",
      status: record.planStatus,
    });
    return "not_configured";
  }
  const subscriptionIds = new Set(stored ? [stored] : []);
  for (const live of await otherLiveSubscriptions(user, record))
    subscriptionIds.add(live.subscriptionId);
  if (subscriptionIds.size === 0) return "none";

  let cancelled = false;
  for (const subscriptionId of subscriptionIds) {
    cancelled = (await cancelCreemSubscription(subscriptionId)) === "cancelled" || cancelled;
    // The row is deleted next, but if that fails the account should already show the plan is over.
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

// Best effort: the stored subscription is cancelled either way, so a failed lookup is left for a
// person to check instead of blocking every deletion while Creem's API is down.
async function otherLiveSubscriptions(
  user: SessionUser,
  record: BillingRecord,
): Promise<LiveSubscription[]> {
  try {
    return await findLiveSubscriptions(lookupFor(user, record));
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    log.error("billing.lookup_failed", error, { userId: user.id, reason: "account_deleted" });
    return [];
  }
}

/**
 * Verifies the creem-signature header with CREEM_WEBHOOK_SECRET, ignores already-seen event ids
 * (billing_events), and updates the user's plan from subscription and checkout events. Returns
 * the HTTP status to send back: 401 bad signature, 200 handled/ignored, 500 retryable. Only the
 * webhook secret is needed, so events still land while checkout is switched off.
 */
export async function handleWebhook(
  rawBody: string,
  headers: Headers,
): Promise<{ status: number; message: string }> {
  return processWebhook(rawBody, headers, {
    secret: env().CREEM_WEBHOOK_SECRET,
    productIds: paidProductIds(),
    planForProduct,
  });
}
