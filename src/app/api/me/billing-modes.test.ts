import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth/codes";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { dodoId } from "@/lib/billing/dodo-testing";
import { resetEnvForTests } from "@/lib/env";
import { GET } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

type Env = Record<string, string | undefined>;

const UNSET: Env = {
  NODE_ENV: "test",
  DEV_AUTH: undefined,
  SENTRY_DSN: undefined,
  NEXT_PUBLIC_SENTRY_DSN: undefined,
  NEXT_PUBLIC_SENTRY_DEV: undefined,
  NEXT_PUBLIC_POSTHOG_KEY: undefined,
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

const DODO: Env = {
  DODO_API_KEY: "dodo_test_apikey_for_me_route_tests",
  DODO_WEBHOOK_SECRET: `whsec_${Buffer.from("otto-me-route-test-webhook").toString("base64")}`,
  BILLING_SIGNING_SECRET: "billing_signing_secret_for_me_route_tests",
  DODO_PRO_MONTHLY_PRODUCT_ID: dodoId("pdt", "promonth"),
  DODO_MAX_MONTHLY_PRODUCT_ID: dodoId("pdt", "maxmonth"),
  DODO_PRO_TRIAL_PRODUCT_ID: dodoId("pdt", "protrial"),
};

const DODO_CUSTOMER = dodoId("cus", 1);
const DODO_SUBSCRIPTION = dodoId("sub", 1);

const network = vi.fn(async (): Promise<Response> => {
  throw new Error("tests make no network calls");
});

function useEnv(values: Env) {
  for (const [name, value] of Object.entries({ ...UNSET, ...values })) vi.stubEnv(name, value);
  resetEnvForTests();
}

async function me() {
  const res = await GET();
  expect(res.status).toBe(200);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  return res.json();
}

async function setRow(user: SessionUser, fields: Partial<typeof users.$inferInsert>) {
  await (await getDb()).update(users).set(fields).where(eq(users.id, user.id));
}

beforeEach(async () => {
  useEnv({});
  vi.stubGlobal("fetch", network);
  network.mockClear();
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  expect(network).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  resetEnvForTests();
});

describe("GET /api/me with Dodo billing set up", () => {
  it("offers a signed-out visitor the monthly plans that have products, and the trial", async () => {
    useEnv(DODO);
    expect(await me()).toMatchObject({
      user: null,
      billing: {
        mode: "dodo",
        offer: { pro: ["month"], max: ["month"] },
        trial: true,
        paymentIssue: false,
        cancelScheduled: false,
      },
      auth: { mode: "supabase" },
    });
  });

  it("offers yearly billing only for the plans that have a yearly product", async () => {
    useEnv({ ...DODO, DODO_PRO_YEARLY_PRODUCT_ID: dodoId("pdt", "proyear") });
    expect((await me()).billing.offer).toEqual({ pro: ["month", "year"], max: ["month"] });

    useEnv({ ...DODO, DODO_MAX_MONTHLY_PRODUCT_ID: undefined });
    expect((await me()).billing.offer).toEqual({ pro: ["month"], max: [] });
  });

  it("offers no trial to anyone while the trial product isn't set", async () => {
    useEnv({ ...DODO, DODO_PRO_TRIAL_PRODUCT_ID: undefined });
    expect((await me()).billing.trial).toBe(false);

    await signInAs("ada@example.com");
    expect((await me()).billing).toMatchObject({ mode: "dodo", trial: false });
  });

  it("offers the trial to a new Free user, but not to one who has paid through Dodo before", async () => {
    useEnv(DODO);
    const user = await signInAs("ada@example.com");
    expect((await me()).billing.trial).toBe(true);

    await setRow(user, { planStatus: "canceled", billingCustomerId: DODO_CUSTOMER });
    expect((await me()).billing).toMatchObject({
      trial: false,
      paymentIssue: false,
      cancelScheduled: false,
    });
  });

  it("tells a Free user whose card failed to fix it in Manage billing", async () => {
    useEnv(DODO);
    const user = await signInAs("ada@example.com");
    await setRow(user, {
      planStatus: "on_hold",
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
    });

    const body = await me();
    expect(body.user).toMatchObject({ id: user.id, plan: "free" });
    expect(body.billing).toMatchObject({
      trial: false,
      paymentIssue: true,
      cancelScheduled: false,
    });
  });

  it("tells a Pro user their plan is set to end, keeping Pro's allowance until then", async () => {
    useEnv(DODO);
    const user = await signInAs("ada@example.com");
    const ends = Date.now() + 10 * 86_400_000;
    await setRow(user, {
      plan: "pro",
      planInterval: "month",
      planStatus: "scheduled_cancel",
      planRenewsAt: null,
      planPeriodStartsAt: Date.now() - 20 * 86_400_000,
      planPeriodEndsAt: ends,
      billingCustomerId: DODO_CUSTOMER,
      billingSubscriptionId: DODO_SUBSCRIPTION,
    });

    const body = await me();
    expect(body.user).toMatchObject({ plan: "pro" });
    expect(body.usage.tailor.limit).toBeGreaterThan(0);
    expect(body.billing).toMatchObject({
      trial: false,
      paymentIssue: false,
      cancelScheduled: true,
    });
  });
});

describe("GET /api/me with billing off", () => {
  it("offers no trial and shows no billing warnings in production without Dodo", async () => {
    useEnv({ NODE_ENV: "production" });
    expect((await me()).billing).toMatchObject({ mode: "disabled", trial: false });

    const user = await signInAs("ada@example.com");
    await setRow(user, { planStatus: "on_hold", billingCustomerId: DODO_CUSTOMER });
    expect((await me()).billing).toMatchObject({
      mode: "disabled",
      trial: false,
      paymentIssue: false,
      cancelScheduled: false,
    });
  });

  it("keeps billing off, and says so once, when the Dodo key is for the other environment", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    useEnv({
      ...DODO,
      NODE_ENV: "production",
      DODO_API_KEY: "dodo_live_apikey_for_me_route_tests",
    });

    expect((await me()).billing).toMatchObject({ mode: "disabled", trial: false });
    expect((await me()).billing).toMatchObject({ mode: "disabled", trial: false });
    const mismatches = errors.mock.calls.filter(([line]) =>
      String(line).includes("billing.key_environment_mismatch"),
    );
    expect(mismatches).toHaveLength(1);
    expect(String(mismatches[0]?.[0])).not.toContain("dodo_live_apikey");
  });
});

describe("GET /api/me in local development", () => {
  it("points the sign-in form at dev codes and returns the dev session's user", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    useEnv({ NODE_ENV: "development" });
    expect(await me()).toMatchObject({
      user: null,
      billing: { mode: "mock" },
      auth: { mode: "dev" },
    });

    const { devCode } = await requestLoginCode("ada@example.com", "198.51.100.7");
    const user = await verifyLoginCode("ada@example.com", devCode ?? "");
    const body = await me();
    expect(body.user).toMatchObject({ id: user.id, email: "ada@example.com", plan: "free" });
    expect(body.usage.fix).toEqual({ used: 0, limit: 3 });
    expect(body.auth).toEqual({ mode: "dev" });
  });

  it("uses Supabase sign-in in development when DEV_AUTH asks for it", async () => {
    useEnv({ NODE_ENV: "development", DEV_AUTH: "supabase" });
    expect((await me()).auth).toEqual({ mode: "supabase" });
  });
});
