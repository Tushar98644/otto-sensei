import { APIConnectionError, APIConnectionTimeoutError, APIError, DodoPayments } from "dodopayments";
// Same rule auth uses to store users.email.
import { normalizeEmail } from "@/lib/auth/policy";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { appUrl, env } from "@/lib/env";
import { log } from "@/lib/log";
import { isEndedStatus, isLiveStatus } from "./entitlements";
import { BillingError } from "./errors";
import { paidProductIds, productId as productFor } from "./intervals";

// Server-only. The only file that calls the Dodo API.

// Per attempt, with one retry. Someone is waiting on these links, so fail fast and let them retry.
const TIMEOUT_MS = 8_000;
const MAX_RETRIES = 1;

type Operation = "checkout" | "portal" | "cancel" | "lookup" | "change_plan";

// One page each: a person has one customer record in practice and a handful of subscriptions.
const CUSTOMER_PAGE_SIZE = 10;
const SUBSCRIPTION_PAGE_SIZE = 100;

// Dodo answers these when a subscription can't be cancelled as asked, e.g. because it already
// ended. Auth, rate-limit and server errors mean the same for every call, so they aren't here.
const REFUSED_STATUSES: ReadonlySet<number> = new Set([400, 409, 422]);

// Built per call: it holds no connection of its own (fetch pools sockets) and always matches env().
function client(): DodoPayments {
  const { DODO_PAYMENTS_API_KEY, DODO_PAYMENTS_ENVIRONMENT } = env();
  if (!DODO_PAYMENTS_API_KEY) throw new BillingError("unavailable", "DODO_PAYMENTS_API_KEY is not set");
  return new DodoPayments({
    bearerToken: DODO_PAYMENTS_API_KEY,
    environment: DODO_PAYMENTS_ENVIRONMENT,
    // The SDK throws if DODO_PAYMENTS_BASE_URL and an environment are both set; the environment wins.
    baseURL: null,
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
}

/**
 * Hosted checkout for the plan's subscription billed every `interval`. The URL is single-use and
 * expires after 24 hours. https://docs.dodopayments.com/developer-resources/checkout-session
 */
export async function createDodoCheckoutUrl(
  user: SessionUser,
  plan: PaidPlanId = "pro",
  interval: BillingInterval = "month",
): Promise<string> {
  const productId = productFor(plan, interval);
  if (!productId) throw new BillingError("unavailable", `No ${plan} product is set for "${interval}"`);
  const base = appUrl();
  const session = await request("checkout", (dodo) =>
    dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: { email: user.email },
      // Webhooks look the user up by this first, then by billing ids, then by email.
      metadata: { user_id: user.id },
      // The email ties the subscription to the account that signed in, so it stays fixed.
      feature_flags: { allow_customer_editing_email: false },
      customization: { theme: "light" },
      return_url: `${base}/account?checkout=success&plan=${plan}`,
      cancel_url: `${base}/account?checkout=cancelled`,
    }),
  );
  // Dodo only guarantees session_id (checkout_url is null when a saved card is charged directly).
  if (!session.checkout_url) {
    log.error("billing.provider_failed", "checkout session without a URL", { operation: "checkout" });
    throw new BillingError("provider_error", "Checkout session has no URL");
  }
  return session.checkout_url;
}

/**
 * Customer portal (cancel, change card, invoices). Links expire after 24 hours, so make one per click.
 * https://docs.dodopayments.com/features/customer-portal
 */
export async function createDodoPortalUrl(customerId: string): Promise<string> {
  const session = await request("portal", (dodo) =>
    dodo.customers.customerPortal.create(customerId, { return_url: `${appUrl()}/account` }),
  );
  return session.link;
}

export type DodoCancelResult = "cancelled" | "already_ended";

/**
 * Cancels the subscription right away (not at the end of the period), so nothing is charged again.
 * Resolves "already_ended" when Dodo refuses because it was already over. Throws BillingError.
 * https://docs.dodopayments.com/developer-resources/subscription-integration-guide
 */
export async function cancelDodoSubscription(subscriptionId: string): Promise<DodoCancelResult> {
  try {
    await client().subscriptions.update(subscriptionId, {
      status: "cancelled",
      cancel_reason: "cancelled_by_customer",
      cancellation_comment: "Account deleted",
    });
    return "cancelled";
  } catch (error) {
    if (!(error instanceof APIError && error.status !== undefined && REFUSED_STATUSES.has(error.status))) {
      throw providerFailure("cancel", error);
    }
  }
  // A cancel that timed out on an earlier try may have gone through, and the webhook saying so may
  // not have arrived yet. Dodo's current status decides whether there is still anything to stop.
  const subscription = await request("cancel", (dodo) => dodo.subscriptions.retrieve(subscriptionId));
  if (isEndedStatus(subscription.status)) return "already_ended";
  log.error("billing.provider_failed", "cancel refused for a live subscription", {
    operation: "cancel",
    status: subscription.status,
  });
  throw new BillingError("provider_error", "Dodo refused to cancel the subscription");
}

/**
 * Moves a live subscription to another product (Pro to Max or back), charging or crediting the
 * difference for the rest of the period. The plan itself changes when Dodo's
 * subscription.plan_changed webhook arrives. Throws BillingError.
 * https://docs.dodopayments.com/developer-resources/subscription-upgrade-downgrade
 */
export async function changeDodoPlan(subscriptionId: string, productId: string): Promise<void> {
  await request("change_plan", (dodo) =>
    dodo.subscriptions.changePlan(subscriptionId, {
      product_id: productId,
      quantity: 1,
      proration_billing_mode: "prorated_immediately",
    }),
  );
}

export type LiveSubscription = { subscriptionId: string; customerId: string; status: string };

export type SubscriptionLookup = {
  email: string;
  customerId: string | null;
  // The stored subscription. It counts even after a plan change moved it to another product.
  subscriptionId: string | null;
};

/**
 * Every paid subscription Dodo could still charge this person for, on the stored customer and on any
 * customer with their email. Stored ids alone miss two: a payment whose webhook hasn't landed yet,
 * and an earlier subscription a newer one replaced in our row. Throws BillingError.
 */
export async function findLiveSubscriptions(lookup: SubscriptionLookup): Promise<LiveSubscription[]> {
  const productIds = new Set(paidProductIds());
  const email = normalizeEmail(lookup.email);
  const customers = await request("lookup", async (dodo) => {
    const page = await dodo.customers.list({ email, page_size: CUSTOMER_PAGE_SIZE });
    return page.items;
  });
  // Exact matches only: how loosely the filter matches isn't documented, and a near match is
  // someone else's billing.
  const customerIds = new Set(
    customers.filter((customer) => normalizeEmail(customer.email) === email).map((customer) => customer.customer_id),
  );
  if (lookup.customerId) customerIds.add(lookup.customerId);

  const live = new Map<string, LiveSubscription>();
  for (const customerId of customerIds) {
    const subscriptions = await request("lookup", async (dodo) => {
      const page = await dodo.subscriptions.list({ customer_id: customerId, page_size: SUBSCRIPTION_PAGE_SIZE });
      return page.items;
    });
    for (const subscription of subscriptions) {
      const { subscription_id: subscriptionId, status } = subscription;
      const ours = subscriptionId === lookup.subscriptionId || productIds.has(subscription.product_id);
      if (ours && subscription.customer.customer_id === customerId && isLiveStatus(status)) {
        live.set(subscriptionId, { subscriptionId, customerId, status });
      }
    }
  }
  return [...live.values()];
}

async function request<T>(operation: Operation, send: (dodo: DodoPayments) => Promise<T>): Promise<T> {
  try {
    return await send(client());
  } catch (error) {
    throw providerFailure(operation, error);
  }
}

function providerFailure(operation: Operation, error: unknown): BillingError {
  if (error instanceof BillingError) return error;
  log.error("billing.provider_failed", error instanceof APIError ? failureKind(error) : error, {
    operation,
    providerCode: providerErrorCode(error),
  });
  return new BillingError("provider_error", `Dodo ${operation} request failed`);
}

// Logged instead of the SDK's message, which embeds the raw response body and may echo request
// fields such as the customer's email.
function failureKind(error: APIError): string {
  if (error instanceof APIConnectionTimeoutError) return "timeout";
  if (error instanceof APIConnectionError) return "network";
  return `http_${error.status ?? "unknown"}`;
}

function providerErrorCode(error: unknown): string | undefined {
  if (!(error instanceof APIError)) return undefined;
  const body: unknown = error.error;
  if (typeof body === "object" && body !== null && "code" in body && typeof body.code === "string") {
    return body.code.slice(0, 64);
  }
  return undefined;
}
