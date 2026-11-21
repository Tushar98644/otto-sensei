import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { verifyBillingId } from "./billing-sign";
import {
  cancelSubscription,
  changePlan,
  createCheckout,
  customersWithEmail,
  dodoKeyMatchesEnvironment,
  endSubscription,
  getSubscription,
  listLiveSubscriptions,
  portalUrl,
  refundPayment,
  succeededPayments,
  type CheckoutInput,
} from "./dodo";
import { dodoId, installFakeDodo, type DodoStatus, type FakeDodo } from "./dodo-testing";
import type { BillingError } from "./errors";

// Paddle ids are a prefix and 26 lowercase letters or digits.
const paddleId = (kind: "sub" | "ctm" | "txn" | "pri", name: string | number) =>
  `${kind}_${String(name).padStart(26, "0")}`;

const SECRET = "billing-signing-secret-for-tests";
const KEY = "dodo_test_apikey";
const APP = "https://otto.example";
const SUB_1 = dodoId("sub", 1);
const SUB_2 = dodoId("sub", 2);
const CUS_1 = dodoId("cus", 1);
const PAY_1 = dodoId("pay", 1);
const PRO_MONTH = dodoId("pdt", "promonth");
const PRO_TRIAL = dodoId("pdt", "protrial");
const MAX_MONTH = dodoId("pdt", "maxmonth");
const MAX_YEAR = dodoId("pdt", "maxyear");
const PADDLE_SUB = paddleId("sub", 1);
const PADDLE_CTM = paddleId("ctm", 1);
const PADDLE_TXN = paddleId("txn", 1);
const PADDLE_PRI = paddleId("pri", "promonth");
const CREEM_CUSTOMER = "cust_3kKw0VQ8bY1lN3m9";
const REFUND_REASON = "This account had already used its trial, so the new trial was cancelled.";

const spyOnConsole = () =>
  (["info", "warn", "error"] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation(() => undefined),
  );

let dodo: FakeDodo;
let sinks: ReturnType<typeof spyOnConsole>;

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

const logged = () => JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));

const fetched = () => vi.mocked(fetch).mock.calls;

const checkoutFor = (overrides: Partial<CheckoutInput> = {}) =>
  createCheckout({
    userId: "u1",
    email: "ada@example.com",
    customerId: CUS_1,
    productId: PRO_MONTH,
    plan: "pro",
    interval: "month",
    trial: false,
    ...overrides,
  });

const bodyOf = (route: string, index = 0) =>
  dodo.callsTo(route)[index]?.body as Record<string, unknown> | undefined;

async function failureOf(promise: Promise<unknown>): Promise<BillingError> {
  try {
    await promise;
  } catch (error) {
    return error as BillingError;
  }
  throw new Error("expected a failure");
}

beforeEach(() => {
  useEnv({
    DODO_API_KEY: KEY,
    DODO_ENVIRONMENT: undefined,
    BILLING_SIGNING_SECRET: SECRET,
    NEXT_PUBLIC_APP_URL: APP,
    VERCEL_PROJECT_PRODUCTION_URL: undefined,
  });
  dodo = installFakeDodo();
  sinks = spyOnConsole();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("dodoKeyMatchesEnvironment", () => {
  it("matches a key only to the mode its prefix names", () => {
    expect(dodoKeyMatchesEnvironment("dodo_test_abc", "test")).toBe(true);
    expect(dodoKeyMatchesEnvironment("dodo_live_abc", "live")).toBe(true);
    expect(dodoKeyMatchesEnvironment("dodo_live_abc", "test")).toBe(false);
    expect(dodoKeyMatchesEnvironment("dodo_test_abc", "live")).toBe(false);
    expect(dodoKeyMatchesEnvironment("abc", "test")).toBe(false);
    expect(dodoKeyMatchesEnvironment("dodo_testabc", "test")).toBe(false);
  });
});

describe("requests", () => {
  it("sends reads to the test host with the bearer key and a timeout, and no version header", async () => {
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    await getSubscription(SUB_1);
    const [input, init] = fetched()[0] ?? [];
    expect(String(input)).toBe(`https://test.dodopayments.com/subscriptions/${SUB_1}`);
    expect(init?.method).toBe("GET");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    const headers = new Headers(init?.headers);
    expect([...headers.keys()]).toEqual(["authorization"]);
    expect(headers.get("authorization")).toBe(`Bearer ${KEY}`);
  });

  it("sends writes as JSON", async () => {
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    await changePlan(SUB_1, MAX_MONTH, { fromTrial: false });
    const [, init] = fetched()[0] ?? [];
    expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toMatchObject({ product_id: MAX_MONTH });
  });

  it("uses the live host only when DODO_ENVIRONMENT is live, with a live key", async () => {
    useEnv({ DODO_ENVIRONMENT: "live", DODO_API_KEY: "dodo_live_apikey" });
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    await getSubscription(SUB_1);
    const [input, init] = fetched()[0] ?? [];
    expect(String(input)).toBe(`https://live.dodopayments.com/subscriptions/${SUB_1}`);
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer dodo_live_apikey");
  });

  it.each<[string, Record<string, string | undefined>]>([
    ["no key", { DODO_API_KEY: undefined }],
    ["a live key in test mode", { DODO_API_KEY: "dodo_live_apikey" }],
    ["a test key in live mode", { DODO_ENVIRONMENT: "live" }],
    ["a key of neither mode", { DODO_API_KEY: "sk_apikey" }],
  ])("is unavailable with %s, before any request", async (_, values) => {
    useEnv(values);
    const error = await failureOf(getSubscription(SUB_1));
    expect(error).toMatchObject({ code: "unavailable" });
    expect(error.message).not.toContain("apikey");
    expect(fetched()).toEqual([]);
  });

  it("retries a busy read for up to about two seconds, then reports the refusal", async () => {
    dodo.failNext(`GET /subscriptions/${SUB_1}`, 429, 5, "TOO_MANY_REQUESTS");
    const started = Date.now();
    await expect(getSubscription(SUB_1)).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 429, providerCode: "too_many_requests", reason: "rate_limited" },
    });
    expect(dodo.callsTo(`GET /subscriptions/${SUB_1}`)).toHaveLength(3);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it.each<[string, number]>([
    ["a lost connection", 0],
    ["a server error", 503],
  ])("retries a read after %s", async (_, status) => {
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    dodo.failNext(`GET /subscriptions/${SUB_1}`, status);
    await expect(getSubscription(SUB_1)).resolves.toMatchObject({ subscription_id: SUB_1 });
    expect(dodo.calls).toHaveLength(2);
  });

  it("doesn't retry a read that timed out", async () => {
    dodo.failNext(`GET /subscriptions/${SUB_1}`, -1);
    await expect(getSubscription(SUB_1)).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "lookup" },
    });
    expect(dodo.calls).toHaveLength(1);
  });

  it("doesn't retry a refusal", async () => {
    await expect(getSubscription(SUB_2)).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 404, providerCode: "not_found", reason: "not_found" },
    });
    expect(dodo.calls).toHaveLength(1);
  });

  it.each<[string, string, number, () => Promise<unknown>]>([
    ["a refund", "POST /refunds", 503, () => refundPayment(PAY_1)],
    ["a refund", "POST /refunds", -1, () => refundPayment(PAY_1)],
    [
      "a plan change",
      `POST /subscriptions/${SUB_1}/change-plan`,
      502,
      () => changePlan(SUB_1, MAX_MONTH, { fromTrial: true }),
    ],
    ["a checkout", "POST /checkouts", 500, () => checkoutFor()],
    [
      "a cancel",
      `PATCH /subscriptions/${SUB_1}`,
      0,
      () => cancelSubscription(SUB_1, { immediately: true }),
    ],
    [
      "a portal session",
      `POST /customers/${CUS_1}/customer-portal/session`,
      503,
      () => portalUrl(CUS_1),
    ],
  ])("never retries %s (%s, status %i)", async (_, route, status, call) => {
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    dodo.payments.push({ id: PAY_1, subscription: SUB_1, status: "succeeded" });
    dodo.failNext(route, status, 5);
    await expect(call()).rejects.toMatchObject({ code: "provider_error" });
    expect(dodo.calls).toHaveLength(1);
  });

  it("treats an answer it can't read as a provider error", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ subscription_id: SUB_1 })),
    );
    await expect(getSubscription(SUB_1)).rejects.toMatchObject({
      code: "provider_error",
      details: { operation: "lookup" },
    });
  });
});

describe("refusals", () => {
  it.each<[number, string, string | undefined, string | undefined]>([
    [409, "PENDING_PLAN_CHANGE_EXISTS", "pending_plan_change_exists", "busy"],
    [409, "PendingPlanChangeExists", "pending_plan_change_exists", "busy"],
    [409, "SCHEDULED_PLAN_CHANGE_EXISTS", "scheduled_plan_change_exists", "busy"],
    [
      409,
      "PLAN_CHANGE_NOT_ALLOWED_FOR_SCHEDULED_CANCELLATION",
      "plan_change_not_allowed_for_scheduled_cancellation",
      "inactive",
    ],
    [
      422,
      "INACTIVE_SUBSCRIPTION_PLAN_CHANGE_NOT_SUPPORTED",
      "inactive_subscription_plan_change_not_supported",
      "inactive",
    ],
    [422, "SUBSCRIPTION_INACTIVE", "subscription_inactive", "inactive"],
    [
      409,
      "CUSTOMER_HAS_EXISTING_SUBSCRIPTION",
      "customer_has_existing_subscription",
      "has_subscription",
    ],
    [403, "INSUFFICIENT_PERMISSION", "insufficient_permission", "misconfigured"],
    [403, "IP_ADDRESS_NOT_ALLOWED", "ip_address_not_allowed", "misconfigured"],
    [403, "IPAddressNotAllowed", "ip_address_not_allowed", "misconfigured"],
    [401, "UNAUTHORIZED", "unauthorized", "misconfigured"],
    [403, "MERCHANT_NOT_LIVE", "merchant_not_live", "misconfigured"],
    [
      422,
      "TOTAL_PAYMENT_AMOUNT_BELOW_MINIMUM_AMOUNT",
      "total_payment_amount_below_minimum_amount",
      "misconfigured",
    ],
    [403, "SOMETHING_NEW", "something_new", "misconfigured"],
    [404, "NOT_FOUND", "not_found", "not_found"],
    [404, "SUBSCRIPTION_NOT_FOUND", "subscription_not_found", "not_found"],
    [429, "TOO_MANY_REQUESTS", "too_many_requests", "rate_limited"],
    [422, "CARD_DECLINED", "card_declined", "declined"],
    [400, "INVALID_REQUEST_BODY", "invalid_request_body", undefined],
    [409, "constructor", "constructor", undefined],
    [400, "bad code!", undefined, undefined],
    [400, "_LEADING", undefined, undefined],
    [400, "A".repeat(65), undefined, undefined],
  ])("a %i %s is refused with code %s and reason %s", async (status, raw, providerCode, reason) => {
    dodo.failNext(`POST /subscriptions/${SUB_1}/change-plan`, status, 1, raw);
    const error = await failureOf(changePlan(SUB_1, MAX_MONTH, { fromTrial: false }));
    expect(error.code).toBe("refused");
    expect(error.details).toEqual({
      operation: "change_plan",
      providerStatus: status,
      ...(providerCode ? { providerCode } : {}),
      ...(reason ? { reason } : {}),
    });
  });

  it("refuses by status alone when the answer has no body", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response("<html>Forbidden</html>", { status: 403 }));
    const missing = await failureOf(changePlan(SUB_1, MAX_MONTH, { fromTrial: false }));
    expect(missing.details).toEqual({
      operation: "change_plan",
      providerStatus: 404,
      reason: "not_found",
    });
    const forbidden = await failureOf(changePlan(SUB_1, MAX_MONTH, { fromTrial: false }));
    expect(forbidden.details).toEqual({
      operation: "change_plan",
      providerStatus: 403,
      reason: "misconfigured",
    });
  });

  it("reports a server error as a provider error with no code or reason", async () => {
    dodo.failNext(`POST /subscriptions/${SUB_1}/change-plan`, 500, 1, "INTERNAL_SERVER_ERROR");
    const error = await failureOf(changePlan(SUB_1, MAX_MONTH, { fromTrial: false }));
    expect(error.code).toBe("provider_error");
    expect(error.details).toEqual({ operation: "change_plan" });
  });

  it("logs the status, code and request id, never the message or an email", async () => {
    const message = "No customer Ada@Example.com here: ada@example.com, key sk_secret";
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "INVALID_REQUEST_BODY", message }), {
        status: 400,
        headers: { "x-request-id": "req_123" },
      }),
    );
    await expect(getSubscription(SUB_1)).rejects.toMatchObject({ code: "refused" });
    dodo.failNext("GET /customers", 400, 1, "INVALID_QUERY_PARAMS", message);
    await expect(listLiveSubscriptions({ email: "ada@example.com" })).rejects.toMatchObject({
      code: "refused",
    });
    dodo.failNext("POST /checkouts", 422, 1, "INVALID_REQUEST_BODY", message);
    await expect(checkoutFor({ customerId: null })).rejects.toMatchObject({ code: "refused" });
    dodo.failNext("POST /refunds", 422, 1, "REFUND_WINDOW_EXPIRED", message);
    await expect(refundPayment(PAY_1)).rejects.toMatchObject({ code: "refused" });
    dodo.failNext(`PATCH /subscriptions/${SUB_1}`, 409, 1, "SUBSCRIPTION_INACTIVE", message);
    await expect(endSubscription(SUB_1)).rejects.toMatchObject({ code: "refused" });

    const text = logged();
    expect(text).toContain("billing.provider_failed");
    expect(text).toContain('"providerCode":"invalid_request_body"');
    expect(text).toContain('"requestId":"req_123"');
    expect(text).toContain('"providerCode":"refund_window_expired"');
    for (const secret of ["ada@example.com", "Ada@Example.com", "sk_secret", "No customer"]) {
      expect(text).not.toContain(secret);
    }
  });
});

describe("getSubscription", () => {
  it("reads only the fields the app relies on", async () => {
    dodo.customers.push({ id: CUS_1, email: "ada@example.com" });
    dodo.subscriptions.push({
      id: SUB_1,
      customer: CUS_1,
      product: PRO_TRIAL,
      status: "active",
      trial: true,
      metadata: { user_id: "u1" },
    });
    expect(await getSubscription(SUB_1)).toEqual({
      subscription_id: SUB_1,
      status: "active",
      product_id: PRO_TRIAL,
      customer: { customer_id: CUS_1, email: "ada@example.com" },
      metadata: { user_id: "u1" },
      created_at: "2026-11-08T10:00:00.000Z",
      previous_billing_date: "2026-11-08T10:00:00.000Z",
      next_billing_date: "2026-11-11T10:00:00.000Z",
      trial_period_days: 3,
      cancel_at_next_billing_date: false,
      cancelled_at: null,
    });
  });

  it("finds nothing for an id that isn't Dodo's, without asking Dodo", async () => {
    for (const id of [PADDLE_SUB, "sub_creem_max", "", CUS_1]) {
      await expect(getSubscription(id)).rejects.toMatchObject({
        code: "no_subscription",
        details: { operation: "lookup" },
      });
    }
    expect(fetched()).toEqual([]);
  });
});

describe("cancelSubscription", () => {
  it("cancels right away or at the end of the period", async () => {
    const [now, later, deleted] = ["now", "later", "deleted"].map((name) => dodoId("sub", name));
    dodo.subscriptions.push(
      { id: now!, customer: CUS_1, product: PRO_MONTH, status: "active" },
      { id: later!, customer: CUS_1, product: PRO_MONTH, status: "active" },
      { id: deleted!, customer: CUS_1, product: PRO_MONTH, status: "on_hold" },
    );
    expect(await cancelSubscription(now!, { immediately: true })).toBe("cancelled");
    expect(await cancelSubscription(later!, { immediately: false })).toBe("cancelled");
    expect(await endSubscription(deleted!)).toBe("cancelled");
    expect(bodyOf(`PATCH /subscriptions/${now}`)).toEqual({
      status: "cancelled",
      cancel_reason: "cancelled_by_merchant",
    });
    expect(bodyOf(`PATCH /subscriptions/${later}`)).toEqual({ cancel_at_next_billing_date: true });
    expect(bodyOf(`PATCH /subscriptions/${deleted}`)).toEqual({
      status: "cancelled",
      cancel_reason: "cancelled_by_merchant",
    });
    expect(
      dodo.subscriptions.map(({ status, cancelAtNextBillingDate }) => [
        status,
        cancelAtNextBillingDate,
      ]),
    ).toEqual([
      ["cancelled", false],
      ["active", true],
      ["cancelled", false],
    ]);
    expect(dodo.callsTo("GET")).toEqual([]);
  });

  it("has nothing to cancel for an id that isn't Dodo's, and doesn't ask Dodo", async () => {
    for (const id of [PADDLE_SUB, "sub_creem_max", ""]) {
      expect(await cancelSubscription(id, { immediately: true })).toBe("already_ended");
      expect(await endSubscription(id)).toBe("already_ended");
    }
    expect(fetched()).toEqual([]);
    expect(logged()).toContain("not_a_dodo_id");
  });

  it.each<[DodoStatus, boolean, number, "already_ended" | "provider_error"]>([
    ["cancelled", false, 422, "already_ended"],
    ["expired", false, 409, "already_ended"],
    ["failed", false, 400, "already_ended"],
    ["active", true, 409, "already_ended"],
    ["active", false, 400, "provider_error"],
    ["past_due", false, 409, "provider_error"],
    ["on_hold", false, 422, "provider_error"],
    ["paused", false, 422, "provider_error"],
    ["pending", false, 400, "provider_error"],
  ])(
    "after a refusal, reads back a %s subscription (cancel flag %s, status %i): %s",
    async (status, cancelAtNextBillingDate, refusal, outcome) => {
      dodo.subscriptions.push({
        id: SUB_1,
        customer: CUS_1,
        product: PRO_MONTH,
        status,
        cancelAtNextBillingDate,
      });
      dodo.failNext(`PATCH /subscriptions/${SUB_1}`, refusal, 1, "SUBSCRIPTION_INACTIVE");
      const result = cancelSubscription(SUB_1, { immediately: true });
      if (outcome === "already_ended") {
        expect(await result).toBe("already_ended");
      } else {
        await expect(result).rejects.toMatchObject({
          code: "provider_error",
          details: { operation: "cancel" },
        });
        expect(logged()).toContain("cancel refused for a live subscription");
      }
      expect(dodo.callsTo(`GET /subscriptions/${SUB_1}`)).toHaveLength(1);
      if (cancelAtNextBillingDate) expect(logged()).toContain("billing.cancel_already_scheduled");
    },
  );

  it("counts a cancel Dodo refuses because it already ended as done, without a failNext", async () => {
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "expired" });
    expect(await endSubscription(SUB_1)).toBe("already_ended");
  });

  it("logs a subscription Dodo can't find with the mode, and keeps the refusal", async () => {
    await expect(endSubscription(SUB_2)).rejects.toMatchObject({
      code: "refused",
      details: { operation: "cancel", providerStatus: 404, reason: "not_found" },
    });
    expect(dodo.callsTo(`GET /subscriptions/${SUB_2}`)).toHaveLength(1);
    const notFound = sinks[2]!.mock.calls.find((call) =>
      JSON.stringify(call).includes("billing.cancel_not_found"),
    );
    expect(JSON.stringify(notFound)).toContain(SUB_2);
    expect(JSON.stringify(notFound)).toContain('"environment":"test"');
  });

  it("doesn't read back after a server error or a refusal outside the cancel table", async () => {
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    dodo.failNext(`PATCH /subscriptions/${SUB_1}`, 503);
    await expect(endSubscription(SUB_1)).rejects.toMatchObject({ code: "provider_error" });
    dodo.failNext(`PATCH /subscriptions/${SUB_1}`, 403);
    await expect(endSubscription(SUB_1)).rejects.toMatchObject({
      code: "refused",
      details: { operation: "cancel", providerStatus: 403, reason: "misconfigured" },
    });
    expect(dodo.callsTo("GET")).toEqual([]);
  });
});

describe("changePlan", () => {
  it("moves a paid plan now, keeping the cycle, and a trial at full price, both only if paid", async () => {
    dodo.subscriptions.push(
      { id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" },
      { id: SUB_2, customer: CUS_1, product: PRO_TRIAL, status: "active", trial: true },
    );
    await expect(changePlan(SUB_1, MAX_MONTH, { fromTrial: false })).resolves.toBeUndefined();
    await expect(changePlan(SUB_2, MAX_YEAR, { fromTrial: true })).resolves.toBeUndefined();
    expect(bodyOf(`POST /subscriptions/${SUB_1}/change-plan`)).toEqual({
      product_id: MAX_MONTH,
      quantity: 1,
      proration_billing_mode: "prorated_immediately_keep_cycle",
      effective_at: "immediately",
      on_payment_failure: "prevent_change",
    });
    expect(bodyOf(`POST /subscriptions/${SUB_2}/change-plan`)).toEqual({
      product_id: MAX_YEAR,
      quantity: 1,
      proration_billing_mode: "full_immediately",
      effective_at: "immediately",
      on_payment_failure: "prevent_change",
    });
    expect(dodo.subscriptions.map(({ product, trial }) => [product, trial ?? false])).toEqual([
      [MAX_MONTH, false],
      [MAX_YEAR, false],
    ]);
  });

  it("refuses an id or a product that isn't Dodo's before any request", async () => {
    await expect(changePlan(PADDLE_SUB, MAX_MONTH, { fromTrial: false })).rejects.toMatchObject({
      code: "no_subscription",
      details: { operation: "change_plan" },
    });
    for (const product of [PADDLE_PRI, "prod_creem_max", ""]) {
      await expect(changePlan(SUB_1, product, { fromTrial: true })).rejects.toMatchObject({
        code: "unavailable",
      });
    }
    expect(fetched()).toEqual([]);
  });

  it("passes on Dodo's refusal to change a subscription set to cancel", async () => {
    dodo.subscriptions.push({
      id: SUB_1,
      customer: CUS_1,
      product: PRO_TRIAL,
      status: "active",
      trial: true,
      cancelAtNextBillingDate: true,
    });
    await expect(changePlan(SUB_1, MAX_MONTH, { fromTrial: true })).rejects.toMatchObject({
      code: "refused",
      details: { providerStatus: 409, reason: "inactive" },
    });
  });
});

describe("customersWithEmail", () => {
  it("keeps only exact matches of the normalized email", async () => {
    const [a, b, near, longer] = ["a", "b", "near", "longer"].map((name) => dodoId("cus", name));
    dodo.customers.push(
      { id: a!, email: "ada@example.com" },
      { id: b!, email: "ADA@Example.com" },
      { id: near!, email: "bada@example.com" },
      { id: longer!, email: "ada@example.com.evil.test" },
    );
    expect(await customersWithEmail("  Ada@Example.com ")).toEqual([a, b]);
    const query = dodo.callsTo("GET /customers")[0]?.query;
    expect(query?.get("email")).toBe("ada@example.com");
    expect(query?.get("page_size")).toBe("100");
  });

  it("drops ids that aren't Dodo's even on an exact match, and asks nothing for a blank email", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { customer_id: PADDLE_CTM, email: "ada@example.com" },
            { customer_id: CREEM_CUSTOMER, email: "ada@example.com" },
            { customer_id: CUS_1, email: null },
          ],
        }),
      ),
    );
    expect(await customersWithEmail("ada@example.com")).toEqual([]);
    expect(await customersWithEmail("   ")).toEqual([]);
    expect(fetched()).toHaveLength(1);
  });
});

describe("listLiveSubscriptions", () => {
  it("asks for nothing without a customer or an email", async () => {
    expect(await listLiveSubscriptions({ customerId: null, email: null })).toEqual([]);
    expect(await listLiveSubscriptions({ email: "nobody@example.com" })).toEqual([]);
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["GET /customers"]);
  });

  it("lists the live subscriptions of the stored and the same-email customers", async () => {
    const [stored, mail, someone] = ["stored", "mail", "someone"].map((name) =>
      dodoId("cus", name),
    );
    const id = (name: string) => dodoId("sub", name);
    dodo.customers.push({ id: mail!, email: "ada@example.com" });
    dodo.subscriptions.push(
      { id: id("a"), customer: stored!, product: PRO_MONTH, status: "past_due" },
      { id: id("b"), customer: mail!, product: MAX_MONTH, status: "on_hold" },
      { id: id("c"), customer: mail!, product: PRO_MONTH, status: "cancelled" },
      { id: id("d"), customer: someone!, product: PRO_MONTH, status: "active" },
      { id: id("e"), customer: stored!, product: PRO_MONTH, status: "pending" },
      { id: id("f"), customer: mail!, product: PRO_MONTH, status: "paused" },
      { id: id("g"), customer: stored!, product: PRO_MONTH, status: "expired" },
      { id: id("h"), customer: mail!, product: PRO_MONTH, status: "failed" },
      { id: id("i"), customer: stored!, product: PRO_TRIAL, status: "active", trial: true },
    );
    const live = await listLiveSubscriptions({ customerId: stored, email: "Ada@Example.com" });
    expect(live.map((subscription) => subscription.subscription_id)).toEqual([
      id("a"),
      id("e"),
      id("i"),
      id("b"),
      id("f"),
    ]);
    const asked = dodo.callsTo("GET /subscriptions").map((call) => call.query);
    expect(asked.map((query) => query.get("customer_id"))).toEqual([stored, mail]);
    expect(asked.map((query) => query.get("page_size"))).toEqual(["100", "100"]);
    expect(asked.some((query) => query.has("status"))).toBe(false);
  });

  it("skips a stored customer id that isn't Dodo's, going by the email alone", async () => {
    expect(await listLiveSubscriptions({ customerId: PADDLE_CTM })).toEqual([]);
    expect(await listLiveSubscriptions({ customerId: CREEM_CUSTOMER })).toEqual([]);
    expect(fetched()).toEqual([]);

    dodo.customers.push({ id: CUS_1, email: "ada@example.com" });
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    const live = await listLiveSubscriptions({ customerId: PADDLE_CTM, email: "ada@example.com" });
    expect(live.map((subscription) => subscription.subscription_id)).toEqual([SUB_1]);
    expect(dodo.callsTo("GET /subscriptions").map((call) => call.query.get("customer_id"))).toEqual(
      [CUS_1],
    );
  });

  it("asks once for a customer found both ways", async () => {
    dodo.customers.push({ id: CUS_1, email: "ada@example.com" });
    dodo.subscriptions.push({ id: SUB_1, customer: CUS_1, product: PRO_MONTH, status: "active" });
    const live = await listLiveSubscriptions({ customerId: CUS_1, email: "ada@example.com" });
    expect(live).toHaveLength(1);
    expect(dodo.callsTo("GET /subscriptions")).toHaveLength(1);
  });

  it("ignores a subscription Dodo lists under another customer", async () => {
    const other = dodoId("cus", "other");
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              subscription_id: SUB_1,
              status: "active",
              product_id: PRO_MONTH,
              customer: { customer_id: other },
            },
          ],
        }),
      ),
    );
    expect(await listLiveSubscriptions({ customerId: CUS_1 })).toEqual([]);
  });

  it("asks about five customers at most, and warns about the rest", async () => {
    for (let index = 0; index < 7; index += 1) {
      dodo.customers.push({ id: dodoId("cus", index), email: "ada@example.com" });
    }
    await listLiveSubscriptions({ customerId: CUS_1, email: "ada@example.com" });
    const asked = dodo.callsTo("GET /subscriptions").map((call) => call.query.get("customer_id"));
    expect(asked).toEqual([CUS_1, ...[0, 2, 3, 4].map((index) => dodoId("cus", index))]);
    expect(logged()).toContain("billing.customer_limit");
    expect(logged()).not.toContain("ada@example.com");
  });

  it("warns when a page is full", async () => {
    for (let index = 0; index < 120; index += 1) {
      dodo.subscriptions.push({
        id: dodoId("sub", `s${index}`),
        customer: CUS_1,
        product: PRO_MONTH,
        status: "active",
      });
    }
    expect(await listLiveSubscriptions({ customerId: CUS_1 })).toHaveLength(100);
    expect(logged()).toContain("billing.page_full");
  });
});

describe("createCheckout", () => {
  it("opens a signed checkout for the stored customer, with our return and cancel URLs", async () => {
    const checkout = await checkoutFor();
    const session = dodo.checkouts[0]!;
    expect(checkout).toEqual({
      url: `https://test.checkout.dodopayments.com/session/${session.id}`,
    });
    const body = bodyOf("POST /checkouts");
    expect(body).toEqual({
      product_cart: [{ product_id: PRO_MONTH, quantity: 1 }],
      customer: { customer_id: CUS_1 },
      metadata: {
        user_id: "u1",
        user_sig: expect.any(String),
        plan: "pro",
        interval: "month",
        trial: "false",
      },
      return_url: `${APP}/api/billing/return?plan=pro`,
      cancel_url: `${APP}/account?checkout=cancelled`,
      feature_flags: {
        allow_customer_editing_email: false,
        allow_discount_code: false,
        redirect_immediately: true,
      },
      customization: { theme: "system" },
    });
    expect(body).not.toHaveProperty("subscription_data");
    const sig = (body?.metadata as Record<string, unknown>).user_sig;
    expect(verifyBillingId("u1", sig, SECRET)).toBe(true);
    expect(verifyBillingId("u2", sig, SECRET)).toBe(false);
    expect(verifyBillingId("u1", sig, "another-signing-secret")).toBe(false);
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /checkouts"]);
  });

  it("sends the normalized email when no Dodo customer is stored", async () => {
    for (const customerId of [null, PADDLE_CTM, CREEM_CUSTOMER]) {
      await checkoutFor({ customerId, email: "  Ada@Example.com " });
    }
    expect(dodo.checkouts.map(({ body }) => body.customer)).toEqual([
      { email: "ada@example.com" },
      { email: "ada@example.com" },
      { email: "ada@example.com" },
    ]);
    const sent = JSON.stringify(dodo.calls.map((call) => [call.query.toString(), call.body]));
    expect(sent).not.toContain(PADDLE_CTM);
    expect(sent).not.toContain(CREEM_CUSTOMER);
  });

  it("marks the trial, the plan and the interval in the metadata and the return URL", async () => {
    await checkoutFor({ productId: PRO_TRIAL, trial: true });
    await checkoutFor({ productId: MAX_YEAR, plan: "max", interval: "year" });
    const [trial, max] = dodo.checkouts.map(({ body }) => body);
    expect(trial).toMatchObject({
      product_cart: [{ product_id: PRO_TRIAL, quantity: 1 }],
      metadata: { plan: "pro", interval: "month", trial: "true" },
      return_url: `${APP}/api/billing/return?plan=pro&trial=1`,
    });
    expect(max).toMatchObject({
      product_cart: [{ product_id: MAX_YEAR, quantity: 1 }],
      metadata: { plan: "max", interval: "year", trial: "false" },
      return_url: `${APP}/api/billing/return?plan=max`,
    });
  });

  it("signs the trial it replaces", async () => {
    const trial = dodoId("sub", "trial");
    await checkoutFor({ productId: MAX_MONTH, plan: "max", replacesSubscriptionId: trial });
    const metadata = bodyOf("POST /checkouts")?.metadata as Record<string, unknown>;
    expect(Object.keys(metadata).sort()).toEqual([
      "interval",
      "plan",
      "replaces_sig",
      "replaces_subscription_id",
      "trial",
      "user_id",
      "user_sig",
    ]);
    expect(metadata.replaces_subscription_id).toBe(trial);
    expect(verifyBillingId(trial, metadata.replaces_sig, SECRET)).toBe(true);
  });

  it("refuses before any request without the signing secret, or with ids that aren't Dodo's", async () => {
    useEnv({ BILLING_SIGNING_SECRET: undefined });
    await expect(checkoutFor()).rejects.toMatchObject({ code: "unavailable" });
    useEnv({ BILLING_SIGNING_SECRET: SECRET });
    for (const productId of [PADDLE_PRI, "prod_creem_pro"]) {
      await expect(checkoutFor({ productId })).rejects.toMatchObject({ code: "unavailable" });
    }
    await expect(checkoutFor({ replacesSubscriptionId: PADDLE_SUB })).rejects.toMatchObject({
      code: "no_subscription",
      details: { operation: "checkout" },
    });
    expect(fetched()).toEqual([]);
  });

  it.each<string | null>([null, "", "http://checkout.example/session/cks_1", "not a url"])(
    "reports a session whose checkout link is %j as a provider error",
    async (link) => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ session_id: "cks_1", checkout_url: link })),
      );
      await expect(checkoutFor()).rejects.toMatchObject({
        code: "provider_error",
        details: { operation: "checkout" },
      });
    },
  );
});

describe("portalUrl", () => {
  it("opens a portal session that returns to the account page, without emailing", async () => {
    expect(await portalUrl(CUS_1)).toBe(`https://customer-portal.dodo.test/${CUS_1}`);
    const call = dodo.callsTo(`POST /customers/${CUS_1}/customer-portal/session`)[0];
    expect(call?.query.get("return_url")).toBe(`${APP}/account`);
    expect(call?.query.get("send_email")).toBe("false");
    expect(call?.body).toBeUndefined();
  });

  it("has nothing to manage for a customer that isn't Dodo's", async () => {
    for (const id of [PADDLE_CTM, CREEM_CUSTOMER, SUB_1]) {
      await expect(portalUrl(id)).rejects.toMatchObject({
        code: "no_subscription",
        details: { operation: "portal" },
      });
    }
    expect(fetched()).toEqual([]);
  });

  it("reports a session without a usable link as a provider error", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ link: null })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ link: "javascript:alert(1)" })));
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(portalUrl(CUS_1)).rejects.toMatchObject({
        code: "provider_error",
        details: { operation: "portal" },
      });
    }
  });
});

describe("succeededPayments", () => {
  it("lists the subscription's succeeded payments", async () => {
    const [first, failed, other, renewal] = ["first", "failed", "other", "renewal"].map((name) =>
      dodoId("pay", name),
    );
    dodo.payments.push(
      { id: first!, subscription: SUB_1, status: "succeeded" },
      { id: failed!, subscription: SUB_1, status: "failed" },
      { id: other!, subscription: SUB_2, status: "succeeded" },
      { id: renewal!, subscription: SUB_1, status: "succeeded", chargeType: "renewal" },
    );
    expect(await succeededPayments(SUB_1)).toEqual([first, renewal]);
    const query = dodo.callsTo("GET /payments")[0]?.query;
    expect(query?.get("subscription_id")).toBe(SUB_1);
    expect(query?.get("status")).toBe("succeeded");
    expect(query?.get("page_size")).toBe("100");
  });

  it("never returns a payment of another subscription, one that didn't succeed, or a foreign id", async () => {
    const [a, b, c, d, e] = ["a", "b", "c", "d", "e"].map((name) => dodoId("pay", name));
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            { payment_id: a, status: "succeeded", subscription_id: SUB_2 },
            { payment_id: b, status: "failed", subscription_id: SUB_1 },
            { payment_id: c, status: null, subscription_id: null, subscription_ids: [SUB_1] },
            { payment_id: d, status: "succeeded" },
            {
              payment_id: e,
              status: "succeeded",
              subscription_id: null,
              subscription_ids: [SUB_2],
            },
            { payment_id: PADDLE_TXN, status: "succeeded", subscription_id: SUB_1 },
            { payment_id: c, status: "succeeded", subscription_id: SUB_1 },
          ],
        }),
      ),
    );
    expect(await succeededPayments(SUB_1)).toEqual([c, d]);
  });

  it("asks nothing for a subscription id that isn't Dodo's", async () => {
    await expect(succeededPayments(PADDLE_SUB)).rejects.toMatchObject({
      code: "no_subscription",
      details: { operation: "refund" },
    });
    expect(fetched()).toEqual([]);
  });
});

describe("refundPayment", () => {
  it("refunds the whole payment with a fixed reason, and counts a second refund as done", async () => {
    dodo.payments.push({ id: PAY_1, subscription: SUB_1, status: "succeeded" });
    expect(await refundPayment(PAY_1)).toBe("refunded");
    expect(bodyOf("POST /refunds")).toEqual({ payment_id: PAY_1, reason: REFUND_REASON });
    expect(dodo.refunds).toHaveLength(1);
    expect(await refundPayment(PAY_1)).toBe("already_refunded");
    expect(dodo.refunds).toHaveLength(1);
    expect(logged()).toContain("billing.refund_already_done");
  });

  it.each([
    "PAYMENT_ALREADY_REFUNDED",
    "EXISTING_REFUND_REQUEST_PROCESSING",
    "PaymentHasBeenRefunded",
    "NOTHING_TO_REFUND",
  ])("counts a %s refusal as done", async (code) => {
    dodo.failNext("POST /refunds", 422, 1, code);
    expect(await refundPayment(PAY_1)).toBe("already_refunded");
  });

  it("passes on any other refusal", async () => {
    dodo.failNext("POST /refunds", 422, 1, "REFUND_WINDOW_EXPIRED");
    await expect(refundPayment(PAY_1)).rejects.toMatchObject({
      code: "refused",
      details: { operation: "refund", providerCode: "refund_window_expired" },
    });
    dodo.failNext("POST /refunds", 403, 1, "INSUFFICIENT_PERMISSION");
    await expect(refundPayment(PAY_1)).rejects.toMatchObject({
      code: "refused",
      details: { operation: "refund", reason: "misconfigured" },
    });
  });

  it("refuses a payment id that isn't Dodo's before any request", async () => {
    for (const id of [PADDLE_TXN, "pay_1", SUB_1]) {
      await expect(refundPayment(id)).rejects.toMatchObject({
        code: "provider_error",
        details: { operation: "refund" },
      });
    }
    expect(fetched()).toEqual([]);
  });
});

describe("foreign ids", () => {
  it("never sends a Paddle-shaped id to Dodo, from any call", async () => {
    await Promise.allSettled([
      getSubscription(PADDLE_SUB),
      cancelSubscription(PADDLE_SUB, { immediately: true }),
      cancelSubscription(PADDLE_SUB, { immediately: false }),
      endSubscription(PADDLE_SUB),
      changePlan(PADDLE_SUB, MAX_MONTH, { fromTrial: false }),
      changePlan(SUB_1, PADDLE_PRI, { fromTrial: true }),
      listLiveSubscriptions({ customerId: PADDLE_CTM }),
      checkoutFor({ productId: PADDLE_PRI }),
      checkoutFor({ customerId: PADDLE_CTM }),
      checkoutFor({ replacesSubscriptionId: PADDLE_SUB }),
      portalUrl(PADDLE_CTM),
      succeededPayments(PADDLE_SUB),
      refundPayment(PADDLE_TXN),
    ]);
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["POST /checkouts"]);
    const sent = JSON.stringify(
      dodo.calls.map((call) => [call.path, call.query.toString(), call.body]),
    );
    for (const id of [PADDLE_SUB, PADDLE_CTM, PADDLE_PRI, PADDLE_TXN]) {
      expect(sent).not.toContain(id);
    }
  });
});
