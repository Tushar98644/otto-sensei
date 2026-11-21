import { z } from "zod";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { normalizeEmail } from "@/lib/auth/policy";
import { appUrl, env, type Env } from "@/lib/env";
import { log } from "@/lib/log";
import { signBillingId } from "./billing-sign";
import {
  DodoSubscriptionSchema,
  internalStatus,
  isDodoId,
  type DodoSubscription,
} from "./dodo-status";
import { BillingError, type BillingRefusalReason } from "./errors";

type DodoEnvironment = Env["DODO_ENVIRONMENT"];

const API_URL: Record<DodoEnvironment, string> = {
  test: "https://test.dodopayments.com",
  live: "https://live.dodopayments.com",
};

const KEY_PREFIX: Record<DodoEnvironment, string> = { test: "dodo_test_", live: "dodo_live_" };

const TIMEOUT_MS = 8_000;
// Only reads retry, and briefly: Dodo has no idempotency keys, so a retried write could act twice.
const READ_RETRY_DELAYS_MS = [250, 750];
const READ_RETRY_BUDGET_MS = 2_000;

const PAGE_SIZE = 100;
const CUSTOMER_LIMIT = 5;
const LIVE_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "active",
  "past_due",
  "on_hold",
  "paused",
]);
const REFUSED_STATUSES: ReadonlySet<number> = new Set([400, 404, 409, 422]);
const RAW_ERROR_CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;
const REQUEST_ID = /^[A-Za-z0-9._:-]{1,64}$/;
const REFUND_REASON = "This account had already used its trial, so the new trial was cancelled.";

const REASON_BY_CODE: ReadonlyMap<string, BillingRefusalReason> = new Map([
  ["pending_plan_change_exists", "busy"],
  ["scheduled_plan_change_exists", "busy"],
  ["plan_change_payment_in_progress", "busy"],
  ["previous_payment_pending", "busy"],
  ["plan_change_not_allowed_for_scheduled_cancellation", "inactive"],
  ["inactive_subscription_plan_change_not_supported", "inactive"],
  ["subscription_inactive", "inactive"],
  ["subscription_expired", "inactive"],
  ["on_hold_plan_change_options_not_supported", "inactive"],
  ["on_hold_plan_change_rate_limited", "inactive"],
  ["customer_has_existing_subscription", "has_subscription"],
  ["unauthorized", "misconfigured"],
  ["insufficient_permission", "misconfigured"],
  ["ip_address_not_allowed", "misconfigured"],
  ["merchant_not_live", "misconfigured"],
  ["business_archived", "misconfigured"],
  ["total_payment_amount_below_minimum_amount", "misconfigured"],
  ["not_found", "not_found"],
  ["too_many_requests", "rate_limited"],
]);

// Each means the payment is refunded or a refund is under way: a second request would add nothing.
const ALREADY_REFUNDED: ReadonlySet<string> = new Set([
  "payment_already_refunded",
  "payment_has_been_refunded",
  "existing_refund_request_processing",
  "nothing_to_refund",
]);

export const REPLACES_METADATA_KEY = "replaces_subscription_id";

export function dodoKeyMatchesEnvironment(key: string, environment: DodoEnvironment): boolean {
  return key.startsWith(KEY_PREFIX[environment]);
}

type Operation = "checkout" | "portal" | "cancel" | "lookup" | "change_plan" | "refund";

const Page = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item) });

const SubscriptionPage = Page(DodoSubscriptionSchema);
const CustomerPage = Page(z.object({ customer_id: z.string(), email: z.string().nullish() }));
const PaymentPage = Page(
  z.object({
    payment_id: z.string(),
    status: z.string().nullish(),
    subscription_id: z.string().nullish(),
    subscription_ids: z.array(z.string()).nullish(),
  }),
);
const CheckoutResponse = z.object({ checkout_url: z.string().nullish() });
const PortalResponse = z.object({ link: z.string().nullish() });
const Anything = z.unknown();
const ErrorBody = z.object({ code: z.unknown() });

type FailureInfo = { status?: number; code?: string; requestId?: string };

class DodoFailure extends Error {
  constructor(
    readonly kind: string,
    readonly info: FailureInfo = {},
  ) {
    super(kind);
    this.name = "DodoFailure";
  }
}

type Call = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
};

async function send<T>(call: Call, schema: z.ZodType<T>): Promise<T> {
  const { DODO_API_KEY: key, DODO_ENVIRONMENT: environment } = env();
  if (!key) throw new BillingError("unavailable", "DODO_API_KEY is not set");
  // A key of the other mode gets a 401 on every call, so nothing is sent with it.
  if (!dodoKeyMatchesEnvironment(key, environment)) {
    throw new BillingError("unavailable", `DODO_API_KEY is not a ${environment} mode key`);
  }
  const url = new URL(call.path, API_URL[environment]);
  for (const [name, value] of Object.entries(call.query ?? {})) url.searchParams.set(name, value);
  const init: RequestInit = {
    method: call.method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(call.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(call.body === undefined ? {} : { body: JSON.stringify(call.body) }),
  };
  const delays = call.method === "GET" ? [...READ_RETRY_DELAYS_MS] : [];
  const started = Date.now();
  for (;;) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      const delay = timedOut ? null : nextDelay(delays, started);
      if (delay !== null) {
        await sleep(delay);
        continue;
      }
      throw new DodoFailure(timedOut ? "timeout" : "network");
    }
    if (response.ok) return parse(response, schema);
    const busy = response.status === 429 || response.status >= 500;
    const delay = busy ? nextDelay(delays, started) : null;
    if (delay !== null) {
      await response.body?.cancel();
      await sleep(delay);
      continue;
    }
    throw new DodoFailure(`http_${response.status}`, await failureInfo(response));
  }
}

function nextDelay(delays: number[], started: number): number | null {
  const delay = delays[0];
  if (delay === undefined || Date.now() - started + delay > READ_RETRY_BUDGET_MS) return null;
  delays.shift();
  return delay;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (parsed.success) return parsed.data;
  throw new DodoFailure("unexpected_response", requestIdOf(response));
}

// Dodo documents no request id, so the usual headers are read when present.
function requestIdOf(response: Response): { requestId?: string } {
  const id = response.headers.get("x-request-id") ?? response.headers.get("request-id");
  return id && REQUEST_ID.test(id) ? { requestId: id } : {};
}

// The body's message can echo the customer's email, so only its code is kept.
async function failureInfo(response: Response): Promise<FailureInfo> {
  const body: unknown = await response.json().catch(() => undefined);
  const parsed = ErrorBody.safeParse(body);
  const code = parsed.success ? normalizedCode(parsed.data.code) : undefined;
  return { status: response.status, ...requestIdOf(response), ...(code ? { code } : {}) };
}

// Dodo writes codes in upper snake case or camel case; both become lower snake case.
function normalizedCode(code: unknown): string | undefined {
  if (typeof code !== "string" || !RAW_ERROR_CODE.test(code)) return undefined;
  const snake = code
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase()
    .replace(/_+/g, "_");
  return ERROR_CODE.test(snake) ? snake : undefined;
}

function refusalReason(status: number, code: string | undefined): BillingRefusalReason | undefined {
  const known = code === undefined ? undefined : REASON_BY_CODE.get(code);
  if (known) return known;
  if (code?.includes("declin")) return "declined";
  if (status === 401 || status === 403) return "misconfigured";
  if (status === 404) return "not_found";
  if (status === 429) return "rate_limited";
  return undefined;
}

async function request<T>(operation: Operation, call: Call, schema: z.ZodType<T>): Promise<T> {
  try {
    return await send(call, schema);
  } catch (error) {
    throw providerFailure(operation, error);
  }
}

function providerFailure(operation: Operation, error: unknown): BillingError {
  if (error instanceof BillingError) return error;
  if (!(error instanceof DodoFailure)) {
    log.error("billing.provider_failed", error, { operation });
    return new BillingError("provider_error", `Dodo ${operation} request failed`, { operation });
  }
  const { status, code, requestId } = error.info;
  log.error("billing.provider_failed", error.kind, {
    operation,
    status,
    requestId,
    providerCode: code,
  });
  if (status !== undefined && status >= 400 && status < 500) {
    const reason = refusalReason(status, code);
    return new BillingError("refused", `Dodo refused the ${operation} request`, {
      operation,
      providerStatus: status,
      ...(code ? { providerCode: code } : {}),
      ...(reason ? { reason } : {}),
    });
  }
  return new BillingError("provider_error", `Dodo ${operation} request failed`, { operation });
}

const segment = (id: string) => encodeURIComponent(id);

function httpsUrl(value: string | null | undefined): string | null {
  if (!value || !URL.canParse(value)) return null;
  return new URL(value).protocol === "https:" ? value : null;
}

// Only the first page is read, so a full one may hide more.
function warnIfFull(items: readonly unknown[], operation: Operation, list: string): void {
  if (items.length >= PAGE_SIZE) log.warn("billing.page_full", { operation, list });
}

function notASubscription(operation: Operation): BillingError {
  return new BillingError("no_subscription", "Not a Dodo subscription id", { operation });
}

function assertProductId(productId: string): void {
  if (!isDodoId("pdt", productId)) {
    throw new BillingError("unavailable", "The product id is not a Dodo product id (pdt_...)");
  }
}

export async function getSubscription(id: string): Promise<DodoSubscription> {
  return readSubscription(id, "lookup");
}

async function readSubscription(id: string, operation: Operation): Promise<DodoSubscription> {
  if (!isDodoId("sub", id)) throw notASubscription(operation);
  return request(
    operation,
    { method: "GET", path: `/subscriptions/${segment(id)}` },
    DodoSubscriptionSchema,
  );
}

export type CancelOutcome = "cancelled" | "already_ended";

export async function cancelSubscription(
  id: string,
  opts: { immediately: boolean },
): Promise<CancelOutcome> {
  if (!isDodoId("sub", id)) {
    log.warn("billing.cancel_skipped", { operation: "cancel", reason: "not_a_dodo_id" });
    return "already_ended";
  }
  let refused: FailureInfo;
  try {
    await send(
      {
        method: "PATCH",
        path: `/subscriptions/${segment(id)}`,
        body: opts.immediately
          ? { status: "cancelled", cancel_reason: "cancelled_by_merchant" }
          : { cancel_at_next_billing_date: true },
      },
      Anything,
    );
    return "cancelled";
  } catch (error) {
    refused = error instanceof DodoFailure ? error.info : {};
    if (refused.status === undefined || !REFUSED_STATUSES.has(refused.status)) {
      throw providerFailure("cancel", error);
    }
  }
  // Test and live ids look alike, so a 404 may mean this build talks to the other mode.
  if (refused.status === 404) {
    log.error("billing.cancel_not_found", "Dodo has no such subscription", {
      operation: "cancel",
      subscriptionId: id,
      environment: env().DODO_ENVIRONMENT,
      requestId: refused.requestId,
    });
  }
  // An earlier timed-out cancel may have gone through before its webhook: Dodo's status decides.
  const subscription = await readSubscription(id, "cancel");
  if (internalStatus(subscription) === "canceled" || subscription.status === "failed") {
    return "already_ended";
  }
  // Dodo may refuse over a cancel already set for the period end; it can't renew either way.
  if (subscription.cancel_at_next_billing_date === true) {
    log.info("billing.cancel_already_scheduled", {
      operation: "cancel",
      status: subscription.status,
    });
    return "already_ended";
  }
  log.error("billing.provider_failed", "cancel refused for a live subscription", {
    operation: "cancel",
    status: subscription.status,
    providerStatus: refused.status,
    providerCode: refused.code,
  });
  throw new BillingError("provider_error", "Dodo refused to cancel the subscription", {
    operation: "cancel",
  });
}

export function endSubscription(id: string): Promise<CancelOutcome> {
  return cancelSubscription(id, { immediately: true });
}

export async function changePlan(
  subscriptionId: string,
  productId: string,
  opts: { fromTrial: boolean },
): Promise<void> {
  if (!isDodoId("sub", subscriptionId)) throw notASubscription("change_plan");
  assertProductId(productId);
  await request(
    "change_plan",
    {
      method: "POST",
      path: `/subscriptions/${segment(subscriptionId)}/change-plan`,
      body: {
        product_id: productId,
        quantity: 1,
        // keep_cycle charges the difference now and keeps the renewal date; a trial ends, paid in full.
        proration_billing_mode: opts.fromTrial
          ? "full_immediately"
          : "prorated_immediately_keep_cycle",
        effective_at: "immediately",
        on_payment_failure: "prevent_change",
      },
    },
    Anything,
  );
}

// Exact matches only: a near match is someone else's billing.
export async function customersWithEmail(email: string): Promise<string[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const page = await request(
    "lookup",
    {
      method: "GET",
      path: "/customers",
      query: { email: normalized, page_size: String(PAGE_SIZE) },
    },
    CustomerPage,
  );
  warnIfFull(page.items, "lookup", "customers");
  const ids = page.items
    .filter((customer) => customer.email && normalizeEmail(customer.email) === normalized)
    .map((customer) => customer.customer_id)
    .filter((id) => isDodoId("cus", id));
  return [...new Set(ids)];
}

// Pending is a subscription still being created: a checkout beside it could make a second one.
export async function listLiveSubscriptions(q: {
  customerId?: string | null;
  email?: string | null;
}): Promise<DodoSubscription[]> {
  const customerIds = new Set<string>();
  if (isDodoId("cus", q.customerId)) customerIds.add(q.customerId);
  if (q.email) for (const id of await customersWithEmail(q.email)) customerIds.add(id);
  if (customerIds.size > CUSTOMER_LIMIT) {
    log.warn("billing.customer_limit", { operation: "lookup", customers: customerIds.size });
  }
  const customers = [...customerIds].slice(0, CUSTOMER_LIMIT);
  const pages = await Promise.all(
    customers.map((customerId) =>
      request(
        "lookup",
        {
          method: "GET",
          path: "/subscriptions",
          query: { customer_id: customerId, page_size: String(PAGE_SIZE) },
        },
        SubscriptionPage,
      ),
    ),
  );
  const live = new Map<string, DodoSubscription>();
  pages.forEach((page, index) => {
    warnIfFull(page.items, "lookup", "subscriptions");
    for (const subscription of page.items) {
      if (subscription.customer.customer_id !== customers[index]) continue;
      if (LIVE_STATUSES.has(subscription.status))
        live.set(subscription.subscription_id, subscription);
    }
  });
  return [...live.values()];
}

export type CheckoutInput = {
  userId: string;
  email: string;
  customerId: string | null;
  productId: string;
  plan: PaidPlanId;
  interval: BillingInterval;
  trial: boolean;
  replacesSubscriptionId?: string;
};

export async function createCheckout(input: CheckoutInput): Promise<{ url: string }> {
  const secret = env().BILLING_SIGNING_SECRET;
  if (!secret) throw new BillingError("unavailable", "BILLING_SIGNING_SECRET is not set");
  assertProductId(input.productId);
  const replaces = input.replacesSubscriptionId;
  if (replaces !== undefined && !isDodoId("sub", replaces)) throw notASubscription("checkout");
  const session = await request(
    "checkout",
    {
      method: "POST",
      path: "/checkouts",
      body: {
        product_cart: [{ product_id: input.productId, quantity: 1 }],
        // Only applies with Adaptive Currency on: the checkout opens in USD and the buyer can still switch.
        billing_currency: "USD",
        // With only an email, Dodo attaches its existing customer for that email.
        customer: isDodoId("cus", input.customerId)
          ? { customer_id: input.customerId }
          : { email: normalizeEmail(input.email) },
        metadata: {
          user_id: input.userId,
          user_sig: signBillingId(input.userId, secret),
          plan: input.plan,
          interval: input.interval,
          trial: input.trial ? "true" : "false",
          ...(replaces
            ? { [REPLACES_METADATA_KEY]: replaces, replaces_sig: signBillingId(replaces, secret) }
            : {}),
        },
        return_url: checkoutReturnUrl(input.plan, input.trial),
        cancel_url: `${appUrl()}/account?checkout=cancelled`,
        feature_flags: {
          allow_customer_editing_email: false,
          allow_discount_code: false,
          redirect_immediately: true,
        },
        customization: { theme: "system" },
      },
    },
    CheckoutResponse,
  );
  const url = httpsUrl(session.checkout_url);
  if (!url) {
    log.error("billing.provider_failed", "checkout session without a checkout URL", {
      operation: "checkout",
    });
    throw new BillingError("provider_error", "Dodo returned no checkout URL", {
      operation: "checkout",
    });
  }
  return { url };
}

function checkoutReturnUrl(plan: PaidPlanId, trial: boolean): string {
  const query = new URLSearchParams({ plan });
  if (trial) query.set("trial", "1");
  return `${appUrl()}/api/billing/return?${query}`;
}

export async function portalUrl(customerId: string): Promise<string> {
  if (!isDodoId("cus", customerId)) {
    throw new BillingError("no_subscription", "Not a Dodo customer id", { operation: "portal" });
  }
  const session = await request(
    "portal",
    {
      method: "POST",
      path: `/customers/${segment(customerId)}/customer-portal/session`,
      query: { return_url: `${appUrl()}/account`, send_email: "false" },
    },
    PortalResponse,
  );
  const link = httpsUrl(session.link);
  if (!link) {
    log.error("billing.provider_failed", "portal session without a link", { operation: "portal" });
    throw new BillingError("provider_error", "Dodo returned no portal link", {
      operation: "portal",
    });
  }
  return link;
}

export async function succeededPayments(subscriptionId: string): Promise<string[]> {
  if (!isDodoId("sub", subscriptionId)) throw notASubscription("refund");
  const page = await request(
    "refund",
    {
      method: "GET",
      path: "/payments",
      query: {
        subscription_id: subscriptionId,
        status: "succeeded",
        page_size: String(PAGE_SIZE),
      },
    },
    PaymentPage,
  );
  warnIfFull(page.items, "refund", "payments");
  const ids = page.items
    .filter((payment) => payment.status == null || payment.status === "succeeded")
    .filter((payment) => {
      // A payment Dodo files under another subscription is never refunded for this one.
      const named = [payment.subscription_id, ...(payment.subscription_ids ?? [])].filter(Boolean);
      return named.length === 0 || named.includes(subscriptionId);
    })
    .map((payment) => payment.payment_id)
    .filter((id) => isDodoId("pay", id));
  return [...new Set(ids)];
}

export type RefundOutcome = "refunded" | "already_refunded";

export async function refundPayment(paymentId: string): Promise<RefundOutcome> {
  if (!isDodoId("pay", paymentId)) {
    throw new BillingError("provider_error", "That isn't a Dodo payment id", {
      operation: "refund",
    });
  }
  try {
    await send(
      { method: "POST", path: "/refunds", body: { payment_id: paymentId, reason: REFUND_REASON } },
      Anything,
    );
    return "refunded";
  } catch (error) {
    const code = error instanceof DodoFailure ? error.info.code : undefined;
    if (code === undefined || !ALREADY_REFUNDED.has(code)) throw providerFailure("refund", error);
    log.info("billing.refund_already_done", {
      operation: "refund",
      paymentId,
      providerCode: code,
    });
    return "already_refunded";
  }
}
