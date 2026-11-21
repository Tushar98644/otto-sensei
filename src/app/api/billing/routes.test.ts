import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { signBillingId } from "@/lib/billing/billing-sign";
import { dodoId, installFakeDodo, type FakeDodo } from "@/lib/billing/dodo-testing";
import { resetEnvForTests } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/users";
import { POST as checkout } from "./checkout/route";
import { POST as portal } from "./portal/route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const currentUser = vi.mocked(getCurrentUser);
const limiter = vi.mocked(rateLimit);

const APP_URL = "https://otto.example";
const SIGNING_SECRET = "billing_signing_secret_for_route_tests";
const PRO_MONTH = dodoId("pdt", "promonth");
const PRO_TRIAL = dodoId("pdt", "protrial");
const MAX_MONTH = dodoId("pdt", "maxmonth");
const SUB_1 = dodoId("sub", 1);
const CUS_1 = dodoId("cus", 1);
// Paddle-sandbox and Creem ids that may still be stored: never sent to Dodo.
const PADDLE_CUSTOMER = `ctm_${"a1".repeat(13)}`;
const PADDLE_SUBSCRIPTION = `sub_${"b2".repeat(13)}`;
const CREEM_CUSTOMER = "cust_3kKw0VQ8bY1lN3m9";

const DODO_UNSET = {
  DODO_API_KEY: undefined,
  DODO_WEBHOOK_SECRET: undefined,
  DODO_ENVIRONMENT: undefined,
  BILLING_SIGNING_SECRET: undefined,
  DODO_PRO_MONTHLY_PRODUCT_ID: undefined,
  DODO_PRO_YEARLY_PRODUCT_ID: undefined,
  DODO_MAX_MONTHLY_PRODUCT_ID: undefined,
  DODO_MAX_YEARLY_PRODUCT_ID: undefined,
  DODO_PRO_TRIAL_PRODUCT_ID: undefined,
};
const DODO = {
  DODO_API_KEY: "dodo_test_apikey_for_route_tests",
  DODO_WEBHOOK_SECRET: `whsec_${Buffer.from("otto-route-test-webhook-key").toString("base64")}`,
  BILLING_SIGNING_SECRET: SIGNING_SECRET,
  DODO_PRO_MONTHLY_PRODUCT_ID: PRO_MONTH,
  DODO_PRO_TRIAL_PRODUCT_ID: PRO_TRIAL,
  DODO_MAX_MONTHLY_PRODUCT_ID: MAX_MONTH,
};

const hosted = (n: number) =>
  `https://test.checkout.dodopayments.com/session/cks_${String(n).padStart(21, "0")}`;
const portalLink = (customer: string) => `https://customer-portal.dodo.test/${customer}`;
const changeBody = (product: string, mode: string) => ({
  product_id: product,
  quantity: 1,
  proration_billing_mode: mode,
  effective_at: "immediately",
  on_payment_failure: "prevent_change",
});

type UserRow = typeof users.$inferSelect;

let sequence = 0;

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

async function signIn(overrides: Partial<typeof users.$inferInsert> = {}): Promise<SessionUser> {
  sequence += 1;
  const row = {
    id: crypto.randomUUID(),
    email: `person${sequence}@example.com`,
    plan: "free" as const,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
  await insertUserRow(row);
  const user: SessionUser = toSessionUser((await reload(row.id))!);
  currentUser.mockResolvedValue(user);
  return user;
}

function checkoutRequest(body?: unknown): Request {
  return new Request(`${APP_URL}/api/billing/checkout`, {
    method: "POST",
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
}

async function reload(id: string): Promise<UserRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

beforeEach(async () => {
  useEnv({ NEXT_PUBLIC_APP_URL: APP_URL, ...DODO_UNSET });
  currentUser.mockReset();
  currentUser.mockResolvedValue(null);
  limiter.mockReset();
  limiter.mockResolvedValue({ allowed: true, remaining: 19, retryAfterMs: 0 });
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("POST /api/billing/checkout", () => {
  it("asks for sign-in first", async () => {
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "unauthorized", message: "Sign in to upgrade." },
    });
    expect(limiter).not.toHaveBeenCalled();
  });

  it("returns where to send the browser: a new account starts on the Pro trial", async () => {
    const user = await signIn();
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      url: "/account?checkout=success&plan=pro&trial=1",
    });
    expect(limiter).toHaveBeenCalledWith(`billing:user:${user.id}`, 20, 60 * 60 * 1000);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "mock_trialing" });
  });

  it("gives someone who has had a plan before the plain checkout, with no trial", async () => {
    const user = await signIn({ planStatus: "mock_cancelled" });
    const res = await checkout(checkoutRequest());
    expect(await res.json()).toEqual({ ok: true, url: "/account?checkout=success&plan=pro" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", trialEndsAt: null });
  });

  it("tells a Pro user they're already subscribed", async () => {
    await signIn({ plan: "pro", planStatus: "mock_active" });
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "bad_request", message: "You're already on that plan." },
    });
  });

  it("answers 503 when payments are switched off", async () => {
    useEnv({ NODE_ENV: "production" });
    const user = await signIn();
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "billing_unavailable" } });
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("limits how often one user can ask for links", async () => {
    await signIn();
    limiter.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 120_000 });
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "rate_limited", message: "Too many tries. Try again in 2 minutes." },
    });
  });

  it("hides the details of unexpected errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    currentUser.mockRejectedValue(new Error("connection reset reading /srv/otto/secrets"));
    const res = await checkout(checkoutRequest());
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({
      ok: false,
      error: { code: "server_error", message: "Something went wrong. Please try again." },
    });
    expect(text).not.toContain("/srv/otto/secrets");
  });

  it("in mock checkout, sells yearly without any product set", async () => {
    const user = await signIn();
    const res = await checkout(checkoutRequest({ interval: "year" }));
    expect(res.status).toBe(200);
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("refuses an interval it doesn't know", async () => {
    await signIn();
    const res = await checkout(checkoutRequest({ interval: "fortnight" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "bad_request" } });
  });
});

describe("POST /api/billing/checkout with Dodo", () => {
  let dodo: FakeDodo;

  beforeEach(() => {
    useEnv(DODO);
    dodo = installFakeDodo();
  });

  const writes = () => dodo.calls.filter((call) => call.method !== "GET");
  const sentAnywhere = (value: string) =>
    dodo.calls.some((call) =>
      `${call.path}?${call.query.toString()} ${JSON.stringify(call.body ?? "")}`.includes(value),
    );

  const subscriber = async (
    status: "trialing" | "active" | "past_due",
    fake: { cancelAtNextBillingDate?: boolean } = {},
  ) => {
    const user = await signIn({
      plan: "pro",
      planInterval: "month",
      planStatus: status,
      trialEndsAt: status === "trialing" ? Date.now() + 86_400_000 : null,
      billingCustomerId: CUS_1,
      billingSubscriptionId: SUB_1,
    });
    dodo.customers.push({ id: CUS_1, email: user.email });
    dodo.subscriptions.push({
      id: SUB_1,
      customer: CUS_1,
      product: status === "trialing" ? PRO_TRIAL : PRO_MONTH,
      status: status === "past_due" ? "past_due" : "active",
      trial: status === "trialing",
      ...fake,
    });
    return user;
  };

  it("returns Dodo's hosted checkout for a new account, on the trial", async () => {
    const user = await signIn();
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: hosted(1) });
    expect(dodo.callsTo("POST /checkouts")).toHaveLength(1);
    expect(dodo.callsTo("POST /checkouts")[0]?.body).toEqual({
      product_cart: [{ product_id: PRO_TRIAL, quantity: 1 }],
      billing_currency: "USD",
      customer: { email: user.email },
      metadata: {
        user_id: user.id,
        user_sig: signBillingId(user.id, SIGNING_SECRET),
        plan: "pro",
        interval: "month",
        trial: "true",
      },
      return_url: `${APP_URL}/api/billing/return?plan=pro&trial=1`,
      cancel_url: `${APP_URL}/account?checkout=cancelled`,
      feature_flags: {
        allow_customer_editing_email: false,
        allow_discount_code: false,
        redirect_immediately: true,
      },
      customization: { theme: "system" },
    });
    expect(limiter).toHaveBeenCalledWith(`billing:user:${user.id}`, 20, 60 * 60 * 1000);
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("sells a returning buyer the plain plan under their stored Dodo customer", async () => {
    const user = await signIn({
      planStatus: "canceled",
      billingCustomerId: CUS_1,
      billingSubscriptionId: SUB_1,
    });
    dodo.customers.push({ id: CUS_1, email: user.email });
    dodo.subscriptions.push({
      id: SUB_1,
      customer: CUS_1,
      product: PRO_MONTH,
      status: "cancelled",
    });
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));

    expect(await res.json()).toEqual({ ok: true, url: hosted(1) });
    expect(dodo.callsTo("POST /checkouts")[0]?.body).toMatchObject({
      product_cart: [{ product_id: MAX_MONTH, quantity: 1 }],
      billing_currency: "USD",
      customer: { customer_id: CUS_1 },
      metadata: { user_id: user.id, plan: "max", interval: "month", trial: "false" },
      return_url: `${APP_URL}/api/billing/return?plan=max`,
    });
  });

  it("never sends a Paddle-shaped stored customer or subscription to Dodo", async () => {
    const user = await signIn({
      planStatus: "canceled",
      billingCustomerId: PADDLE_CUSTOMER,
      billingSubscriptionId: PADDLE_SUBSCRIPTION,
    });
    const res = await checkout(checkoutRequest());

    expect(await res.json()).toEqual({ ok: true, url: hosted(1) });
    expect(dodo.callsTo("POST /checkouts")[0]?.body).toMatchObject({
      customer: { email: user.email },
      product_cart: [{ product_id: PRO_MONTH, quantity: 1 }],
      billing_currency: "USD",
    });
    expect(sentAnywhere(PADDLE_CUSTOMER)).toBe(false);
    expect(sentAnywhere(PADDLE_SUBSCRIPTION)).toBe(false);
  });

  it("upgrades someone on the Pro trial to Max in place, with no checkout page", async () => {
    await subscriber("trialing");
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: "/account?checkout=success&plan=max" });
    expect(writes().map((call) => [`${call.method} ${call.path}`, call.body])).toEqual([
      [`POST /subscriptions/${SUB_1}/change-plan`, changeBody(MAX_MONTH, "full_immediately")],
    ]);
    expect(dodo.callsTo("POST /checkouts")).toEqual([]);
  });

  it("moves a paying Pro subscriber to Max on the same billing cycle", async () => {
    await subscriber("active");
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));

    expect(await res.json()).toEqual({ ok: true, url: "/account?checkout=success&plan=max" });
    expect(writes().map((call) => [`${call.method} ${call.path}`, call.body])).toEqual([
      [
        `POST /subscriptions/${SUB_1}/change-plan`,
        changeBody(MAX_MONTH, "prorated_immediately_keep_cycle"),
      ],
    ]);
  });

  it("sends a trial that is set to end to Manage billing instead of changing it", async () => {
    await subscriber("trialing", { cancelAtNextBillingDate: true });
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));

    expect(await res.json()).toEqual({ ok: true, url: portalLink(CUS_1) });
    expect(writes().map((call) => `${call.method} ${call.path}`)).toEqual([
      `POST /customers/${CUS_1}/customer-portal/session`,
    ]);
  });

  it.each([
    [
      409,
      "PENDING_PLAN_CHANGE_EXISTS",
      409,
      "your subscription is busy with a renewal or another change. Try again in a little while.",
    ],
    [
      409,
      "PLAN_CHANGE_NOT_ALLOWED_FOR_SCHEDULED_CANCELLATION",
      409,
      "your subscription isn't active right now. Refresh the page and try again.",
    ],
    [
      422,
      "InactiveSubscriptionPlanChangeNotSupported",
      409,
      "your subscription isn't active right now. Refresh the page and try again.",
    ],
    [
      402,
      "CARD_DECLINED",
      409,
      "your card was declined. Update your card in Manage billing, then try again.",
    ],
    [
      403,
      "INSUFFICIENT_PERMISSION",
      502,
      "payments aren't set up right on our side. Please try again later.",
    ],
    [429, undefined, 503, "our payment provider is busy. Please try again in a minute."],
    [404, undefined, 409, "we couldn't find your subscription. Refresh the page and try again."],
    [422, "SOMETHING_NEW", 409, "our payment provider turned the request down. Email us at"],
  ])(
    "says plainly why Dodo refused a plan change (%i %s)",
    async (providerStatus, code, status, explanation) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await subscriber("active");
      dodo.failNext(`POST /subscriptions/${SUB_1}/change-plan`, providerStatus, 1, code);
      const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));

      expect(res.status).toBe(status);
      const body = (await res.json()) as { ok: false; error: { code: string; message: string } };
      expect(body.error.code).toBe("plan_change_failed");
      expect(body.error.message.startsWith(`We couldn't change your plan: ${explanation}`)).toBe(
        true,
      );
      expect(dodo.callsTo(`POST /subscriptions/${SUB_1}/change-plan`)).toHaveLength(1);
    },
  );

  it("answers a second subscription Dodo refuses like the one we refuse ourselves", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signIn();
    dodo.failNext("POST /checkouts", 409, 1, "CUSTOMER_HAS_EXISTING_SUBSCRIPTION");
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "bad_request", message: "You're already on that plan." },
    });
  });

  it("names the missing product when Dodo can't find it at checkout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signIn();
    dodo.failNext("POST /checkouts", 404, 1, "PRODUCT_NOT_FOUND");
    const res = await checkout(checkoutRequest());

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "billing_unavailable",
        message:
          "We couldn't start checkout: that plan isn't on sale right now. Refresh the page and try again.",
      },
    });
  });

  it("asks a subscriber whose renewal failed to fix the card first", async () => {
    await subscriber("past_due");
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "plan_change_failed",
        message:
          "We couldn't change your plan: your last payment didn't go through. Update your card in Manage billing, then try again.",
      },
    });
    expect(writes()).toEqual([]);
  });

  it("answers 503 when Dodo can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signIn();
    dodo.failNext("POST /checkouts", 502);
    const res = await checkout(checkoutRequest());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "billing_unavailable",
        message: "We couldn't reach our payment provider. Please try again in a minute.",
      },
    });
    expect(dodo.callsTo("POST /checkouts")).toHaveLength(1);
  });

  it("asks Dodo for nothing once the link limit is reached", async () => {
    await signIn();
    limiter.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 60_000 });
    const res = await checkout(checkoutRequest());
    expect(res.status).toBe(429);
    expect(dodo.calls).toEqual([]);
  });
});

describe("POST /api/billing/portal", () => {
  it("asks for sign-in first", async () => {
    const res = await portal();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "unauthorized" } });
  });

  it("says when there's nothing to manage", async () => {
    await signIn();
    const res = await portal();

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "bad_request", message: "You don't have a subscription to manage yet." },
    });
  });

  it("returns the portal URL for a subscriber", async () => {
    const user = await signIn({ plan: "pro", planStatus: "mock_active" });
    const res = await portal();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: "/account?portal=mock" });
    expect((await reload(user.id))?.plan).toBe("free");
  });
});

describe("POST /api/billing/portal with Dodo", () => {
  let dodo: FakeDodo;

  beforeEach(() => {
    useEnv(DODO);
    dodo = installFakeDodo();
  });

  const subscriber = () =>
    signIn({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: CUS_1,
      billingSubscriptionId: SUB_1,
    });

  it("returns a fresh Dodo portal link for the stored customer, within the link limit", async () => {
    const user = await subscriber();
    const res = await portal();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: portalLink(CUS_1) });
    const [session, ...rest] = dodo.callsTo(`POST /customers/${CUS_1}/customer-portal/session`);
    expect(rest).toEqual([]);
    expect(Object.fromEntries(session!.query)).toEqual({
      return_url: `${APP_URL}/account`,
      send_email: "false",
    });
    expect(limiter).toHaveBeenCalledWith(`billing:user:${user.id}`, 20, 60 * 60 * 1000);
  });

  it("says when there's no billing account to manage", async () => {
    await signIn();
    const res = await portal();
    expect(res.status).toBe(400);
    expect(dodo.calls).toEqual([]);
  });

  it.each([
    ["Paddle", PADDLE_CUSTOMER],
    ["Creem", CREEM_CUSTOMER],
  ])(
    "has nothing to manage for a customer left over from %s, and doesn't ask Dodo",
    async (_, id) => {
      await signIn({ plan: "pro", planStatus: "active", billingCustomerId: id });
      const res = await portal();
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "bad_request" } });
      expect(dodo.calls).toEqual([]);
    },
  );

  it("says Dodo couldn't find the billing account, and when payments are set up wrong", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await subscriber();
    const session = `POST /customers/${CUS_1}/customer-portal/session`;

    dodo.failNext(session, 404);
    const missing = await portal();
    expect(missing.status).toBe(409);
    expect(await missing.json()).toEqual({
      ok: false,
      error: {
        code: "billing_unavailable",
        message:
          "We couldn't open billing: we couldn't find your billing account. Refresh the page and try again.",
      },
    });

    dodo.failNext(session, 401);
    const misconfigured = await portal();
    expect(misconfigured.status).toBe(502);
    expect(await misconfigured.json()).toEqual({
      ok: false,
      error: {
        code: "billing_unavailable",
        message:
          "We couldn't open billing: payments aren't set up right on our side. Please try again later.",
      },
    });
  });
});
