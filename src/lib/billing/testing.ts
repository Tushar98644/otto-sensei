import { createHmac } from "node:crypto";
import { vi } from "vitest";
import type { PaddleSubscription } from "./paddle";

const AT = "2026-11-08T10:00:00.000Z";
const NEXT = "2026-12-08T10:00:00.000Z";
const TRIAL_END = "2026-11-11T10:00:00.000Z";

type Status = PaddleSubscription["status"];

export type FakeCustomer = { id: string; email: string };
export type FakeSubscription = {
  id: string;
  customer: string;
  price: string;
  status: Status;
  scheduledChange?: PaddleSubscription["scheduled_change"];
  customData?: Record<string, unknown> | null;
};
export type FakeCall = {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Headers;
  body: unknown;
};

// status 0 fails the request as a network error, before any answer.
type Failure = { status: number; left: number; code?: string; detail?: string };

export type FakePaddle = {
  customers: FakeCustomer[];
  subscriptions: FakeSubscription[];
  calls: FakeCall[];
  failNext: (route: string, status: number, times?: number, code?: string, detail?: string) => void;
  callsTo: (route: string) => FakeCall[];
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const meta = { request_id: "req-test" };

const paddleError = (status: number, code: string, detail = "Refused") =>
  json({ error: { type: "request_error", code, detail }, meta }, status);

function subscriptionEntity(subscription: FakeSubscription) {
  const ended = subscription.status === "canceled";
  const cancelling = subscription.scheduledChange?.action === "cancel";
  return {
    id: subscription.id,
    status: subscription.status,
    customer_id: subscription.customer,
    address_id: "add_test",
    currency_code: "USD",
    collection_mode: "automatic",
    created_at: AT,
    updated_at: AT,
    started_at: AT,
    first_billed_at: subscription.status === "trialing" ? null : AT,
    next_billed_at: ended || cancelling ? null : subscription.status === "trialing" ? TRIAL_END : NEXT,
    canceled_at: ended ? AT : null,
    current_billing_period: ended
      ? null
      : { starts_at: AT, ends_at: subscription.status === "trialing" ? TRIAL_END : NEXT },
    billing_cycle: { interval: "month", frequency: 1 },
    scheduled_change: subscription.scheduledChange ?? null,
    custom_data: subscription.customData ?? null,
    items: [
      {
        status: "active",
        quantity: 1,
        recurring: true,
        trial_dates:
          subscription.status === "trialing" ? { starts_at: AT, ends_at: TRIAL_END } : null,
        price: { id: subscription.price, product_id: "pro_test" },
      },
    ],
  };
}

export function installFakePaddle(): FakePaddle {
  const failures = new Map<string, Failure>();
  let created = 0;
  let transactions = 0;
  let sessions = 0;
  const fake: FakePaddle = {
    customers: [],
    subscriptions: [],
    calls: [],
    failNext: (route, status, times = 1, code, detail) =>
      failures.set(route, { status, left: times, code, detail }),
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
        return paddleError(failure.status, failure.code ?? "bad_request", failure.detail);
      }
      return answer(route, url, body as Record<string, unknown> | undefined);
    }),
  );

  const subscription = (id: string | undefined) =>
    fake.subscriptions.find((candidate) => candidate.id === id);

  function answer(route: string, url: URL, body: Record<string, unknown> | undefined): Response {
    if (route === "GET /customers") {
      const emails = (url.searchParams.get("email") ?? "").split(",");
      const data = fake.customers.filter((customer) => emails.includes(customer.email));
      return json({ data, meta: { ...meta, pagination: { per_page: 50, has_more: false } } });
    }
    if (route === "POST /customers") {
      const email = String(body?.email);
      const taken = fake.customers.find((customer) => customer.email === email);
      if (taken) {
        return paddleError(
          409,
          "customer_already_exists",
          `customer email conflicts with customer of id ${taken.id}`,
        );
      }
      created += 1;
      const customer = { id: `ctm_${String(created).padStart(26, "0")}`, email };
      fake.customers.push(customer);
      return json({ data: { ...customer, status: "active" }, meta }, 201);
    }
    const customer = /^GET \/customers\/([^/]+)$/.exec(route);
    if (customer) {
      const found = fake.customers.find((candidate) => candidate.id === customer[1]);
      return found ? json({ data: found, meta }) : paddleError(404, "entity_not_found");
    }
    const portal = /^POST \/customers\/([^/]+)\/portal-sessions$/.exec(route);
    if (portal) {
      sessions += 1;
      return json(
        {
          data: {
            id: `cpls_${sessions}`,
            customer_id: portal[1],
            urls: { general: { overview: `https://customer-portal.paddle.test/${portal[1]}` } },
          },
          meta,
        },
        201,
      );
    }
    if (route === "GET /subscriptions") {
      const customers = (url.searchParams.get("customer_id") ?? "").split(",");
      const statuses = url.searchParams.get("status")?.split(",");
      const data = fake.subscriptions
        .filter((candidate) => customers.includes(candidate.customer))
        .filter((candidate) => !statuses || statuses.includes(candidate.status))
        .map(subscriptionEntity);
      return json({ data, meta: { ...meta, pagination: { per_page: 200, has_more: false } } });
    }
    const read = /^GET \/subscriptions\/([^/]+)$/.exec(route);
    if (read) {
      const found = subscription(read[1]);
      return found ? json({ data: subscriptionEntity(found), meta }) : paddleError(404, "entity_not_found");
    }
    const changed = /^PATCH \/subscriptions\/([^/]+)$/.exec(route);
    if (changed) {
      const found = subscription(changed[1]);
      if (!found) return paddleError(404, "entity_not_found");
      if (found.status === "canceled") return paddleError(400, "subscription_update_when_canceled");
      const items = body?.items as { price_id: string }[] | undefined;
      found.price = items?.[0]?.price_id ?? found.price;
      return json({ data: subscriptionEntity(found), meta });
    }
    const cancelled = /^POST \/subscriptions\/([^/]+)\/cancel$/.exec(route);
    if (cancelled) {
      const found = subscription(cancelled[1]);
      if (!found) return paddleError(404, "entity_not_found");
      if (found.status === "canceled") return paddleError(400, "subscription_update_when_canceled");
      if (body?.effective_from === "immediately") {
        found.status = "canceled";
        found.scheduledChange = null;
      } else {
        found.scheduledChange = { action: "cancel", effective_at: NEXT };
      }
      return json({ data: subscriptionEntity(found), meta });
    }
    if (route === "POST /transactions") {
      transactions += 1;
      const id = `txn_${transactions}`;
      return json(
        {
          data: {
            id,
            status: "draft",
            customer_id: body?.customer_id,
            custom_data: body?.custom_data,
            items: body?.items,
            checkout: { url: `https://otto.example/checkout?_ptxn=${id}` },
          },
          meta,
        },
        201,
      );
    }
    return paddleError(404, "not_found", `No fake for ${route}`);
  }

  return fake;
}

export function paddleSignature(
  body: string,
  secret: string,
  ts = Math.floor(Date.now() / 1000),
): string {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

export function subscriptionEvent(
  eventType: string,
  subscription: Partial<FakeSubscription> = {},
  event: { id?: string; occurredAt?: string } = {},
): string {
  return JSON.stringify({
    event_id: event.id ?? `evt_${crypto.randomUUID()}`,
    event_type: eventType,
    occurred_at: event.occurredAt ?? new Date().toISOString(),
    notification_id: `ntf_${crypto.randomUUID()}`,
    data: subscriptionEntity({
      id: "sub_1",
      customer: "ctm_1",
      price: "pri_pro_month",
      status: "active",
      ...subscription,
    }),
  });
}
