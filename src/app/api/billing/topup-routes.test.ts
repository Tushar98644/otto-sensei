import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { billingLog, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { verifyBillingId } from "@/lib/billing/billing-sign";
import { dodoId, installFakeDodo } from "@/lib/billing/dodo-testing";
import { resetEnvForTests } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { toSessionUser } from "@/lib/users";
import { GET as creditGet } from "./credit/route";
import { GET as returnGet } from "./return/route";
import { POST as topup } from "./topup/route";

vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit: vi.fn(),
}));

const currentUser = vi.mocked(getCurrentUser);
const limiter = vi.mocked(rateLimit);

const APP_URL = "https://otto.example";
const SIGNING_SECRET = "billing_signing_secret_for_topup_tests";
const TOPUP = dodoId("pdt", "topup");
const DODO = {
  DODO_API_KEY: "dodo_test_apikey_for_topup_tests",
  DODO_WEBHOOK_SECRET: `whsec_${Buffer.from("otto-topup-test-webhook-key").toString("base64")}`,
  BILLING_SIGNING_SECRET: SIGNING_SECRET,
  DODO_PRO_MONTHLY_PRODUCT_ID: dodoId("pdt", "promonth"),
  DODO_TOPUP_PRODUCT_ID: TOPUP,
};
const DODO_UNSET = Object.fromEntries(Object.keys(DODO).map((name) => [name, undefined]));

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

let sequence = 0;

async function signIn(overrides: Partial<typeof users.$inferInsert> = {}): Promise<SessionUser> {
  sequence += 1;
  const row = {
    id: crypto.randomUUID(),
    email: `buyer${sequence}@example.com`,
    plan: "pro" as const,
    planInterval: "month" as const,
    planStatus: "active",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
  await insertUserRow(row);
  const [stored] = await (await getDb()).select().from(users).where(eq(users.id, row.id));
  const user = toSessionUser(stored!);
  currentUser.mockResolvedValue(user);
  return user;
}

function topupRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`${APP_URL}/api/billing/topup`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function balanceOf(userId: string): Promise<number> {
  const [row] = await (
    await getDb()
  )
    .select({ cents: users.creditCents })
    .from(users)
    .where(eq(users.id, userId));
  return row?.cents ?? -1;
}

beforeEach(async () => {
  useEnv({ NEXT_PUBLIC_APP_URL: APP_URL, ...DODO_UNSET, DODO_TOPUP_PRODUCT_ID: TOPUP });
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

describe("POST /api/billing/topup", () => {
  it("asks for sign-in, refuses other sites and anything but JSON, like the other billing routes", async () => {
    expect((await topup(topupRequest({ usd: 10 }))).status).toBe(401);
    await signIn();
    const crossSite = await topup(topupRequest({ usd: 10 }, { "sec-fetch-site": "cross-site" }));
    expect(crossSite.status).toBe(403);
    const form = await topup(
      new Request(`${APP_URL}/api/billing/topup`, { method: "POST", body: "usd=10" }),
    );
    expect(form.status).toBe(415);
  });

  it("takes only whole dollars from $5 to $100", async () => {
    const user = await signIn();
    for (const usd of [4, 101, 5.5, "10", -5, null]) {
      const res = await topup(topupRequest({ usd }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        ok: false,
        error: { code: "bad_request", message: "Pick a whole-dollar amount from $5 to $100." },
      });
    }
    expect(await balanceOf(user.id)).toBe(0);
  });

  it("limits how often one account can ask for links", async () => {
    await signIn();
    limiter.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 60_000 });
    expect((await topup(topupRequest({ usd: 10 }))).status).toBe(429);
  });

  it("refuses Free and the trial", async () => {
    await signIn({ plan: "free", planInterval: null, planStatus: null });
    const free = await topup(topupRequest({ usd: 10 }));
    expect(free.status).toBe(402);
    expect(await free.json()).toMatchObject({ ok: false, error: { code: "upgrade_required" } });
    await signIn({ planStatus: "trialing", trialEndsAt: Date.now() + 86_400_000 });
    expect((await topup(topupRequest({ usd: 10 }))).status).toBe(402);
  });

  it("isn't for sale until the top-up product is set", async () => {
    useEnv({ DODO_TOPUP_PRODUCT_ID: undefined });
    await signIn();
    const res = await topup(topupRequest({ usd: 10 }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, error: { code: "billing_unavailable" } });
  });

  it("credits mock billing right away and goes back to the account", async () => {
    const user = await signIn();
    const res = await topup(topupRequest({ usd: 20, next: "/dashboard/tailor" }));
    expect(await res.json()).toEqual({
      ok: true,
      url: "/account?topup=success&next=%2Fdashboard%2Ftailor",
    });
    expect(await balanceOf(user.id)).toBe(2000);
  });

  it("refuses an amount past the balance cap, saying how much still fits", async () => {
    const user = await signIn();
    await (await getDb()).update(users).set({ creditCents: 28_000 }).where(eq(users.id, user.id));
    const res = await topup(topupRequest({ usd: 50 }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false,
      error: {
        code: "bad_request",
        message: "Your balance holds up to $300, so you can add up to $20 right now.",
      },
    });
    expect(await balanceOf(user.id)).toBe(28_000);
  });

  it("opens a Dodo checkout for the $1 product times the dollars, signed and recorded on our side", async () => {
    useEnv(DODO);
    const fake = installFakeDodo();
    const user = await signIn({ billingCustomerId: dodoId("cus", 1) });
    const res = await topup(topupRequest({ usd: 15, usdFromClient: 9_999 }));
    expect(res.status).toBe(200);
    const { url } = (await res.json()) as { url: string };
    expect(url).toMatch(/^https:\/\/test\.checkout\.dodopayments\.com\/session\/cks_/);
    const [made] = fake.checkouts;
    const body = made?.body as {
      product_cart: unknown;
      customer: unknown;
      metadata: Record<string, string>;
      return_url: string;
    };
    expect(body.product_cart).toEqual([{ product_id: TOPUP, quantity: 15 }]);
    expect(body.customer).toEqual({ customer_id: dodoId("cus", 1) });
    expect(body.metadata.user_id).toBe(user.id);
    expect(verifyBillingId(user.id, body.metadata.user_sig, SIGNING_SECRET)).toBe(true);
    expect(verifyBillingId(body.metadata.topup_id!, body.metadata.topup_sig, SIGNING_SECRET)).toBe(
      true,
    );
    expect(body.return_url).toBe(`${APP_URL}/api/billing/return?topup=1`);
    const [pending] = await (
      await getDb()
    )
      .select({ userId: billingLog.userId, cents: billingLog.cents, ref: billingLog.ref })
      .from(billingLog)
      .where(
        and(eq(billingLog.kind, "topup_checkout"), eq(billingLog.key, body.metadata.topup_id!)),
      );
    expect(pending).toEqual({ userId: user.id, cents: 1500, ref: made?.id });
    // Nothing is credited until Dodo's webhook says it was paid.
    expect(await balanceOf(user.id)).toBe(0);
  });

  it("drops our record when Dodo won't open the checkout", async () => {
    useEnv(DODO);
    const fake = installFakeDodo();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await signIn();
    fake.failNext("POST /checkouts", 500);
    const res = await topup(topupRequest({ usd: 10 }));
    expect(res.status).toBe(503);
    expect(await (await getDb()).select().from(billingLog)).toEqual([]);
  });
});

describe("GET /api/billing/credit", () => {
  it("shows the balance and history, and nothing while credit is off", async () => {
    const user = await signIn();
    await topup(topupRequest({ usd: 5 }));
    const res = await creditGet();
    expect(await res.json()).toMatchObject({
      ok: true,
      credit: { balanceCents: 500, usable: true },
      activity: [{ kind: "added", cents: 500 }],
    });
    expect(limiter).toHaveBeenCalledWith(`credit:user:${user.id}`, 60, 60 * 60 * 1000);
    useEnv({ DODO_TOPUP_PRODUCT_ID: undefined });
    expect((await creditGet()).status).toBe(404);
    currentUser.mockResolvedValue(null);
    expect((await creditGet()).status).toBe(401);
  });
});

describe("GET /api/billing/return for a top-up", () => {
  it("lands on the account page with the outcome only", () => {
    const back = (query: string) =>
      returnGet(new Request(`${APP_URL}/api/billing/return?${query}`)).headers.get("Location");
    expect(back("topup=1&status=succeeded&email=a@b.c&next=%2Fdashboard")).toBe(
      `${APP_URL}/account?topup=success&next=%2Fdashboard`,
    );
    expect(back("topup=1&status=failed&next=%2Fdashboard")).toBe(
      `${APP_URL}/account?topup=cancelled`,
    );
  });
});
