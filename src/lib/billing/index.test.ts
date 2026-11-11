import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { trialHistory, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { resetEnvForTests } from "@/lib/env";
import { toSessionUser } from "@/lib/users";
import {
  billingMode,
  cancelSubscriptionForDeletion,
  createCheckoutUrl,
  createPortalUrl,
  planChangeRoute,
  trialAvailableFor,
} from "./index";
import { installFakeCreem, type FakeCreem } from "./testing";
import { recordTrialHistory } from "./trial";

const APP_URL = "https://otto.example";
const CREEM = {
  CREEM_API_KEY: "creem_test_123",
  CREEM_WEBHOOK_SECRET: "whsec_test",
  CREEM_PRO_MONTHLY_PRODUCT_ID: "prod_pro_month",
  CREEM_PRO_TRIAL_PRODUCT_ID: "prod_pro_trial",
} as const;
const DAY_MS = 86_400_000;

type Row = typeof users.$inferSelect;
let sequence = 0;
let creem: FakeCreem;

async function createUser(overrides: Partial<typeof users.$inferInsert> = {}): Promise<SessionUser> {
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
  return toSessionUser((await reload(row.id))!);
}

async function reload(id: string): Promise<Row | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

const useCreem = (extra: Record<string, string | undefined> = {}) => useEnv({ ...CREEM, ...extra });

const requestedUrls = () =>
  vi.mocked(fetch).mock.calls.map(([input]) => (input instanceof Request ? input.url : String(input)));

const checkoutBody = () => creem.callsTo("POST /v1/checkouts").at(-1)?.body as Record<string, unknown>;

beforeEach(async () => {
  useEnv({
    NEXT_PUBLIC_APP_URL: APP_URL,
    CREEM_API_KEY: undefined,
    CREEM_WEBHOOK_SECRET: undefined,
    CREEM_PRO_MONTHLY_PRODUCT_ID: undefined,
    CREEM_PRO_TRIAL_PRODUCT_ID: undefined,
    CREEM_TEST_MODE: undefined,
  });
  creem = installFakeCreem();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billingMode", () => {
  it("is mock in development without keys, and creem once the key, secret and Pro product are set", () => {
    expect(billingMode()).toBe("mock");
    useCreem();
    expect(billingMode()).toBe("creem");
  });

  it("is disabled in production unless every key is set", () => {
    useEnv({ NODE_ENV: "production", CREEM_API_KEY: CREEM.CREEM_API_KEY });
    expect(billingMode()).toBe("disabled");
  });
});

describe("mock mode", () => {
  it("starts a new account on the trial: Pro, trialing, ending in 3 days, written down once", async () => {
    const user = await createUser();
    const before = Date.now();
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("/account?checkout=success&plan=pro&trial=1");
    const row = await reload(user.id);
    expect(row).toMatchObject({ plan: "pro", planInterval: "month", planStatus: "mock_trialing" });
    expect(row?.trialEndsAt).toBeGreaterThanOrEqual(before + 3 * DAY_MS);
    expect(await (await getDb()).select().from(trialHistory)).toHaveLength(1);
    expect(creem.calls).toEqual([]);
  });

  it("gives someone who already had a trial the plain plan, and Max or yearly never trial", async () => {
    const returning = await createUser({ planStatus: "mock_cancelled" });
    expect(await createCheckoutUrl(returning, "pro", "month")).toBe("/account?checkout=success&plan=pro");
    expect(await reload(returning.id)).toMatchObject({ plan: "pro", planStatus: "mock_active", trialEndsAt: null });

    const fresh = await createUser();
    expect(await createCheckoutUrl(fresh, "max", "year")).toBe("/account?checkout=success&plan=max");
    expect(await reload(fresh.id)).toMatchObject({ plan: "max", planInterval: "year", trialEndsAt: null });
  });

  it("portal downgrades a subscribed user and ends the trial; it refuses someone who never subscribed", async () => {
    const user = await createUser();
    await createCheckoutUrl(user, "pro", "month");
    expect(await createPortalUrl(user)).toBe("/account?portal=mock");
    expect(await reload(user.id)).toMatchObject({ plan: "free", trialEndsAt: null, planStatus: "mock_cancelled" });
    expect(await trialAvailableFor(toSessionUser((await reload(user.id))!))).toBe(false);

    const never = await createUser();
    await expect(createPortalUrl(never)).rejects.toMatchObject({ code: "no_subscription" });
  });

  it("refuses a second checkout for the plan the user is on", async () => {
    const user = await createUser({ plan: "pro", planStatus: "mock_active" });
    await expect(createCheckoutUrl(user, "pro")).rejects.toMatchObject({ code: "already_subscribed" });
  });
});

describe("disabled mode", () => {
  it("throws unavailable for checkout and portal", async () => {
    useEnv({ NODE_ENV: "production" });
    const user = await createUser();
    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "unavailable" });
    await expect(createPortalUrl(user)).rejects.toMatchObject({ code: "unavailable" });
  });
});

describe("trial eligibility", () => {
  it("is one per person: a trial or a payment under the email, any billing history, or a paid plan", async () => {
    useCreem();
    const fresh = await createUser();
    expect(await trialAvailableFor(fresh)).toBe(true);

    const trialed = await createUser();
    await recordTrialHistory(await getDb(), trialed.email, "trial");
    expect(await trialAvailableFor(trialed)).toBe(false);

    const again = await createUser({ email: `  ${trialed.email.toUpperCase()} ` });
    expect(await trialAvailableFor({ ...again, email: trialed.email.toUpperCase() })).toBe(false);

    const paidBefore = await createUser({ planStatus: "canceled", billingSubscriptionId: "sub_old" });
    expect(await trialAvailableFor(paidBefore)).toBe(false);

    const paying = await createUser({ plan: "pro", planStatus: "active" });
    expect(await trialAvailableFor(paying)).toBe(false);
  });

  it("isn't offered without a trial product", async () => {
    useCreem({ CREEM_PRO_TRIAL_PRODUCT_ID: undefined });
    expect(await trialAvailableFor(await createUser())).toBe(false);
  });
});

describe("creem mode", () => {
  it("checks a new account out on the trial product, tied to the user, back to the account page", async () => {
    useCreem();
    const user = await createUser();
    const url = await createCheckoutUrl(user, "pro", "month");
    expect(url).toBe("https://checkout.creem.test/ch_1");
    expect(checkoutBody()).toEqual({
      product_id: CREEM.CREEM_PRO_TRIAL_PRODUCT_ID,
      customer: { email: user.email },
      metadata: { user_id: user.id },
      success_url: `${APP_URL}/account?checkout=success&plan=pro&trial=1`,
    });
    expect(requestedUrls()).toContain("https://test-api.creem.io/v1/checkouts");
  });

  it("checks someone who has trialed or paid before out on the normal Pro product", async () => {
    useCreem();
    const user = await createUser();
    await recordTrialHistory(await getDb(), user.email, "paid");
    await createCheckoutUrl(user, "pro", "month");
    expect(checkoutBody()).toMatchObject({
      product_id: CREEM.CREEM_PRO_MONTHLY_PRODUCT_ID,
      success_url: `${APP_URL}/account?checkout=success&plan=pro`,
    });
  });

  it("uses the live API when CREEM_TEST_MODE is false", async () => {
    useCreem({ CREEM_TEST_MODE: "false" });
    await createCheckoutUrl(await createUser(), "pro", "month");
    expect(requestedUrls()).toContain("https://api.creem.io/v1/checkouts");
  });

  it("checks out the yearly or Max product only once it's set, never on the trial", async () => {
    useCreem();
    const user = await createUser();
    await expect(createCheckoutUrl(user, "pro", "year")).rejects.toMatchObject({ code: "unavailable" });
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "unavailable" });
    useCreem({ CREEM_PRO_YEARLY_PRODUCT_ID: "prod_pro_year", CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max_month" });
    await createCheckoutUrl(user, "pro", "year");
    expect(checkoutBody()?.product_id).toBe("prod_pro_year");
    await createCheckoutUrl(user, "max", "month");
    expect(checkoutBody()?.product_id).toBe("prod_max_month");
  });

  it("moves an active Pro subscription to Max in place, through the upgrade endpoint", async () => {
    useCreem({ CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max_month" });
    const user = await createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: "cust_1",
      billingSubscriptionId: "sub_1",
    });
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "active" });
    expect(await createCheckoutUrl(user, "max", "month")).toBe("/account?checkout=success&plan=max");
    expect(creem.callsTo("POST /v1/subscriptions/sub_1/upgrade")[0]?.body).toEqual({
      product_id: "prod_max_month",
      update_behavior: "proration-charge-immediately",
    });
    expect(creem.callsTo("POST /v1/checkouts")).toEqual([]);
  });

  describe("on the Pro trial", () => {
    const MAX = { CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max_month", CREEM_MAX_YEARLY_PRODUCT_ID: "prod_max_year" };
    const trialist = (overrides: Partial<typeof users.$inferInsert> = {}) =>
      createUser({
        plan: "pro",
        planInterval: "month",
        planStatus: "trialing",
        trialEndsAt: Date.now() + DAY_MS,
        billingCustomerId: "cust_1",
        billingSubscriptionId: "sub_trial",
        ...overrides,
      });

    it("opens a checkout for Max that names the trial to cancel, and never calls upgrade", async () => {
      useCreem(MAX);
      const user = await trialist();
      creem.subscriptions.push({ id: "sub_trial", customer: "cust_1", product: "prod_pro_trial", status: "trialing" });
      expect(await createCheckoutUrl(user, "max", "year")).toBe("https://checkout.creem.test/ch_1");
      expect(checkoutBody()).toEqual({
        product_id: "prod_max_year",
        customer: { email: user.email },
        metadata: { user_id: user.id, replaces_subscription_id: "sub_trial" },
        success_url: `${APP_URL}/account?checkout=success&plan=max`,
      });
      expect(creem.callsTo("POST /v1/subscriptions")).toEqual([]);
      expect((await reload(user.id))?.planStatus).toBe("trialing");
    });

    it("does the same for a trial cancelled in the portal, but sends a paid plan set to end there", async () => {
      useCreem(MAX);
      const user = await trialist({ planStatus: "scheduled_cancel" });
      creem.subscriptions.push({ id: "sub_trial", customer: "cust_1", product: "prod_pro_trial", status: "scheduled_cancel" });
      expect(await createCheckoutUrl(user, "max", "month")).toBe("https://checkout.creem.test/ch_1");

      const paid = await trialist({
        email: "paid@example.com",
        planStatus: "scheduled_cancel",
        trialEndsAt: null,
        billingCustomerId: "cust_2",
        billingSubscriptionId: "sub_paid",
      });
      creem.subscriptions.push({ id: "sub_paid", customer: "cust_2", product: "prod_pro_month", status: "scheduled_cancel" });
      expect(await createCheckoutUrl(paid, "max", "month")).toBe("https://creem.test/portal/cust_2");
      expect(creem.callsTo("POST /v1/checkouts")).toHaveLength(1);
    });

    it("goes to the portal while a plan bought a moment ago is still on its way", async () => {
      useCreem(MAX);
      const user = await trialist();
      creem.subscriptions.push(
        { id: "sub_trial", customer: "cust_1", product: "prod_pro_trial", status: "trialing" },
        { id: "sub_max", customer: "cust_1", product: "prod_max_month", status: "active" },
      );
      expect(await createCheckoutUrl(user, "max", "month")).toBe("https://creem.test/portal/cust_1");
      expect(creem.callsTo("POST /v1/checkouts")).toEqual([]);
    });

    it("asks to try again when Creem can't list the subscriptions, rather than risk a second plan", async () => {
      useCreem(MAX);
      const user = await trialist();
      creem.failNext("GET /v1/customers", 500, 10);
      await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "provider_error" });
      expect(creem.callsTo("POST /v1/checkouts")).toEqual([]);
    });
  });

  it("refuses a plan change while a renewal is past due, without writing to Creem", async () => {
    useCreem({ CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max_month" });
    const user = await createUser({
      plan: "pro",
      planStatus: "past_due",
      billingCustomerId: "cust_1",
      billingSubscriptionId: "sub_1",
    });
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "past_due" });
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "payment_overdue" });
    expect(creem.calls.filter((call) => call.method === "POST")).toEqual([]);
  });

  it("tells a refused change (4xx, with Creem's code) apart from Creem being down (5xx)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useCreem({ CREEM_MAX_MONTHLY_PRODUCT_ID: "prod_max_month" });
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "cust_1",
      billingSubscriptionId: "sub_1",
    });
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "active" });
    creem.failNext("POST /v1/subscriptions/sub_1/upgrade", 400, 1, "subscription_not_active");
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "refused",
      details: { operation: "change_plan", providerStatus: 400, providerCode: "subscription_not_active" },
    });
    creem.failNext("POST /v1/subscriptions/sub_1/upgrade", 502);
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "provider_error" });
  });

  it("routes each Creem status to a plan change", () => {
    const pro = { plan: "pro" as const, trialEndsAt: null };
    const trial = { plan: "pro" as const, trialEndsAt: Date.now() + DAY_MS };
    expect(
      ["active", "trialing", "past_due", "scheduled_cancel", "paused", "unpaid", "unknown", "incomplete"].map(
        (status) => [status, planChangeRoute(status, pro)],
      ),
    ).toEqual([
      ["active", "in_place"],
      ["trialing", "replace_trial"],
      ["past_due", "fix_payment"],
      ["scheduled_cancel", "portal"],
      ["paused", "portal"],
      ["unpaid", "portal"],
      ["unknown", "portal"],
      ["incomplete", "portal"],
    ]);
    expect(planChangeRoute("scheduled_cancel", trial)).toBe("replace_trial");
    expect(planChangeRoute("past_due", trial)).toBe("fix_payment");
  });

  it("sends someone with a paused or unpaid subscription to the portal instead of a second one", async () => {
    useCreem();
    const user = await createUser({ email: "maya@example.com" });
    creem.customers.push({ id: "cust_9", email: "maya@example.com" });
    creem.subscriptions.push({ id: "sub_9", customer: "cust_9", product: "prod_pro_month", status: "unpaid" });
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("https://creem.test/portal/cust_9");
    expect(creem.callsTo("POST /v1/checkouts")).toEqual([]);
  });

  it("opens checkout past ended and other products' subscriptions", async () => {
    useCreem();
    const user = await createUser({ email: "maya@example.com" });
    creem.customers.push({ id: "cust_9", email: "maya@example.com" });
    creem.subscriptions.push(
      { id: "sub_a", customer: "cust_9", product: "prod_pro_month", status: "canceled" },
      { id: "sub_b", customer: "cust_9", product: "prod_ebook", status: "active" },
    );
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("https://checkout.creem.test/ch_1");
  });

  it("falls back to the stored subscription when Creem can't list them, and reports provider errors", async () => {
    useCreem();
    const user = await createUser({ planStatus: "paused", billingCustomerId: "cust_1", billingSubscriptionId: "sub_1" });
    creem.failNext("GET /v1/customers", 500, 10);
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("https://creem.test/portal/cust_1");

    const fresh = await createUser();
    creem.failNext("POST /v1/checkouts", 500);
    await expect(createCheckoutUrl(fresh, "pro", "month")).rejects.toMatchObject({ code: "provider_error" });
  });

  it("opens the customer portal for the stored customer, and has none for someone who never paid", async () => {
    useCreem();
    const user = await createUser({ plan: "pro", billingCustomerId: "cust_7", billingSubscriptionId: "sub_7" });
    expect(await createPortalUrl(user)).toBe("https://creem.test/portal/cust_7");
    await expect(createPortalUrl(await createUser())).rejects.toMatchObject({ code: "no_subscription" });
  });
});

describe("cancelSubscriptionForDeletion", () => {
  const subscriber = (overrides: Partial<typeof users.$inferInsert> = {}) =>
    createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: "cust_1",
      billingSubscriptionId: "sub_1",
      ...overrides,
    });

  it("cancels the stored subscription right away and every other live one for the person", async () => {
    useCreem();
    const user = await subscriber({ email: "ada@example.com" });
    creem.customers.push({ id: "cust_2", email: "ada@example.com" });
    creem.subscriptions.push(
      { id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "active" },
      { id: "sub_2", customer: "cust_2", product: "prod_pro_trial", status: "trialing" },
    );
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(creem.callsTo("POST /v1/subscriptions/sub_1/cancel")[0]?.body).toEqual({ mode: "immediate" });
    expect(creem.callsTo("POST /v1/subscriptions/sub_2/cancel")).toHaveLength(1);
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled", trialEndsAt: null });
  });

  it("does nothing for someone who never subscribed", async () => {
    useCreem();
    expect(await cancelSubscriptionForDeletion(await createUser())).toBe("none");
    expect(creem.calls).toEqual([]);
  });

  it("treats a refused cancel as done when Creem says it already ended", async () => {
    useCreem();
    const user = await subscriber();
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "canceled" });
    creem.failNext("POST /v1/subscriptions/sub_1/cancel", 400);
    expect(await cancelSubscriptionForDeletion(user)).toBe("already_ended");
  });

  it("fails, keeping the account, when Creem refuses to cancel a live one or can't be reached", async () => {
    useCreem();
    const user = await subscriber();
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "active" });
    creem.failNext("POST /v1/subscriptions/sub_1/cancel", 400);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    creem.failNext("POST /v1/subscriptions/sub_1/cancel", 503);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("warns and carries on when there is no API key to cancel with", async () => {
    useCreem({ NODE_ENV: "production", CREEM_API_KEY: undefined });
    expect(await cancelSubscriptionForDeletion(await subscriber())).toBe("not_configured");
  });

  it("downgrades locally in mock mode", async () => {
    const user = await subscriber({ planStatus: "mock_trialing", billingCustomerId: null, billingSubscriptionId: null });
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "mock_cancelled" });
  });

  it("never logs the customer's email", async () => {
    useCreem();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await subscriber();
    creem.subscriptions.push({ id: "sub_1", customer: "cust_1", product: "prod_pro_month", status: "active" });
    creem.failNext("POST /v1/subscriptions/sub_1/cancel", 502);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    await cancelSubscriptionForDeletion(user);
    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.subscription_cancelled");
    expect(output).not.toContain(user.email);
  });
});
