import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import {
  cancelPaddleSubscription,
  changePaddlePlan,
  createPaddleCheckout,
  getPaddleSubscription,
  isPaddleId,
  listLivePaddleSubscriptions,
  paddlePortalUrl,
} from "./paddle";
import { verifyBillingId } from "./paddle-sign";
import { installFakePaddle, paddleId, type FakePaddle } from "./testing";

const SECRET = "pdl_ntfset_test";
const SUB_1 = paddleId("sub", 1);
const SUB_2 = paddleId("sub", 2);
const CTM_1 = paddleId("ctm", 1);
const PRO_MONTH = paddleId("pri", "promonth");
const PRO_TRIAL = paddleId("pri", "protrial");
const MAX_MONTH = paddleId("pri", "maxmonth");
const TXN_1 = paddleId("txn", 1);
const CREEM_CUSTOMER = "cust_3kKw0VQ8bY1lN3m9";
const CREEM_SUBSCRIPTION = "sub_7Hq2LmPz9XcV4bN1";

let paddle: FakePaddle;

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

const output = (levels: ("info" | "warn" | "error")[]) =>
  levels.map((level) => vi.spyOn(console, level).mockImplementation(() => undefined));
const logged = (sinks: ReturnType<typeof output>) =>
  JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));

const checkoutFor = (overrides: Partial<Parameters<typeof createPaddleCheckout>[0]> = {}) =>
  createPaddleCheckout({
    userId: "u1",
    email: "ada@example.com",
    customerId: CTM_1,
    priceId: PRO_MONTH,
    plan: "pro",
    trial: false,
    ...overrides,
  });

beforeEach(() => {
  useEnv({
    PADDLE_API_KEY: "pdl_sdbx_apikey_test",
    PADDLE_WEBHOOK_SECRET: SECRET,
    PADDLE_ENVIRONMENT: undefined,
  });
  paddle = installFakePaddle();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("isPaddleId", () => {
  it("accepts only the prefix and 26 lowercase letters or digits", () => {
    expect(isPaddleId("sub", `sub_${"a1".repeat(13)}`)).toBe(true);
    expect(isPaddleId("ctm", CTM_1)).toBe(true);
    expect(isPaddleId("txn", TXN_1)).toBe(true);
    expect(isPaddleId("pri", PRO_MONTH)).toBe(true);
    for (const id of [
      CREEM_SUBSCRIPTION,
      "sub_1",
      `sub_${"A".repeat(26)}`,
      `sub_${"a".repeat(27)}`,
      ` ${SUB_1}`,
      SUB_1.toUpperCase(),
      null,
      undefined,
    ]) {
      expect(isPaddleId("sub", id)).toBe(false);
    }
    expect(isPaddleId("sub", CTM_1)).toBe(false);
    expect(isPaddleId("ctm", CREEM_CUSTOMER)).toBe(false);
  });
});

describe("getPaddleSubscription", () => {
  it("reads the fields the app relies on, with nulls where Paddle has nothing", async () => {
    paddle.subscriptions.push({
      id: SUB_1,
      customer: CTM_1,
      price: PRO_TRIAL,
      status: "trialing",
      customData: { user_id: "u1" },
    });
    expect(await getPaddleSubscription(SUB_1)).toEqual({
      id: SUB_1,
      status: "trialing",
      customer_id: CTM_1,
      items: [
        {
          price: { id: PRO_TRIAL },
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
    await expect(getPaddleSubscription(SUB_1)).rejects.toMatchObject({ code: "unavailable" });
    expect(paddle.calls).toEqual([]);
  });

  it("finds nothing for an id that isn't Paddle's, without asking Paddle", async () => {
    await expect(getPaddleSubscription(CREEM_SUBSCRIPTION)).rejects.toMatchObject({
      code: "no_subscription",
      details: { operation: "lookup" },
    });
    expect(paddle.calls).toEqual([]);
  });

  it("treats an answer it can't read as a provider error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: SUB_1 } })));
    await expect(getPaddleSubscription(SUB_1)).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "lookup" },
    });
  });

  it("retries a busy Paddle for up to about two seconds, then reports the refusal", async () => {
    paddle.failNext(`GET /subscriptions/${SUB_1}`, 429, 5, "too_many_requests");
    const started = Date.now();
    await expect(getPaddleSubscription(SUB_1)).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 429, providerCode: "too_many_requests" },
    });
    expect(paddle.callsTo(`GET /subscriptions/${SUB_1}`)).toHaveLength(3);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("doesn't retry a refusal", async () => {
    await expect(getPaddleSubscription(SUB_2)).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 404, providerCode: "entity_not_found" },
    });
    expect(paddle.calls).toHaveLength(1);
  });
});

describe("cancelPaddleSubscription", () => {
  it("cancels right away or at the end of the period", async () => {
    paddle.subscriptions.push(
      { id: SUB_1, customer: CTM_1, price: PRO_MONTH, status: "active" },
      { id: SUB_2, customer: CTM_1, price: PRO_MONTH, status: "active" },
    );
    await cancelPaddleSubscription(SUB_1, { immediately: true });
    await cancelPaddleSubscription(SUB_2, { immediately: false });
    expect(paddle.callsTo(`POST /subscriptions/${SUB_1}/cancel`)[0]?.body).toEqual({
      effective_from: "immediately",
    });
    expect(paddle.callsTo(`POST /subscriptions/${SUB_2}/cancel`)[0]?.body).toEqual({
      effective_from: "next_billing_period",
    });
    expect(paddle.subscriptions.map((subscription) => subscription.status)).toEqual(["canceled", "active"]);
  });

  it("has nothing to cancel for an id that isn't Paddle's, and doesn't ask Paddle", async () => {
    const sinks = output(["warn"]);
    await expect(cancelPaddleSubscription(CREEM_SUBSCRIPTION, { immediately: true })).resolves.toBeUndefined();
    expect(paddle.calls).toEqual([]);
    expect(logged(sinks)).toContain("not_a_paddle_id");
  });

  it("counts a refused cancel as done only when Paddle shows it ended or already set to end", async () => {
    const sinks = output(["info", "error"]);
    const [ended, ending, pausing] = ["ended", "ending", "pausing"].map((name) => paddleId("sub", name));
    const at = "2026-12-08T10:00:00.000Z";
    paddle.subscriptions.push(
      { id: ended!, customer: CTM_1, price: PRO_MONTH, status: "canceled" },
      { id: ending!, customer: CTM_1, price: PRO_MONTH, status: "active", scheduledChange: { action: "cancel", effective_at: at } },
      { id: pausing!, customer: CTM_1, price: PRO_MONTH, status: "active", scheduledChange: { action: "pause", effective_at: at } },
    );
    await expect(cancelPaddleSubscription(ended!, { immediately: true })).resolves.toBeUndefined();
    for (const immediately of [false, true]) {
      paddle.failNext(`POST /subscriptions/${ending}/cancel`, 400, 1, "subscription_locked_pending_changes");
      await expect(cancelPaddleSubscription(ending!, { immediately })).resolves.toBeUndefined();
    }
    paddle.failNext(`POST /subscriptions/${pausing}/cancel`, 400, 1, "subscription_locked_pending_changes");
    await expect(cancelPaddleSubscription(pausing!, { immediately: true })).rejects.toMatchObject({
      code: "provider_error",
    });
    const text = logged(sinks);
    expect(text).toContain("billing.cancel_already_scheduled");
    expect(text).toContain('"scheduledAction":"pause"');
  });

  it("never calls a subscription Paddle can't find ended: it reports it as an error and keeps the refusal", async () => {
    const sinks = output(["error"]);
    await expect(cancelPaddleSubscription(SUB_2, { immediately: true })).rejects.toMatchObject({
      code: "refused",
      details: { operation: "cancel", providerStatus: 404 },
    });
    expect(paddle.callsTo(`GET /subscriptions/${SUB_2}`)).toHaveLength(1);
    const notFound = sinks[0]!.mock.calls.find((call) => JSON.stringify(call).includes("billing.cancel_not_found"));
    expect(JSON.stringify(notFound)).toContain(SUB_2);
    expect(JSON.stringify(notFound)).toContain('"environment":"sandbox"');
  });

  it("sends every request with a timeout, the API key and Paddle-Version 1", async () => {
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRO_MONTH, status: "active" });
    await cancelPaddleSubscription(SUB_1, { immediately: true });
    const [input, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(String(input)).toBe(`https://sandbox-api.paddle.com/subscriptions/${SUB_1}/cancel`);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(new Headers(init?.headers).get("paddle-version")).toBe("1");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer pdl_sdbx_apikey_test");
  });

  it("never retries the cancel itself, even when Paddle can't be reached", async () => {
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRO_MONTH, status: "active" });
    paddle.failNext(`POST /subscriptions/${SUB_1}/cancel`, 0);
    await expect(cancelPaddleSubscription(SUB_1, { immediately: true })).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "cancel" },
    });
    expect(paddle.calls).toHaveLength(1);
  });
});

describe("changePaddlePlan", () => {
  it("moves the subscription to the new price, prorated now", async () => {
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRO_MONTH, status: "active" });
    await changePaddlePlan(SUB_1, MAX_MONTH);
    expect(paddle.callsTo(`PATCH /subscriptions/${SUB_1}`)[0]?.body).toEqual({
      items: [{ price_id: MAX_MONTH, quantity: 1 }],
      proration_billing_mode: "prorated_immediately",
    });
  });

  it("refuses an id that isn't Paddle's, or a price that isn't, before any request", async () => {
    await expect(changePaddlePlan(CREEM_SUBSCRIPTION, MAX_MONTH)).rejects.toMatchObject({
      code: "no_subscription",
      details: { operation: "change_plan" },
    });
    await expect(changePaddlePlan(SUB_1, "prod_creem_max")).rejects.toMatchObject({ code: "unavailable" });
    expect(paddle.calls).toEqual([]);
  });
});

describe("listLivePaddleSubscriptions", () => {
  it("asks for nothing without a customer or an email", async () => {
    expect(await listLivePaddleSubscriptions({ customerId: null, email: null })).toEqual([]);
    expect(await listLivePaddleSubscriptions({ email: "nobody@example.com" })).toEqual([]);
    expect(paddle.callsTo("GET /subscriptions")).toEqual([]);
  });

  it("looks the email up exactly as normalized, and lists live subscriptions of both customers", async () => {
    const [stored, mail, someone] = ["stored", "mail", "someone"].map((name) => paddleId("ctm", name));
    const [a, b, c, d] = ["a", "b", "c", "d"].map((name) => paddleId("sub", name));
    paddle.customers.push({ id: mail!, email: "ada@example.com" });
    paddle.subscriptions.push(
      { id: a!, customer: stored!, price: PRO_MONTH, status: "past_due" },
      { id: b!, customer: mail!, price: MAX_MONTH, status: "paused" },
      { id: c!, customer: mail!, price: PRO_MONTH, status: "canceled" },
      { id: d!, customer: someone!, price: PRO_MONTH, status: "active" },
    );
    const live = await listLivePaddleSubscriptions({ customerId: stored, email: "  Ada@Example.com " });
    expect(live.map((subscription) => subscription.id)).toEqual([a, b]);
    expect(paddle.callsTo("GET /customers")[0]?.query.get("email")).toBe("ada@example.com");
    expect(paddle.callsTo("GET /subscriptions")[0]?.query.get("customer_id")).toBe(`${stored},${mail}`);
    expect(paddle.callsTo("GET /subscriptions")[0]?.query.get("per_page")).toBe("200");
  });

  it("skips a stored customer id that isn't Paddle's, going by the email alone", async () => {
    expect(await listLivePaddleSubscriptions({ customerId: CREEM_CUSTOMER })).toEqual([]);
    expect(paddle.calls).toEqual([]);

    paddle.customers.push({ id: CTM_1, email: "ada@example.com" });
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRO_MONTH, status: "active" });
    const live = await listLivePaddleSubscriptions({ customerId: CREEM_CUSTOMER, email: "ada@example.com" });
    expect(live.map((subscription) => subscription.id)).toEqual([SUB_1]);
    expect(paddle.callsTo("GET /subscriptions")[0]?.query.get("customer_id")).toBe(CTM_1);
  });

  it("ignores a customer whose email only nearly matches: that's someone else's billing", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [{ id: paddleId("ctm", "near"), email: "ada+work@example.com" }] })),
    );
    expect(await listLivePaddleSubscriptions({ email: "ada@example.com" })).toEqual([]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});

describe("createPaddleCheckout", () => {
  it("uses the given customer and signs the user and the trial it replaces in custom_data", async () => {
    const trial = paddleId("sub", "trial");
    const checkout = await checkoutFor({ priceId: MAX_MONTH, plan: "max", replacesSubscriptionId: trial });
    expect(checkout).toEqual({
      url: `https://otto.example/checkout?_ptxn=${TXN_1}&plan=max`,
      customerId: CTM_1,
    });
    expect(paddle.callsTo("GET /customers")).toEqual([]);
    const customData = (paddle.callsTo("POST /transactions")[0]?.body as { custom_data: Record<string, unknown> })
      .custom_data;
    expect(Object.keys(customData).sort()).toEqual(["replaces_sig", "replaces_subscription_id", "user_id", "user_sig"]);
    expect(customData).toMatchObject({ user_id: "u1", replaces_subscription_id: trial });
    expect(verifyBillingId("u1", customData.user_sig, SECRET)).toBe(true);
    expect(verifyBillingId(trial, customData.replaces_sig, SECRET)).toBe(true);
    expect(verifyBillingId("u2", customData.user_sig, SECRET)).toBe(false);
    expect(verifyBillingId("u1", customData.user_sig, "pdl_ntfset_other")).toBe(false);
  });

  it("signs only the user when nothing is replaced", async () => {
    await checkoutFor();
    const body = paddle.callsTo("POST /transactions")[0]?.body as { custom_data: Record<string, unknown> };
    expect(Object.keys(body.custom_data).sort()).toEqual(["user_id", "user_sig"]);
  });

  it("refuses without the webhook secret, or with a price that isn't Paddle's, before any request", async () => {
    useEnv({ PADDLE_WEBHOOK_SECRET: undefined });
    await expect(checkoutFor()).rejects.toMatchObject({ code: "unavailable" });
    useEnv({ PADDLE_WEBHOOK_SECRET: SECRET });
    await expect(checkoutFor({ priceId: "prod_creem_pro" })).rejects.toMatchObject({ code: "unavailable" });
    expect(paddle.calls).toEqual([]);
  });

  it("finds the customer by email instead of using a stored id that isn't Paddle's", async () => {
    paddle.customers.push({ id: CTM_1, email: "ada@example.com" });
    expect(await checkoutFor({ customerId: CREEM_CUSTOMER })).toMatchObject({ customerId: CTM_1 });
    expect(paddle.callsTo("GET /customers")[0]?.query.get("email")).toBe("ada@example.com");
    expect(paddle.calls.some((call) => JSON.stringify(call.body ?? "").includes(CREEM_CUSTOMER))).toBe(false);
    expect(paddle.calls.some((call) => call.query.toString().includes(CREEM_CUSTOMER))).toBe(false);
  });

  it("first cancels the customer's open checkouts, leaving those of a subscription and of other customers", async () => {
    const sinks = output(["info"]);
    const [draft, ready, completed, cardUpdate, someoneElse] = ["draft", "ready", "completed", "card", "other"].map(
      (name) => paddleId("txn", name),
    );
    paddle.transactions.push(
      { id: draft!, customer: CTM_1, status: "draft" },
      { id: ready!, customer: CTM_1, status: "ready" },
      { id: completed!, customer: CTM_1, status: "completed" },
      { id: cardUpdate!, customer: CTM_1, status: "ready", subscription: SUB_1 },
      { id: someoneElse!, customer: paddleId("ctm", 2), status: "ready" },
    );
    await checkoutFor();
    const listed = paddle.callsTo("GET /transactions")[0]?.query;
    expect(listed?.get("customer_id")).toBe(CTM_1);
    expect(listed?.get("status")).toBe("draft,ready");
    expect(paddle.callsTo("PATCH /transactions").map((call) => [call.path, call.body])).toEqual([
      [`/transactions/${draft}`, { status: "canceled" }],
      [`/transactions/${ready}`, { status: "canceled" }],
    ]);
    expect(paddle.transactions.map((transaction) => transaction.status)).toEqual([
      "canceled",
      "canceled",
      "completed",
      "ready",
      "ready",
      "draft",
    ]);
    const order = paddle.calls.map((call) => `${call.method} ${call.path}`);
    expect(order.indexOf("POST /transactions")).toBeGreaterThan(order.lastIndexOf(`PATCH /transactions/${ready}`));
    expect(logged(sinks)).toContain(draft);
  });

  it("never cancels a checkout Paddle lists under another customer", async () => {
    const [mine, theirs, guest] = ["mine", "theirs", "guest"].map((name) => paddleId("txn", name));
    const listed = [
      { id: mine, customer_id: CTM_1, subscription_id: null },
      { id: theirs, customer_id: paddleId("ctm", 2), subscription_id: null },
      { id: guest, customer_id: null, subscription_id: null },
    ];
    paddle.transactions.push({ id: mine!, customer: CTM_1, status: "ready" });
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ data: listed })));
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    await checkoutFor();
    expect(paddle.calls.filter((call) => call.method === "PATCH").map((call) => call.path)).toEqual([
      `/transactions/${mine}`,
    ]);
  });

  it("cancels the open checkouts of a customer it just found by email", async () => {
    paddle.customers.push({ id: CTM_1, email: "ada@example.com" });
    const old = paddleId("txn", "old");
    paddle.transactions.push({ id: old, customer: CTM_1, status: "ready" });
    await checkoutFor({ customerId: null });
    expect(paddle.callsTo(`PATCH /transactions/${old}`)).toHaveLength(1);
  });

  it("still opens the checkout when the old ones can't be listed or cancelled, logging ids only", async () => {
    const sinks = output(["warn"]);
    paddle.failNext("GET /transactions", 400, 1, "invalid_field", "email ada@example.com is invalid");
    expect((await checkoutFor()).url).toContain(`_ptxn=${TXN_1}`);

    const [first, second] = ["first", "second"].map((name) => paddleId("txn", name));
    paddle.transactions.push(
      { id: first!, customer: CTM_1, status: "ready" },
      { id: second!, customer: CTM_1, status: "draft" },
    );
    paddle.failNext(`PATCH /transactions/${first}`, 503);
    await checkoutFor();
    expect(paddle.callsTo(`PATCH /transactions/${first}`)).toHaveLength(1);
    expect(paddle.callsTo(`PATCH /transactions/${second}`)).toHaveLength(1);
    expect(paddle.callsTo("POST /transactions")).toHaveLength(2);

    const text = logged(sinks);
    expect(text).toContain("billing.open_checkout_cancel_failed");
    expect(text).toContain('"step":"list"');
    expect(text).toContain(first);
    expect(text).not.toContain("ada@example.com");
  });

  it("reports a transaction without a checkout link (no default payment link) as a provider error", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: TXN_1, checkout: null } }), { status: 201 }));
    await expect(checkoutFor()).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "checkout" },
    });
  });
});

describe("paddlePortalUrl", () => {
  it("opens a session for the customer, deep-linking at most 25 subscriptions", async () => {
    const ids = Array.from({ length: 30 }, (_, index) => paddleId("sub", index));
    expect(await paddlePortalUrl(CTM_1, ids)).toBe(`https://customer-portal.paddle.test/${CTM_1}`);
    expect(paddle.callsTo(`POST /customers/${CTM_1}/portal-sessions`)[0]?.body).toEqual({
      subscription_ids: ids.slice(0, 25),
    });
  });

  it("has nothing to manage for a customer that isn't Paddle's, and drops subscriptions that aren't", async () => {
    await expect(paddlePortalUrl(CREEM_CUSTOMER, [SUB_1])).rejects.toMatchObject({ code: "no_subscription" });
    expect(paddle.calls).toEqual([]);
    await paddlePortalUrl(CTM_1, [CREEM_SUBSCRIPTION, SUB_1]);
    expect(paddle.callsTo(`POST /customers/${CTM_1}/portal-sessions`)[0]?.body).toEqual({ subscription_ids: [SUB_1] });
  });
});
