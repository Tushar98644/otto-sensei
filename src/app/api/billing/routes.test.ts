import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { creemSignature, installFakeCreem } from "@/lib/billing/testing";
import { resetEnvForTests } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/users";
import { POST as checkout } from "./checkout/route";
import { POST as portal } from "./portal/route";
import { POST as webhook } from "./webhook/route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const currentUser = vi.mocked(getCurrentUser);
const limiter = vi.mocked(rateLimit);

const SECRET = "whsec_otto_route_test_secret";
const OTHER_SECRET = "whsec_not_the_configured_one";
const PRODUCT_ID = "prod_otto_pro";

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

// No body at all is how checkout was asked for before intervals, and still means monthly.
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
  // Mock billing: no API key, but a webhook secret so the webhook route can verify signatures.
  vi.stubEnv("CREEM_API_KEY", undefined);
  vi.stubEnv("CREEM_PRO_MONTHLY_PRODUCT_ID", PRODUCT_ID);
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
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

  it("returns where to send the browser: a new account starts on the free trial", async () => {
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
    vi.stubEnv("CREEM_WEBHOOK_SECRET", undefined);
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

  // Real checkout only offers an interval once its product is set (billing/intervals.test.ts).
  it("in mock checkout, sells yearly and weekly without any product set", async () => {
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

describe("POST /api/billing/checkout with Creem", () => {
  beforeEach(() => {
    vi.stubEnv("CREEM_API_KEY", "creem_test_123");
    vi.stubEnv("CREEM_PRO_TRIAL_PRODUCT_ID", "prod_otto_trial");
    vi.stubEnv("CREEM_MAX_MONTHLY_PRODUCT_ID", "prod_otto_max");
    resetEnvForTests();
  });

  afterEach(() => vi.unstubAllGlobals());

  const subscriber = (planStatus: string) =>
    signIn({
      plan: "pro",
      planInterval: "month",
      planStatus,
      trialEndsAt: planStatus === "trialing" ? Date.now() + 86_400_000 : null,
      billingCustomerId: "cust_1",
      billingSubscriptionId: "sub_1",
    });

  it("sends someone on the Pro trial to a Max checkout instead of failing", async () => {
    const creem = installFakeCreem();
    await subscriber("trialing");
    creem.subscriptions.push({
      id: "sub_1",
      customer: "cust_1",
      product: "prod_otto_trial",
      status: "trialing",
    });
    const res = await checkout(checkoutRequest({ plan: "max", interval: "month" }));
    expect(await res.json()).toEqual({ ok: true, url: "https://checkout.creem.test/ch_1" });
    expect(creem.callsTo("POST /v1/subscriptions/sub_1/upgrade")).toEqual([]);
  });

  it("says plainly why Creem refused a plan change", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const creem = installFakeCreem();
    await subscriber("active");
    creem.subscriptions.push({
      id: "sub_1",
      customer: "cust_1",
      product: PRODUCT_ID,
      status: "active",
    });
    creem.failNext("POST /v1/subscriptions/sub_1/upgrade", 400, 1, "subscription_not_active");
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

describe("POST /api/billing/webhook", () => {
  function deliver(payload: string, secret = SECRET): Promise<Response> {
    return webhook(
      new Request("https://otto.example/api/billing/webhook", {
        method: "POST",
        headers: { "content-type": "application/json", "creem-signature": creemSignature(payload, secret) },
        body: payload,
      }),
    );
  }

  async function activePayload() {
    sequence += 1;
    const id = crypto.randomUUID();
    await insertUserRow({
      id,
      email: `buyer${sequence}@example.com`,
      plan: "free",
      createdAt: 1,
      updatedAt: 1,
    });
    // Pretty-printed on purpose: the signature covers the exact bytes, whitespace included.
    const payload = JSON.stringify(
      {
        id: `evt_${sequence}`,
        eventType: "subscription.paid",
        created_at: Date.now(),
        object: {
          id: "sub_1",
          object: "subscription",
          product: { id: PRODUCT_ID, object: "product" },
          customer: { id: "cust_1", object: "customer", email: `buyer${sequence}@example.com` },
          status: "active",
          metadata: { user_id: id },
        },
      },
      null,
      2,
    );
    return { id, payload };
  }

  it("verifies the raw body and updates the plan, without a session", async () => {
    const { id, payload } = await activePayload();
    const res = await deliver(payload);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, message: "applied" });
    expect((await reload(id))?.plan).toBe("pro");
    expect(currentUser).not.toHaveBeenCalled();
  });

  it("rejects a bad signature with 401", async () => {
    const { id, payload } = await activePayload();
    const res = await deliver(payload, OTHER_SECRET);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "unauthorized", message: "invalid_signature" },
    });
    expect((await reload(id))?.plan).toBe("free");
  });
});
