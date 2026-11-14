import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { installFakePaddle, paddleId } from "@/lib/billing/testing";
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

const SECRET = "pdl_ntfset_otto_route_test_secret";
const PRICE_ID = paddleId("pri", "ottopro");
const TRIAL_PRICE_ID = paddleId("pri", "ottotrial");
const MAX_PRICE_ID = paddleId("pri", "ottomax");
const SUB_1 = paddleId("sub", 1);
const CTM_1 = paddleId("ctm", 1);
const TXN_1 = paddleId("txn", 1);

type UserRow = typeof users.$inferSelect;

let sequence = 0;

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
  return new Request("http://localhost/api/billing/checkout", {
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
  vi.stubEnv("PADDLE_API_KEY", undefined);
  vi.stubEnv("PADDLE_PRO_MONTHLY_PRICE_ID", PRICE_ID);
  vi.stubEnv("PADDLE_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("NEXT_PUBLIC_PADDLE_CLIENT_TOKEN", "test_otto_client_token");
  resetEnvForTests();
  currentUser.mockReset();
  currentUser.mockResolvedValue(null);
  limiter.mockReset();
  limiter.mockResolvedValue({ allowed: true, remaining: 19, retryAfterMs: 0 });
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
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
    expect(await res.json()).toEqual({ ok: true, url: "/account?checkout=success&plan=pro&trial=1" });
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
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PADDLE_WEBHOOK_SECRET", undefined);
    resetEnvForTests();
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

  it("in mock checkout, sells yearly without any price set", async () => {
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

describe("POST /api/billing/checkout with Paddle", () => {
  beforeEach(() => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_sdbx_apikey_test");
    vi.stubEnv("PADDLE_PRO_TRIAL_PRICE_ID", TRIAL_PRICE_ID);
    vi.stubEnv("PADDLE_MAX_MONTHLY_PRICE_ID", MAX_PRICE_ID);
    resetEnvForTests();
  });

  afterEach(() => vi.unstubAllGlobals());

  const subscriber = (planStatus: string) =>
    signIn({
      plan: "pro",
      planInterval: "month",
      planStatus,
      trialEndsAt: planStatus === "trialing" ? Date.now() + 86_400_000 : null,
      billingCustomerId: CTM_1,
      billingSubscriptionId: SUB_1,
    });

  it("returns our checkout page for a new account, on the trial", async () => {
    const paddle = installFakePaddle();
    const user = await signIn();
    const res = await checkout(checkoutRequest());
    expect(await res.json()).toEqual({
      ok: true,
      url: `https://otto.example/checkout?_ptxn=${TXN_1}&plan=pro&trial=1`,
    });
    expect(paddle.callsTo("POST /transactions")[0]?.body).toMatchObject({
      items: [{ price_id: TRIAL_PRICE_ID, quantity: 1 }],
      custom_data: { user_id: user.id },
    });
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("sends someone on the Pro trial to a Max checkout instead of failing", async () => {
    const paddle = installFakePaddle();
    await subscriber("trialing");
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: TRIAL_PRICE_ID, status: "trialing" });
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));
    expect(await res.json()).toEqual({
      ok: true,
      url: `https://otto.example/checkout?_ptxn=${TXN_1}&plan=max`,
    });
    expect(paddle.callsTo(`PATCH /subscriptions/${SUB_1}`)).toEqual([]);
  });

  it("says plainly why Paddle refused a plan change", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const paddle = installFakePaddle();
    await subscriber("active");
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE_ID, status: "active" });
    paddle.failNext(`PATCH /subscriptions/${SUB_1}`, 400, 1, "subscription_update_when_canceled");
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "plan_change_failed",
        message:
          "We couldn't change your plan: your subscription isn't active right now. Refresh the page and try again.",
      },
    });
  });

  it("asks a subscriber whose renewal failed to fix the card first", async () => {
    const paddle = installFakePaddle();
    await subscriber("past_due");
    paddle.subscriptions.push({ id: SUB_1, customer: CTM_1, price: PRICE_ID, status: "past_due" });
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "plan_change_failed" } });
    expect(paddle.calls.filter((call) => call.method !== "GET")).toEqual([]);
  });

  it("answers 503 when Paddle can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const paddle = installFakePaddle();
    await signIn();
    paddle.failNext("POST /transactions", 502);
    const res = await checkout(checkoutRequest());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "billing_unavailable",
        message: "We couldn't reach our payment provider. Please try again in a minute.",
      },
    });
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

describe("POST /api/billing/portal with Paddle", () => {
  beforeEach(() => {
    vi.stubEnv("PADDLE_API_KEY", "pdl_sdbx_apikey_test");
    resetEnvForTests();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("returns a fresh Paddle portal session for the stored customer, within the link limit", async () => {
    const paddle = installFakePaddle();
    const user = await signIn({ plan: "pro", planStatus: "active", billingCustomerId: CTM_1, billingSubscriptionId: SUB_1 });
    const res = await portal();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, url: `https://customer-portal.paddle.test/${CTM_1}` });
    expect(paddle.callsTo(`POST /customers/${CTM_1}/portal-sessions`)).toHaveLength(1);
    expect(limiter).toHaveBeenCalledWith(`billing:user:${user.id}`, 20, 60 * 60 * 1000);
  });

  it("says when there's no billing account to manage", async () => {
    const paddle = installFakePaddle();
    await signIn();
    const res = await portal();
    expect(res.status).toBe(400);
    expect(paddle.calls).toEqual([]);
  });

  it("has nothing to manage for a customer left over from Creem, and doesn't ask Paddle", async () => {
    const paddle = installFakePaddle();
    await signIn({ plan: "pro", planStatus: "active", billingCustomerId: "cust_3kKw0VQ8bY1lN3m9" });
    const res = await portal();
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "bad_request" } });
    expect(paddle.calls).toEqual([]);
  });
});
