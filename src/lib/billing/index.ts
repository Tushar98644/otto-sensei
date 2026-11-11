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

// Creem is the merchant of record (checkout, tax, invoices, portal); we store the plan and ids.

export type { BillingMode } from "./types";
export { BillingError, type BillingErrorCode, type BillingErrorDetails } from "./errors";
export { billingOffer, offeredIntervals } from "./intervals";

export { billingMode } from "./mode";

// How a subscriber moves to another paid plan, by Creem status:
// - in_place: Creem swaps the product and prorates; only allowed on "active".
// - replace_trial: a trial can't be modified, so the new plan is its own checkout and the webhook
//   cancels the trial once that's paid.
// - fix_payment: a renewal failed (past_due); the card comes first.
// - portal: anything else; a second subscription would charge alongside the first.
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

export async function trialAvailableFor(user: SessionUser): Promise<boolean> {
  return trialOffered() && (await isTrialEligible(user));
}

// Pro monthly for someone who never trialed or paid uses the trial product. A subscriber picking
// the other paid plan follows planChangeRoute; anyone else with a live subscription goes to the
// portal rather than a second subscription. mock switches the plan at once.
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
  // Free here doesn't mean nothing bills (unpaid, paused, or a webhook on its way), and only one
  // subscription fits in our row.
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
  // null when the lookup failed and the stored one stands in.
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

// mock: downgrades to Free and returns "/account?portal=mock".
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

// not_configured: Creem may still be charging, but there's no API key to stop it (logged).
export type DeletionCancelResult = "none" | "cancelled" | "already_ended" | "not_configured";

// Cancels every subscription that could still charge, immediately: the account is about to be
// deleted. Call before deleting and keep the account if it throws, so the user can try again.
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

// Returns the HTTP status: 401 bad signature, 200 handled or ignored, 500 retryable. Needs only the
// webhook secret, so events still land while checkout is off.
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
