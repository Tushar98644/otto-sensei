import { Creem } from "creem";
import {
  ConnectionError,
  CreemError,
  RequestTimeoutError,
  ResponseValidationError,
} from "creem/models/errors";
import type { PaidPlanId } from "@/config/plans";
import { normalizeEmail } from "@/lib/auth/policy";
import type { SessionUser } from "@/lib/auth/types";
import { appUrl, env } from "@/lib/env";
import { log } from "@/lib/log";
import { isEndedStatus, isLiveStatus } from "./entitlements";
import { BillingError } from "./errors";
import { paidProductIds } from "./intervals";

// The only file that calls the Creem API (https://docs.creem.io).

// Someone is waiting on these links, so fail fast and let them click again. Writes (checkout,
// upgrade, cancel) are never retried: a retry after a timeout could act twice.
const TIMEOUT_MS = 8_000;
const READ_RETRY = {
  strategy: "backoff",
  backoff: { initialInterval: 300, maxInterval: 1_000, exponent: 2, maxElapsedTime: 2_000 },
  retryConnectionErrors: true,
} as const;

type Operation = "checkout" | "portal" | "cancel" | "lookup" | "change_plan";

const SUBSCRIPTION_PAGE_SIZE = 50;

// Creem's answers when a cancel is refused (e.g. already ended); other errors mean the same
// everywhere.
const REFUSED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409, 422]);

// Built per call: it holds no connection of its own (fetch pools sockets) and always matches env().
function client(): Creem {
  const { CREEM_API_KEY, CREEM_TEST_MODE } = env();
  if (!CREEM_API_KEY) throw new BillingError("unavailable", "CREEM_API_KEY is not set");
  return new Creem({
    apiKey: CREEM_API_KEY,
    server: CREEM_TEST_MODE ? "test" : "prod",
    timeoutMs: TIMEOUT_MS,
  });
}

// Creem copies checkout metadata onto the new subscription, so its webhooks know which trial to
// cancel once it's paid (./replacements.ts).
export const REPLACES_METADATA_KEY = "replaces_subscription_id";

export type CheckoutOptions = {
  plan: PaidPlanId;
  trial: boolean;
  replaces?: string;
};

// Creem copies the metadata onto the subscription, so every webhook carries our user id.
export async function createCreemCheckoutUrl(
  user: SessionUser,
  productId: string,
  { plan, trial, replaces }: CheckoutOptions,
): Promise<string> {
  const success = `${appUrl()}/account?checkout=success&plan=${plan}${trial ? "&trial=1" : ""}`;
  const checkout = await request("checkout", (creem) =>
    creem.checkouts.create({
      productId,
      customer: { email: user.email },
      // Webhooks look the user up by this first, then by billing ids, then by email.
      metadata: { user_id: user.id, ...(replaces ? { [REPLACES_METADATA_KEY]: replaces } : {}) },
      successUrl: success,
    }),
  );
  if (!checkout.checkoutUrl) {
    log.error("billing.provider_failed", "checkout session without a URL", { operation: "checkout" });
    throw new BillingError("provider_error", "Checkout session has no URL");
  }
  return checkout.checkoutUrl;
}

export async function createCreemPortalUrl(customerId: string): Promise<string> {
  const links = await request("portal", (creem) => creem.customers.generateBillingLinks({ customerId }));
  return links.customerPortalLink;
}

export type CreemCancelResult = "cancelled" | "already_ended";

// Cancels right away, not at period end, so nothing is charged again.
export async function cancelCreemSubscription(subscriptionId: string): Promise<CreemCancelResult> {
  try {
    await client().subscriptions.cancel(subscriptionId, { mode: "immediate" });
    return "cancelled";
  } catch (error) {
    if (!(error instanceof CreemError && REFUSED_STATUSES.has(error.statusCode))) {
      throw providerFailure("cancel", error);
    }
  }
  // A cancel that timed out on an earlier try may have gone through, and the webhook saying so may
  // not have arrived yet. Creem's current status decides whether there is still anything to stop.
  const subscription = await request("cancel", (creem) =>
    creem.subscriptions.get(subscriptionId, { retries: READ_RETRY }),
  );
  if (isEndedStatus(subscription.status)) return "already_ended";
  log.error("billing.provider_failed", "cancel refused for a live subscription", {
    operation: "cancel",
    status: subscription.status,
  });
  throw new BillingError("provider_error", "Creem refused to cancel the subscription");
}

// Charges or refunds the difference right away; the plan itself changes with the
// subscription.update webhook. Creem refuses anything not "active", a trial included.
export async function changeCreemPlan(subscriptionId: string, productId: string): Promise<void> {
  await request("change_plan", (creem) =>
    creem.subscriptions.upgrade(subscriptionId, {
      productId,
      updateBehavior: "proration-charge-immediately",
    }),
  );
}

export type LiveSubscription = { subscriptionId: string; customerId: string; status: string };

export type SubscriptionLookup = {
  email: string;
  customerId: string | null;
  // Still counts after a plan change moved it to another product.
  subscriptionId: string | null;
};

const idOf = (ref: string | { id: string }) => (typeof ref === "string" ? ref : ref.id);

// On the stored customer and the customer with their email: stored ids miss a payment whose webhook
// hasn't landed and an earlier subscription a newer one replaced in our row.
export async function findLiveSubscriptions(lookup: SubscriptionLookup): Promise<LiveSubscription[]> {
  const productIds = new Set(paidProductIds());
  const email = normalizeEmail(lookup.email);
  const customerIds = new Set<string>();
  if (lookup.customerId) customerIds.add(lookup.customerId);
  const byEmail = await customerWithEmail(email);
  if (byEmail) customerIds.add(byEmail);

  const live = new Map<string, LiveSubscription>();
  for (const customerId of customerIds) {
    const page = await request("lookup", (creem) =>
      creem.customers.listSubscriptions(customerId, 1, SUBSCRIPTION_PAGE_SIZE, { retries: READ_RETRY }),
    );
    for (const subscription of page.items) {
      const { id: subscriptionId, status } = subscription;
      const ours = subscriptionId === lookup.subscriptionId || productIds.has(idOf(subscription.product));
      if (ours && idOf(subscription.customer) === customerId && isLiveStatus(status)) {
        live.set(subscriptionId, { subscriptionId, customerId, status });
      }
    }
  }
  return [...live.values()];
}

// Exact matches only: a near match is someone else's billing. No customer yet is a 404.
async function customerWithEmail(email: string): Promise<string | null> {
  try {
    const customer = await client().customers.retrieve(undefined, email, { retries: READ_RETRY });
    return normalizeEmail(customer.email) === email ? customer.id : null;
  } catch (error) {
    if (error instanceof CreemError && error.statusCode === 404) return null;
    throw providerFailure("lookup", error);
  }
}

async function request<T>(operation: Operation, send: (creem: Creem) => Promise<T>): Promise<T> {
  try {
    return await send(client());
  } catch (error) {
    throw providerFailure(operation, error);
  }
}

function providerFailure(operation: Operation, error: unknown): BillingError {
  if (error instanceof BillingError) return error;
  const body = errorBody(error);
  log.error("billing.provider_failed", failureKind(error) ?? error, {
    operation,
    traceId: body.traceId,
    providerCode: body.code,
  });
  // Creem answered and said no: nothing changed, and "couldn't reach" would be untrue.
  if (isRefusal(error)) {
    return new BillingError("refused", `Creem refused the ${operation} request`, {
      operation,
      providerStatus: error.statusCode,
      providerCode: body.code,
    });
  }
  return new BillingError("provider_error", `Creem ${operation} request failed`, { operation });
}

function isRefusal(error: unknown): error is CreemError {
  return (
    error instanceof CreemError &&
    !(error instanceof ResponseValidationError) &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  );
}

// Instead of the SDK's message, which embeds the raw response body and may echo the customer's
// email.
function failureKind(error: unknown): string | null {
  if (error instanceof RequestTimeoutError) return "timeout";
  if (error instanceof ConnectionError) return "network";
  // Also a CreemError: Creem answered with a shape the SDK doesn't know (e.g. a new status).
  if (error instanceof ResponseValidationError) return "unexpected_response";
  if (error instanceof CreemError) return `http_${error.statusCode}`;
  return null;
}

const ERROR_CODE = /^[a-z0-9_]{1,64}$/;

// trace_id is what Creem support asks for; neither field holds anything about the customer.
function errorBody(error: unknown): { traceId?: string; code?: string } {
  if (!(error instanceof CreemError) || error instanceof ResponseValidationError) return {};
  try {
    const body: unknown = JSON.parse(error.body);
    if (typeof body !== "object" || body === null) return {};
    const traceId =
      "trace_id" in body && typeof body.trace_id === "string"
        ? body.trace_id.slice(0, 64)
        : undefined;
    const code =
      "code" in body && typeof body.code === "string" && ERROR_CODE.test(body.code)
        ? body.code
        : undefined;
    return { traceId, code };
  } catch {
    return {};
  }
}
