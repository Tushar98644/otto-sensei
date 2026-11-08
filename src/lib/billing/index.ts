import { PLANS, type BillingInterval, type PaidPlanId } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import {
  cancelDodoSubscription,
  changeDodoPlan,
  createDodoCheckoutUrl,
  createDodoPortalUrl,
  findLiveSubscriptions,
  type LiveSubscription,
} from "./dodo";
import {
  chargeableSubscriptionId,
  getBillingCustomerId,
  getBillingRecord,
  markSubscriptionCancelled,
  type BillingRecord,
} from "./entitlements";
import { BillingError } from "./errors";
import { offeredIntervals, paidProductIds, planForProduct, productId } from "./intervals";
import { mockCancel, mockSubscribe } from "./mock";
import { billingMode } from "./mode";
import { processWebhook } from "./webhook";

// Server-only. Dodo Payments is the merchant of record: it handles checkout, tax, invoices and the
// customer portal. We only store the plan + ids from webhooks.

export type { BillingMode } from "./types";
export { BillingError, type BillingErrorCode } from "./errors";
export { billingOffer, offeredIntervals } from "./intervals";

export { billingMode } from "./mode";

/**
 * Returns a URL to send the browser to. dodo: a hosted checkout session for `plan` billed every
 * `interval`, tied to the user (metadata user_id + customer email), returning to
 * /account?checkout=success. Someone already paying who picks the other paid plan has their
 * subscription moved to it (prorated, no second checkout) and goes straight back to
 * /account?checkout=success; anyone else with a subscription that can still charge goes to the
 * customer portal instead of a second subscription. mock: switches the plan at once.
 * disabled, or an option with no product: throws BillingError("unavailable"). Already on that
 * plan: throws BillingError("already_subscribed").
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
  if (mode === "mock") {
    await mockSubscribe(user.id, plan, interval);
    return `/account?checkout=success&plan=${plan}`;
  }
  // Free here doesn't mean nothing bills: a renewal can be on hold or paused, or a payment's webhook
  // can still be on its way. A second subscription would then charge alongside the first, and only
  // one fits in our row.
  const existing = await existingSubscription(user);
  if (existing) {
    const target = productId(plan, interval);
    // Pro to Max (or back) on a subscription we track: Dodo swaps the product in place.
    if (user.plan !== "free" && target && existing.status === "active") {
      await changeDodoPlan(existing.subscriptionId, target);
      log.info("billing.plan_change_requested", { userId: user.id, from: user.plan, to: plan });
      return `/account?checkout=success&plan=${plan}`;
    }
    log.info("billing.checkout_redirected", { userId: user.id, status: existing.status });
    return createDodoPortalUrl(existing.customerId);
  }
  return createDodoCheckoutUrl(user, plan, interval);
}

// Dodo's answer when it gives one, else the stored subscription, so a failed lookup neither blocks
// checkout for everyone nor lets a stored one be bought twice.
async function existingSubscription(user: SessionUser): Promise<LiveSubscription | null> {
  const record = await getBillingRecord(user.id);
  try {
    const [live] = await findLiveSubscriptions(lookupFor(user, record));
    return live ?? null;
  } catch (error) {
    if (!(error instanceof BillingError)) throw error;
    const subscriptionId = record ? chargeableSubscriptionId(record) : null;
    const customerId = record?.billingCustomerId;
    if (!subscriptionId || !customerId) return null;
    return { subscriptionId, customerId, status: record?.planStatus ?? "unknown" };
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
  return createDodoPortalUrl(customerId);
}

/**
 * What happened to the user's subscription before their account was deleted. "not_configured":
 * Dodo may still be charging it, but there's no API key to stop it with (logged as a warning).
 */
export type DeletionCancelResult = "none" | "cancelled" | "already_ended" | "not_configured";

/**
 * Stops every subscription that could still charge the user, immediately rather than at the end of
 * the period, because the account it pays for is about to be deleted: the stored one, and any
 * other paid subscription Dodo has for their customer or email (see findLiveSubscriptions). Call it
 * before deleting and keep the account if it throws (BillingError "provider_error"), so the user
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
  // Someone Dodo never told us about has nothing there to cancel, and deleting their account
  // shouldn't wait on Dodo.
  if (!stored && record.billingCustomerId === null && record.billingSubscriptionId === null)
    return "none";
  // Only the API key is needed to cancel, so this still works while checkout is switched off for a
  // missing product id or webhook key.
  if (!env().DODO_PAYMENTS_API_KEY) {
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
    cancelled = (await cancelDodoSubscription(subscriptionId)) === "cancelled" || cancelled;
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
// person to check instead of blocking every deletion while Dodo's list API is down.
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
 * Verifies the Standard Webhooks signature with DODO_PAYMENTS_WEBHOOK_KEY, ignores already-seen
 * webhook ids (billing_events), and updates the user's plan from subscription events.
 * Returns the HTTP status to send back: 401 bad signature, 200 handled/ignored, 500 retryable.
 * Only the webhook key is needed, so events still land while checkout is switched off.
 */
export async function handleWebhook(
  rawBody: string,
  headers: Headers,
): Promise<{ status: number; message: string }> {
  return processWebhook(rawBody, headers, {
    secret: env().DODO_PAYMENTS_WEBHOOK_KEY,
    productIds: paidProductIds(),
    planForProduct,
  });
}
