import { createHmac } from "node:crypto";
import { vi } from "vitest";

// Tests only. A stand-in for Creem's API (the official SDK calls global fetch, so swapping fetch is
// enough) and for its webhook signatures. Responses carry just the fields the SDK requires, in
// the shapes docs.creem.io shows.

const AT = "2026-11-08T10:00:00.000Z";

export type FakeCustomer = { id: string; email: string };
export type FakeSubscription = { id: string; customer: string; product: string; status: string };
export type FakeCall = { method: string; path: string; query: URLSearchParams; body: unknown };

export type FakeCreem = {
  customers: FakeCustomer[];
  subscriptions: FakeSubscription[];
  calls: FakeCall[];
  /** Answers this "METHOD /path" with the status `times` times, e.g. "POST /v1/subscriptions/sub_1/cancel". */
  failNext: (route: string, status: number, times?: number) => void;
  /** Every call to this "METHOD /path" (or its path prefix). */
  callsTo: (route: string) => FakeCall[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function subscriptionEntity(subscription: FakeSubscription) {
  return {
    id: subscription.id,
    mode: "test",
    object: "subscription",
    product: subscription.product,
    customer: subscription.customer,
    collection_method: "charge_automatically",
    status: subscription.status,
    created_at: AT,
    updated_at: AT,
  };
}

function customerEntity(customer: FakeCustomer) {
  return {
    id: customer.id,
    mode: "test",
    object: "customer",
    email: customer.email,
    country: null,
    created_at: AT,
    updated_at: AT,
  };
}

/** Swaps fetch for a fake Creem API. Undo with vi.unstubAllGlobals() (or vi.restoreAllMocks). */
export function installFakeCreem(): FakeCreem {
  const failures = new Map<string, { status: number; left: number }>();
  let checkouts = 0;
  const fake: FakeCreem = {
    customers: [],
    subscriptions: [],
    calls: [],
    failNext: (route, status, times = 1) => failures.set(route, { status, left: times }),
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
      fake.calls.push({ method: request.method, path: url.pathname, query: url.searchParams, body });
      const route = `${request.method} ${url.pathname}`;
      const failure = failures.get(route);
      if (failure) {
        failure.left -= 1;
        if (failure.left <= 0) failures.delete(route);
        return json(
          { trace_id: "trace-test", status: failure.status, error: "Refused", message: ["no"] },
          failure.status,
        );
      }
      return answer(route, url, body as Record<string, unknown> | undefined);
    }),
  );

  function answer(route: string, url: URL, body: Record<string, unknown> | undefined): Response {
    if (route === "POST /v1/checkouts") {
      checkouts += 1;
      return json({
        id: `ch_${checkouts}`,
        mode: "test",
        object: "checkout",
        status: "pending",
        product: body?.product_id,
        units: 1,
        checkout_url: `https://checkout.creem.test/ch_${checkouts}`,
        metadata: body?.metadata,
      });
    }
    if (route === "POST /v1/customers/billing") {
      return json({ customer_portal_link: `https://creem.test/portal/${String(body?.customer_id)}` });
    }
    if (route === "GET /v1/customers") {
      const email = url.searchParams.get("email");
      const customer = fake.customers.find((candidate) => candidate.email === email);
      return customer ? json(customerEntity(customer)) : json({ status: 404, error: "Not Found" }, 404);
    }
    const listed = /^GET \/v1\/customers\/([^/]+)\/subscriptions$/.exec(route);
    if (listed) {
      const items = fake.subscriptions.filter((subscription) => subscription.customer === listed[1]);
      return json({
        items: items.map(subscriptionEntity),
        pagination: { total_records: items.length, total_pages: 1, current_page: 1, next_page: null, prev_page: null },
      });
    }
    if (route === "GET /v1/subscriptions") {
      const subscription = fake.subscriptions.find(
        (candidate) => candidate.id === url.searchParams.get("subscription_id"),
      );
      return subscription ? json(subscriptionEntity(subscription)) : json({ status: 404 }, 404);
    }
    const acted = /^POST \/v1\/subscriptions\/([^/]+)\/(cancel|upgrade)$/.exec(route);
    if (acted) {
      const subscription = fake.subscriptions.find((candidate) => candidate.id === acted[1]);
      if (!subscription) return json({ status: 404 }, 404);
      if (acted[2] === "cancel") subscription.status = "canceled";
      else subscription.product = String(body?.product_id);
      return json(subscriptionEntity(subscription));
    }
    return json({ status: 404, error: `No fake for ${route}` }, 404);
  }

  return fake;
}

/** The creem-signature header Creem sends: HMAC-SHA256 of the raw body with the webhook secret. */
export function creemSignature(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export type WebhookSubscription = {
  id?: string;
  status?: string;
  product?: string;
  customer?: { id: string; email: string };
  metadata?: Record<string, unknown>;
  current_period_end_date?: string;
  next_transaction_date?: string;
};

/** A subscription.* event as docs.creem.io shows it, with only the fields we read changed. */
export function subscriptionEvent(
  eventType: string,
  subscription: WebhookSubscription = {},
  event: { id?: string; createdAt?: number } = {},
): string {
  return JSON.stringify({
    id: event.id ?? `evt_${crypto.randomUUID()}`,
    eventType,
    created_at: event.createdAt ?? Date.now(),
    object: {
      id: subscription.id ?? "sub_1",
      object: "subscription",
      product: {
        id: subscription.product ?? "prod_pro_month",
        object: "product",
        billing_type: "recurring",
        billing_period: "every-month",
      },
      customer: { object: "customer", ...(subscription.customer ?? { id: "cust_1", email: "ada@example.com" }) },
      collection_method: "charge_automatically",
      status: subscription.status ?? "active",
      current_period_start_date: "2026-11-08T10:00:00.000Z",
      current_period_end_date: subscription.current_period_end_date ?? "2026-12-08T10:00:00.000Z",
      ...(subscription.next_transaction_date
        ? { next_transaction_date: subscription.next_transaction_date }
        : {}),
      canceled_at: null,
      metadata: subscription.metadata ?? {},
      mode: "test",
    },
  });
}
