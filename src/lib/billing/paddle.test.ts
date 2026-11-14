import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import {
  cancelPaddleSubscription,
  createPaddleCheckout,
  getPaddleSubscription,
  listLivePaddleSubscriptions,
  paddlePortalUrl,
} from "./paddle";
import { installFakePaddle, type FakePaddle } from "./testing";

let paddle: FakePaddle;

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

beforeEach(() => {
  useEnv({ PADDLE_API_KEY: "pdl_sdbx_apikey_test", PADDLE_ENVIRONMENT: undefined });
  paddle = installFakePaddle();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("getPaddleSubscription", () => {
  it("reads the fields the app relies on, with nulls where Paddle has nothing", async () => {
    paddle.subscriptions.push({
      id: "sub_1",
      customer: "ctm_1",
      price: "pri_pro_trial",
      status: "trialing",
      customData: { user_id: "u1" },
    });
    expect(await getPaddleSubscription("sub_1")).toEqual({
      id: "sub_1",
      status: "trialing",
      customer_id: "ctm_1",
      items: [
        {
          price: { id: "pri_pro_trial" },
          trial_dates: { starts_at: "2026-11-08T10:00:00.000Z", ends_at: "2026-11-11T10:00:00.000Z" },
        },
      ],
      scheduled_change: null,
      next_billed_at: "2026-11-11T10:00:00.000Z",
      current_billing_period: {
        starts_at: "2026-11-08T10:00:00.000Z",
        ends_at: "2026-11-11T10:00:00.000Z",
      },
      custom_data: { user_id: "u1" },
    });
  });

  it("is unavailable without an API key, before any request", async () => {
    useEnv({ PADDLE_API_KEY: undefined });
    await expect(getPaddleSubscription("sub_1")).rejects.toMatchObject({ code: "unavailable" });
    expect(paddle.calls).toEqual([]);
  });

  it("treats an answer it can't read as a provider error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: "sub_1" } })));
    await expect(getPaddleSubscription("sub_1")).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "lookup" },
    });
  });

  it("retries a busy Paddle for up to about two seconds, then reports the refusal", async () => {
    paddle.failNext("GET /subscriptions/sub_1", 429, 5, "too_many_requests");
    const started = Date.now();
    await expect(getPaddleSubscription("sub_1")).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 429, providerCode: "too_many_requests" },
    });
    expect(paddle.callsTo("GET /subscriptions/sub_1")).toHaveLength(3);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("doesn't retry a refusal", async () => {
    await expect(getPaddleSubscription("sub_missing")).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 404, providerCode: "entity_not_found" },
    });
    expect(paddle.calls).toHaveLength(1);
  });
});

describe("cancelPaddleSubscription", () => {
  it("cancels right away or at the end of the period", async () => {
    paddle.subscriptions.push(
      { id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" },
      { id: "sub_2", customer: "ctm_1", price: "pri_pro_month", status: "active" },
    );
    await cancelPaddleSubscription("sub_1", { immediately: true });
    await cancelPaddleSubscription("sub_2", { immediately: false });
    expect(paddle.callsTo("POST /subscriptions/sub_1/cancel")[0]?.body).toEqual({ effective_from: "immediately" });
    expect(paddle.callsTo("POST /subscriptions/sub_2/cancel")[0]?.body).toEqual({
      effective_from: "next_billing_period",
    });
    expect(paddle.subscriptions.map((subscription) => subscription.status)).toEqual(["canceled", "active"]);
  });

  it("counts a refused cancel as done only when Paddle shows it ended or already set to end", async () => {
    const sinks = (["info", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    paddle.subscriptions.push(
      { id: "sub_ended", customer: "ctm_1", price: "pri_pro_month", status: "canceled" },
      {
        id: "sub_ending",
        customer: "ctm_1",
        price: "pri_pro_month",
        status: "active",
        scheduledChange: { action: "cancel", effective_at: "2026-12-08T10:00:00.000Z" },
      },
      {
        id: "sub_pausing",
        customer: "ctm_1",
        price: "pri_pro_month",
        status: "active",
        scheduledChange: { action: "pause", effective_at: "2026-12-08T10:00:00.000Z" },
      },
    );
    await expect(cancelPaddleSubscription("sub_ended", { immediately: true })).resolves.toBeUndefined();
    for (const immediately of [false, true]) {
      paddle.failNext("POST /subscriptions/sub_ending/cancel", 400, 1, "subscription_locked_pending_changes");
      await expect(cancelPaddleSubscription("sub_ending", { immediately })).resolves.toBeUndefined();
    }
    paddle.failNext("POST /subscriptions/sub_pausing/cancel", 400, 1, "subscription_locked_pending_changes");
    await expect(cancelPaddleSubscription("sub_pausing", { immediately: true })).rejects.toMatchObject({
      code: "provider_error",
    });
    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.cancel_already_scheduled");
    expect(output).toContain('"scheduledAction":"pause"');
  });

  it("keeps a refused cancel of a subscription Paddle can't find as a refusal", async () => {
    await expect(cancelPaddleSubscription("sub_missing", { immediately: true })).rejects.toMatchObject({
      code: "refused",
      details: { operation: "cancel", providerStatus: 404 },
    });
    expect(paddle.callsTo("GET /subscriptions/sub_missing")).toHaveLength(1);
  });

  it("sends every request with a timeout, the API key and Paddle-Version 1", async () => {
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    await cancelPaddleSubscription("sub_1", { immediately: true });
    const [input, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(String(input)).toBe("https://sandbox-api.paddle.com/subscriptions/sub_1/cancel");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("paddle-version")).toBe("1");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer pdl_sdbx_apikey_test");
  });

  it("never retries the cancel itself, even when Paddle can't be reached", async () => {
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    paddle.failNext("POST /subscriptions/sub_1/cancel", 0);
    await expect(cancelPaddleSubscription("sub_1", { immediately: true })).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "cancel" },
    });
    expect(paddle.calls).toHaveLength(1);
  });
});

describe("listLivePaddleSubscriptions", () => {
  it("asks for nothing without a customer or an email", async () => {
    expect(await listLivePaddleSubscriptions({ customerId: null, email: null })).toEqual([]);
    expect(await listLivePaddleSubscriptions({ email: "nobody@example.com" })).toEqual([]);
    expect(paddle.callsTo("GET /subscriptions")).toEqual([]);
  });

  it("looks the email up exactly as normalized, and lists live subscriptions of both customers", async () => {
    paddle.customers.push({ id: "ctm_mail", email: "ada@example.com" });
    paddle.subscriptions.push(
      { id: "sub_a", customer: "ctm_stored", price: "pri_pro_month", status: "past_due" },
      { id: "sub_b", customer: "ctm_mail", price: "pri_max_month", status: "paused" },
      { id: "sub_c", customer: "ctm_mail", price: "pri_pro_month", status: "canceled" },
      { id: "sub_d", customer: "ctm_someone", price: "pri_pro_month", status: "active" },
    );
    const live = await listLivePaddleSubscriptions({ customerId: "ctm_stored", email: "  Ada@Example.com " });
    expect(live.map((subscription) => subscription.id)).toEqual(["sub_a", "sub_b"]);
    expect(paddle.callsTo("GET /customers")[0]?.query.get("email")).toBe("ada@example.com");
    expect(paddle.callsTo("GET /subscriptions")[0]?.query.get("per_page")).toBe("200");
  });

  it("ignores a customer whose email only nearly matches: that's someone else's billing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: "ctm_near", email: "ada+work@example.com" }] })),
    );
    expect(await listLivePaddleSubscriptions({ email: "ada@example.com" })).toEqual([]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});

describe("createPaddleCheckout", () => {
  it("uses the given customer and passes the trial replacement in custom_data", async () => {
    const checkout = await createPaddleCheckout({
      userId: "u1",
      email: "ada@example.com",
      customerId: "ctm_given",
      priceId: "pri_max_month",
      plan: "max",
      trial: false,
      replacesSubscriptionId: "sub_trial",
    });
    expect(checkout).toEqual({
      url: "https://otto.example/checkout?_ptxn=txn_1&plan=max",
      customerId: "ctm_given",
    });
    expect(paddle.callsTo("GET /customers")).toEqual([]);
    expect(paddle.callsTo("POST /transactions")[0]?.body).toMatchObject({
      custom_data: { user_id: "u1", replaces_subscription_id: "sub_trial" },
    });
  });

  it("reports a transaction without a checkout link (no default payment link) as a provider error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { id: "txn_1", checkout: null } }), { status: 201 }),
    );
    await expect(
      createPaddleCheckout({
        userId: "u1",
        email: "ada@example.com",
        customerId: "ctm_given",
        priceId: "pri_pro_month",
        plan: "pro",
        trial: false,
      }),
    ).rejects.toMatchObject({ code: "provider_error", details: { operation: "checkout" } });
  });
});

describe("paddlePortalUrl", () => {
  it("opens a session for the customer, deep-linking at most 25 subscriptions", async () => {
    const ids = Array.from({ length: 30 }, (_, index) => `sub_${index}`);
    expect(await paddlePortalUrl("ctm_1", ids)).toBe("https://customer-portal.paddle.test/ctm_1");
    expect(paddle.callsTo("POST /customers/ctm_1/portal-sessions")[0]?.body).toEqual({
      subscription_ids: ids.slice(0, 25),
    });
  });
});
