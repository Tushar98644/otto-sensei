import { vi } from "vitest";
import type { DodoIdKind } from "./dodo-status";

const AT = "2026-11-08T10:00:00.000Z";
const TRIAL_END = "2026-11-11T10:00:00.000Z";
const NEXT = "2026-12-08T10:00:00.000Z";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export type DodoStatus =
  "pending" | "active" | "on_hold" | "paused" | "cancelled" | "failed" | "expired" | "past_due";

const ENDED: ReadonlySet<DodoStatus> = new Set(["cancelled", "expired", "failed"]);

// Shaped like the ids in Dodo's docs (the prefix and 21 letters or digits) until the spike captures real ones.
export function dodoId(kind: DodoIdKind, name: string | number): string {
  return `${kind}_${String(name).padStart(21, "0")}`;
}

export type FakeDodoCustomer = { id: string; email: string };
export type FakeDodoSubscription = {
  id: string;
  customer: string;
  product: string;
  status: DodoStatus;
  trial?: boolean;
  cancelAtNextBillingDate?: boolean;
  metadata?: Record<string, string | number | boolean>;
};
export type FakeDodoPayment = {
  id: string;
  subscription: string | null;
  status: "succeeded" | "failed" | "processing" | "cancelled";
  customer?: string;
  chargeType?: "new" | "renewal" | "plan_change" | "on_demand" | null;
  refunded?: boolean;
  metadata?: Record<string, string | number | boolean>;
  // A one-time payment's product ids.
  productCart?: string[];
};
export type FakeDodoRefund = { id: string; payment: string; reason: string | null };
export type FakeDodoCheckout = { id: string; body: Record<string, unknown> };
export type FakeDodoCall = {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Headers;
  body: unknown;
};

// status 0 fails the request as a network error and -1 as a timeout, before any answer.
type Failure = { status: number; left: number; code?: string; message?: string };

export type FakeDodo = {
  customers: FakeDodoCustomer[];
  subscriptions: FakeDodoSubscription[];
  payments: FakeDodoPayment[];
  refunds: FakeDodoRefund[];
  checkouts: FakeDodoCheckout[];
  calls: FakeDodoCall[];
  failNext: (
    route: string,
    status: number,
    times?: number,
    code?: string,
    message?: string,
  ) => void;
  callsTo: (route: string) => FakeDodoCall[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function defaultCode(status: number): string {
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "INSUFFICIENT_PERMISSION";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "TOO_MANY_REQUESTS";
  return "INVALID_REQUEST_PARAMETERS";
}

const dodoError = (status: number, code = defaultCode(status), message = "Refused") =>
  json({ code, message }, status);

export function dodoSubscriptionEntity(
  subscription: FakeDodoSubscription,
  email = "buyer@example.com",
) {
  const trial = subscription.trial === true;
  return {
    subscription_id: subscription.id,
    status: subscription.status,
    product_id: subscription.product,
    quantity: 1,
    customer: { customer_id: subscription.customer, email, name: "Test Buyer" },
    metadata: subscription.metadata ?? {},
    created_at: AT,
    previous_billing_date: AT,
    next_billing_date: trial ? TRIAL_END : NEXT,
    trial_period_days: trial ? 3 : 0,
    trial_amount: trial ? 100 : null,
    cancel_at_next_billing_date: subscription.cancelAtNextBillingDate ?? false,
    cancelled_at: ENDED.has(subscription.status) ? AT : null,
    currency: "USD",
    recurring_pre_tax_amount: 1500,
    tax_inclusive: false,
    payment_frequency_count: 1,
    payment_frequency_interval: "Month",
    subscription_period_count: 20,
    subscription_period_interval: "Year",
    on_demand: false,
    has_payment_method: true,
    billing: { country: "US" },
    scheduled_change: null,
  };
}

function paymentEntity(payment: FakeDodoPayment) {
  return {
    payment_id: payment.id,
    status: payment.status,
    subscription_id: payment.subscription,
    subscription_ids: payment.subscription ? [payment.subscription] : [],
    charge_type: payment.chargeType ?? "new",
    customer: {
      customer_id: payment.customer ?? dodoId("cus", "buyer"),
      email: "buyer@example.com",
      name: "Test Buyer",
    },
    metadata: payment.metadata ?? {},
    product_cart: payment.productCart?.map((id) => ({ product_id: id, quantity: 1 })) ?? null,
    total_amount: 100,
    currency: "USD",
    refund_status: payment.refunded ? "full" : null,
    created_at: AT,
  };
}

function pageSize(url: URL): number {
  const asked = Number(url.searchParams.get("page_size"));
  return Number.isInteger(asked) && asked > 0 ? Math.min(asked, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
}

export function installFakeDodo(): FakeDodo {
  const failures = new Map<string, Failure>();
  let sessions = 0;
  let refunds = 0;
  const fake: FakeDodo = {
    customers: [],
    subscriptions: [],
    payments: [],
    refunds: [],
    checkouts: [],
    calls: [],
    failNext: (route, status, times = 1, code, message) =>
      failures.set(route, { status, left: times, code, message }),
    callsTo: (route) =>
      fake.calls.filter((call) => `${call.method} ${call.path}`.startsWith(route)),
  };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      const url = new URL(request.url);
      const text = request.method === "GET" ? "" : await request.text();
      const body: unknown = text ? JSON.parse(text) : undefined;
      fake.calls.push({
        method: request.method,
        path: url.pathname,
        query: url.searchParams,
        headers: request.headers,
        body,
      });
      const route = `${request.method} ${url.pathname}`;
      const failure = failures.get(route);
      if (failure) {
        failure.left -= 1;
        if (failure.left <= 0) failures.delete(route);
        if (failure.status === 0) throw new TypeError("fetch failed");
        if (failure.status === -1) {
          throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
        }
        return dodoError(failure.status, failure.code, failure.message);
      }
      return answer(route, url, body as Record<string, unknown> | undefined);
    }),
  );

  const subscription = (id: string | undefined) =>
    fake.subscriptions.find((candidate) => candidate.id === id);
  const emailOf = (customerId: string) =>
    fake.customers.find((customer) => customer.id === customerId)?.email;
  const entity = (found: FakeDodoSubscription) =>
    dodoSubscriptionEntity(found, emailOf(found.customer));

  function answer(route: string, url: URL, body: Record<string, unknown> | undefined): Response {
    if (route === "GET /customers") {
      const email = (url.searchParams.get("email") ?? "").toLowerCase();
      // Dodo doesn't say whether its email filter is exact, so the fake matches loosely.
      const items = fake.customers
        .filter((customer) => customer.email.toLowerCase().includes(email))
        .map((customer) => ({
          customer_id: customer.id,
          email: customer.email,
          name: "Test Buyer",
          business_id: "bus_test",
          created_at: AT,
        }));
      return json({ items: items.slice(0, pageSize(url)) });
    }
    const portal = /^POST \/customers\/([^/]+)\/customer-portal\/session$/.exec(route);
    if (portal) return json({ link: `https://customer-portal.dodo.test/${portal[1]}` });
    if (route === "GET /subscriptions") {
      const customer = url.searchParams.get("customer_id");
      const status = url.searchParams.get("status");
      const items = fake.subscriptions
        .filter((candidate) => !customer || candidate.customer === customer)
        .filter((candidate) => !status || candidate.status === status)
        .map(entity);
      return json({ items: items.slice(0, pageSize(url)) });
    }
    const read = /^GET \/subscriptions\/([^/]+)$/.exec(route);
    if (read) {
      const found = subscription(read[1]);
      return found ? json(entity(found)) : dodoError(404, "NOT_FOUND", "Subscription not found");
    }
    const patched = /^PATCH \/subscriptions\/([^/]+)$/.exec(route);
    if (patched) {
      const found = subscription(patched[1]);
      if (!found) return dodoError(404, "NOT_FOUND", "Subscription not found");
      if (ENDED.has(found.status)) return dodoError(422, "SUBSCRIPTION_INACTIVE");
      if (body?.status === "cancelled") {
        found.status = "cancelled";
        found.cancelAtNextBillingDate = false;
      } else if (typeof body?.cancel_at_next_billing_date === "boolean") {
        found.cancelAtNextBillingDate = body.cancel_at_next_billing_date;
      }
      return json(entity(found));
    }
    const changed = /^POST \/subscriptions\/([^/]+)\/change-plan$/.exec(route);
    if (changed) {
      const found = subscription(changed[1]);
      if (!found) return dodoError(404, "NOT_FOUND", "Subscription not found");
      if (found.status !== "active") {
        return dodoError(422, "INACTIVE_SUBSCRIPTION_PLAN_CHANGE_NOT_SUPPORTED");
      }
      if (found.cancelAtNextBillingDate) {
        return dodoError(409, "PLAN_CHANGE_NOT_ALLOWED_FOR_SCHEDULED_CANCELLATION");
      }
      found.product = String(body?.product_id);
      if (body?.proration_billing_mode === "full_immediately") found.trial = false;
      return new Response(null, { status: 200 });
    }
    if (route === "POST /checkouts") {
      sessions += 1;
      const id = `cks_${String(sessions).padStart(21, "0")}`;
      fake.checkouts.push({ id, body: body ?? {} });
      return json({
        session_id: id,
        checkout_url: `https://test.checkout.dodopayments.com/session/${id}`,
      });
    }
    if (route === "GET /payments") {
      const subscriptionId = url.searchParams.get("subscription_id");
      const status = url.searchParams.get("status");
      const items = fake.payments
        .filter((payment) => !subscriptionId || payment.subscription === subscriptionId)
        .filter((payment) => !status || payment.status === status)
        .map(paymentEntity);
      return json({ items: items.slice(0, pageSize(url)) });
    }
    const onePayment = /^GET \/payments\/([^/]+)$/.exec(route);
    if (onePayment) {
      const found = fake.payments.find((candidate) => candidate.id === onePayment[1]);
      return found ? json(paymentEntity(found)) : dodoError(404, "NOT_FOUND", "Payment not found");
    }
    if (route === "POST /refunds") {
      const payment = fake.payments.find((candidate) => candidate.id === body?.payment_id);
      if (!payment) return dodoError(404, "NOT_FOUND", "Payment not found");
      if (payment.status !== "succeeded") return dodoError(422, "PAYMENT_NOT_SUCCEEDED");
      if (payment.refunded) {
        return dodoError(422, "PAYMENT_ALREADY_REFUNDED", "This payment has already been refunded");
      }
      refunds += 1;
      payment.refunded = true;
      const refund: FakeDodoRefund = {
        id: dodoId("ref", refunds),
        payment: payment.id,
        reason: typeof body?.reason === "string" ? body.reason : null,
      };
      fake.refunds.push(refund);
      return json({
        refund_id: refund.id,
        payment_id: refund.payment,
        status: "succeeded",
        is_partial: false,
        amount: 100,
        currency: "USD",
        reason: refund.reason,
        metadata: {},
        created_at: AT,
      });
    }
    return dodoError(404, "NOT_FOUND", `No fake for ${route}`);
  }

  return fake;
}
