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
import { installFakePaddle, type FakePaddle } from "./testing";
import { recordTrialHistory } from "./trial";

const APP_URL = "https://otto.example";
const PADDLE = {
  PADDLE_API_KEY: "pdl_sdbx_apikey_test",
  PADDLE_WEBHOOK_SECRET: "pdl_ntfset_test",
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_client_token",
  PADDLE_PRO_MONTHLY_PRICE_ID: "pri_pro_month",
  PADDLE_PRO_TRIAL_PRICE_ID: "pri_pro_trial",
} as const;
const MAX = { PADDLE_MAX_MONTHLY_PRICE_ID: "pri_max_month", PADDLE_MAX_YEARLY_PRICE_ID: "pri_max_year" };
const DAY_MS = 86_400_000;
const CTM_1 = `ctm_${"1".padStart(26, "0")}`;

type Row = typeof users.$inferSelect;
let sequence = 0;
let paddle: FakePaddle;

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

const usePaddle = (extra: Record<string, string | undefined> = {}) => useEnv({ ...PADDLE, ...extra });

const writes = () => paddle.calls.filter((call) => call.method !== "GET");
const transactionBody = () =>
  paddle.callsTo("POST /transactions").at(-1)?.body as Record<string, unknown> | undefined;

beforeEach(async () => {
  useEnv({
    NEXT_PUBLIC_APP_URL: APP_URL,
    PADDLE_API_KEY: undefined,
    PADDLE_WEBHOOK_SECRET: undefined,
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: undefined,
    PADDLE_PRO_MONTHLY_PRICE_ID: undefined,
    PADDLE_PRO_TRIAL_PRICE_ID: undefined,
    PADDLE_ENVIRONMENT: undefined,
  });
  paddle = installFakePaddle();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billingMode", () => {
  it("is mock in development without keys, and paddle once the key, secret, client token and Pro price are set", () => {
    expect(billingMode()).toBe("mock");
    usePaddle({ NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: undefined });
    expect(billingMode()).toBe("mock");
    usePaddle();
    expect(billingMode()).toBe("paddle");
  });

  it("is disabled in production unless every key is set", () => {
    useEnv({ NODE_ENV: "production", PADDLE_API_KEY: PADDLE.PADDLE_API_KEY });
    expect(billingMode()).toBe("disabled");
    usePaddle({ NODE_ENV: "production", PADDLE_WEBHOOK_SECRET: "" });
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
    expect(paddle.calls).toEqual([]);
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
    expect(paddle.calls).toEqual([]);
  });
});

describe("trial eligibility", () => {
  it("is one per person: a trial or a payment under the email, any billing history, or a paid plan", async () => {
    usePaddle();
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

  it("isn't offered without a trial price", async () => {
    usePaddle({ PADDLE_PRO_TRIAL_PRICE_ID: undefined });
    expect(await trialAvailableFor(await createUser())).toBe(false);
  });
});

describe("paddle mode", () => {
  it("checks a new account out on the trial price: a new Paddle customer, the user in custom_data, our checkout page", async () => {
    usePaddle();
    const user = await createUser({ email: "new@example.com" });
    const url = await createCheckoutUrl(user, "pro", "month");
    expect(url).toBe("https://otto.example/checkout?_ptxn=txn_1&plan=pro&trial=1");
    expect(paddle.callsTo("POST /customers")[0]?.body).toEqual({ email: "new@example.com" });
    expect(transactionBody()).toEqual({
      items: [{ price_id: PADDLE.PADDLE_PRO_TRIAL_PRICE_ID, quantity: 1 }],
      customer_id: CTM_1,
      custom_data: { user_id: user.id },
    });
    const call = paddle.callsTo("POST /transactions")[0];
    expect(call?.headers.get("authorization")).toBe(`Bearer ${PADDLE.PADDLE_API_KEY}`);
    expect(call?.headers.get("paddle-version")).toBe("1");
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).toContain(
      "https://sandbox-api.paddle.com/transactions",
    );
    expect((await reload(user.id))?.billingCustomerId).toBeNull();
  });

  it("checks someone who has trialed or paid before out on the normal Pro price, reusing their Paddle customer", async () => {
    usePaddle();
    const user = await createUser({ email: "back@example.com" });
    paddle.customers.push({ id: "ctm_back", email: "back@example.com" });
    await recordTrialHistory(await getDb(), user.email, "paid");
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(
      "https://otto.example/checkout?_ptxn=txn_1&plan=pro",
    );
    expect(transactionBody()).toMatchObject({
      items: [{ price_id: PADDLE.PADDLE_PRO_MONTHLY_PRICE_ID, quantity: 1 }],
      customer_id: "ctm_back",
    });
    expect(paddle.callsTo("POST /customers")).toEqual([]);
  });

  it("checks out under the stored customer once the old subscription has ended", async () => {
    usePaddle();
    const user = await createUser({ planStatus: "canceled", billingCustomerId: "ctm_7", billingSubscriptionId: "sub_7" });
    paddle.subscriptions.push({ id: "sub_7", customer: "ctm_7", price: "pri_pro_month", status: "canceled" });
    await createCheckoutUrl(user, "pro", "month");
    expect(transactionBody()?.customer_id).toBe("ctm_7");
    expect(paddle.callsTo("POST /customers")).toEqual([]);
  });

  it("uses the customer Paddle names when another checkout created it a moment ago", async () => {
    usePaddle();
    const user = await createUser();
    const named = `ctm_${"9".repeat(26)}`;
    paddle.failNext("POST /customers", 409, 1, "customer_already_exists", `conflicts with customer of id ${named}`);
    await createCheckoutUrl(user, "pro", "month");
    expect(transactionBody()?.customer_id).toBe(named);
  });

  it("uses the live API only when PADDLE_ENVIRONMENT says live", async () => {
    usePaddle({ PADDLE_ENVIRONMENT: " Live " });
    await createCheckoutUrl(await createUser(), "pro", "month");
    expect(vi.mocked(fetch).mock.calls.map(([input]) => String(input))).toContain(
      "https://api.paddle.com/transactions",
    );
  });

  it("checks out the yearly or Max price only once it's set, never on the trial", async () => {
    usePaddle();
    const user = await createUser();
    await expect(createCheckoutUrl(user, "pro", "year")).rejects.toMatchObject({ code: "unavailable" });
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "unavailable" });
    usePaddle({ PADDLE_PRO_YEARLY_PRICE_ID: "pri_pro_year", PADDLE_MAX_MONTHLY_PRICE_ID: "pri_max_month" });
    expect(await createCheckoutUrl(user, "pro", "year")).toBe("https://otto.example/checkout?_ptxn=txn_1&plan=pro");
    expect(transactionBody()?.items).toEqual([{ price_id: "pri_pro_year", quantity: 1 }]);
    expect(await createCheckoutUrl(user, "max", "month")).toBe("https://otto.example/checkout?_ptxn=txn_2&plan=max");
    expect(transactionBody()?.items).toEqual([{ price_id: "pri_max_month", quantity: 1 }]);
  });

  it("moves an active Pro subscription to Max in place, charging the prorated difference now", async () => {
    usePaddle(MAX);
    const user = await createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_1",
    });
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    expect(await createCheckoutUrl(user, "max", "month")).toBe("/account?checkout=success&plan=max");
    expect(paddle.callsTo("PATCH /subscriptions/sub_1")[0]?.body).toEqual({
      items: [{ price_id: "pri_max_month", quantity: 1 }],
      proration_billing_mode: "prorated_immediately",
    });
    expect(paddle.callsTo("POST /transactions")).toEqual([]);
  });

  it("finds the subscription under the same-email customer too, and only on our prices", async () => {
    usePaddle(MAX);
    const user = await createUser({ plan: "pro", planStatus: "active", email: "ada@example.com" });
    paddle.customers.push({ id: "ctm_ada", email: "ada@example.com" });
    paddle.subscriptions.push(
      { id: "sub_other", customer: "ctm_ada", price: "pri_ebook", status: "active" },
      { id: "sub_ada", customer: "ctm_ada", price: "pri_pro_month", status: "active" },
    );
    await createCheckoutUrl(user, "max", "year");
    expect(paddle.callsTo("PATCH /subscriptions/sub_ada")).toHaveLength(1);
    expect(paddle.callsTo("PATCH /subscriptions/sub_other")).toEqual([]);
    const listed = paddle.callsTo("GET /subscriptions")[0]?.query;
    expect(listed?.get("customer_id")).toBe("ctm_ada");
    expect(listed?.get("status")).toBe("active,trialing,past_due,paused");
  });

  describe("on the Pro trial", () => {
    const trialist = (overrides: Partial<typeof users.$inferInsert> = {}) =>
      createUser({
        plan: "pro",
        planInterval: "month",
        planStatus: "trialing",
        trialEndsAt: Date.now() + DAY_MS,
        billingCustomerId: "ctm_1",
        billingSubscriptionId: "sub_trial",
        ...overrides,
      });

    it("opens a checkout for Max that names the trial to cancel, and never changes the trial", async () => {
      usePaddle(MAX);
      const user = await trialist();
      paddle.subscriptions.push({ id: "sub_trial", customer: "ctm_1", price: "pri_pro_trial", status: "trialing" });
      expect(await createCheckoutUrl(user, "max", "year")).toBe("https://otto.example/checkout?_ptxn=txn_1&plan=max");
      expect(transactionBody()).toEqual({
        items: [{ price_id: "pri_max_year", quantity: 1 }],
        customer_id: "ctm_1",
        custom_data: { user_id: user.id, replaces_subscription_id: "sub_trial" },
      });
      expect(paddle.callsTo("PATCH /subscriptions")).toEqual([]);
      expect(paddle.callsTo("POST /subscriptions")).toEqual([]);
      expect((await reload(user.id))?.planStatus).toBe("trialing");
    });

    it("does the same for a trial cancelled in the portal, but sends a paid plan set to end there", async () => {
      usePaddle(MAX);
      const user = await trialist();
      const cancel = { action: "cancel" as const, effective_at: "2026-11-11T10:00:00.000Z" };
      paddle.subscriptions.push({ id: "sub_trial", customer: "ctm_1", price: "pri_pro_trial", status: "trialing", scheduledChange: cancel });
      expect(await createCheckoutUrl(user, "max", "month")).toBe("https://otto.example/checkout?_ptxn=txn_1&plan=max");

      const paid = await trialist({
        email: "paid@example.com",
        planStatus: "scheduled_cancel",
        trialEndsAt: null,
        billingCustomerId: "ctm_2",
        billingSubscriptionId: "sub_paid",
      });
      paddle.subscriptions.push({ id: "sub_paid", customer: "ctm_2", price: "pri_pro_month", status: "active", scheduledChange: cancel });
      expect(await createCheckoutUrl(paid, "max", "month")).toBe("https://customer-portal.paddle.test/ctm_2");
      expect(paddle.callsTo("POST /customers/ctm_2/portal-sessions")[0]?.body).toEqual({ subscription_ids: ["sub_paid"] });
      expect(paddle.callsTo("POST /transactions")).toHaveLength(1);
      expect(paddle.callsTo("PATCH /subscriptions")).toEqual([]);
    });

    it("goes to the portal while a plan bought a moment ago is still on its way", async () => {
      usePaddle(MAX);
      const user = await trialist();
      paddle.subscriptions.push(
        { id: "sub_trial", customer: "ctm_1", price: "pri_pro_trial", status: "trialing" },
        { id: "sub_max", customer: "ctm_1", price: "pri_max_month", status: "active" },
      );
      expect(await createCheckoutUrl(user, "max", "month")).toBe("https://customer-portal.paddle.test/ctm_1");
      expect(paddle.callsTo("POST /transactions")).toEqual([]);
    });

    it("asks to try again when Paddle can't list the subscriptions, rather than risk a second plan", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      usePaddle(MAX);
      const user = await trialist();
      paddle.failNext("GET /customers", 500, 10);
      await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "provider_error" });
      expect(paddle.callsTo("POST /transactions")).toEqual([]);
    });
  });

  it("refuses a plan change while a renewal is past due, without writing to Paddle", async () => {
    usePaddle(MAX);
    const user = await createUser({
      plan: "pro",
      planStatus: "past_due",
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_1",
    });
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "past_due" });
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "payment_overdue" });
    expect(writes()).toEqual([]);
  });

  it("tells a refused change (4xx, with Paddle's code) apart from Paddle being down (5xx), never retrying the write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    usePaddle(MAX);
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_1",
    });
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    paddle.failNext("PATCH /subscriptions/sub_1", 400, 1, "subscription_locked_renewal");
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "refused",
      details: { operation: "change_plan", providerStatus: 400, providerCode: "subscription_locked_renewal" },
    });
    paddle.failNext("PATCH /subscriptions/sub_1", 502);
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "provider_error" });
    paddle.failNext("PATCH /subscriptions/sub_1", 0);
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "provider_error" });
    expect(paddle.callsTo("PATCH /subscriptions/sub_1")).toHaveLength(3);
  });

  it("routes each status to a plan change", () => {
    const pro = { plan: "pro" as const, trialEndsAt: null };
    const trial = { plan: "pro" as const, trialEndsAt: Date.now() + DAY_MS };
    expect(
      ["active", "trialing", "past_due", "scheduled_cancel", "paused", "canceled", "unknown"].map(
        (status) => [status, planChangeRoute(status, pro)],
      ),
    ).toEqual([
      ["active", "in_place"],
      ["trialing", "replace_trial"],
      ["past_due", "fix_payment"],
      ["scheduled_cancel", "portal"],
      ["paused", "portal"],
      ["canceled", "portal"],
      ["unknown", "portal"],
    ]);
    expect(planChangeRoute("scheduled_cancel", trial)).toBe("replace_trial");
    expect(planChangeRoute("past_due", trial)).toBe("fix_payment");
  });

  it("sends someone with a paused subscription to the portal instead of a second one", async () => {
    usePaddle();
    const user = await createUser({ email: "maya@example.com" });
    paddle.customers.push({ id: "ctm_9", email: "maya@example.com" });
    paddle.subscriptions.push({ id: "sub_9", customer: "ctm_9", price: "pri_pro_month", status: "paused" });
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("https://customer-portal.paddle.test/ctm_9");
    expect(paddle.callsTo("POST /transactions")).toEqual([]);
  });

  it("opens checkout past ended and other prices' subscriptions", async () => {
    usePaddle();
    const user = await createUser({ email: "maya@example.com" });
    paddle.customers.push({ id: "ctm_9", email: "maya@example.com" });
    paddle.subscriptions.push(
      { id: "sub_a", customer: "ctm_9", price: "pri_pro_month", status: "canceled" },
      { id: "sub_b", customer: "ctm_9", price: "pri_ebook", status: "active" },
    );
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(
      "https://otto.example/checkout?_ptxn=txn_1&plan=pro&trial=1",
    );
  });

  it("falls back to the stored subscription when Paddle can't list them, and reports provider errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    usePaddle();
    const user = await createUser({ planStatus: "paused", billingCustomerId: "ctm_1", billingSubscriptionId: "sub_1" });
    paddle.failNext("GET /customers", 500, 3);
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("https://customer-portal.paddle.test/ctm_1");

    const fresh = await createUser();
    paddle.failNext("POST /transactions", 500);
    await expect(createCheckoutUrl(fresh, "pro", "month")).rejects.toMatchObject({ code: "provider_error" });
    expect(paddle.callsTo("POST /transactions")).toHaveLength(1);
  });

  it("retries a read that hit a busy or unreachable Paddle", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    usePaddle();
    const user = await createUser();
    paddle.failNext("GET /customers", 503);
    paddle.failNext("GET /subscriptions", 0);
    await createCheckoutUrl(user, "pro", "month");
    expect(paddle.callsTo("POST /transactions")).toHaveLength(1);
  });

  it("opens the customer portal for the stored customer, and has none for someone who never paid", async () => {
    usePaddle();
    const user = await createUser({ plan: "pro", billingCustomerId: "ctm_7", billingSubscriptionId: "sub_7" });
    expect(await createPortalUrl(user)).toBe("https://customer-portal.paddle.test/ctm_7");
    expect(paddle.callsTo("POST /customers/ctm_7/portal-sessions")[0]?.body).toEqual({});
    await expect(createPortalUrl(await createUser())).rejects.toMatchObject({ code: "no_subscription" });
  });

  it("never logs the customer's email when checkout fails", async () => {
    usePaddle();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await createUser({ email: "secret.person@example.com" });
    paddle.failNext("POST /customers", 400, 1, "invalid_field", "email secret.person@example.com is invalid");
    await expect(createCheckoutUrl(user, "pro", "month")).rejects.toMatchObject({
      code: "refused",
      details: { operation: "checkout", providerStatus: 400, providerCode: "invalid_field" },
    });
    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.provider_failed");
    expect(output).toContain("req-test");
    expect(output).not.toContain("secret.person");
  });
});

describe("cancelSubscriptionForDeletion", () => {
  const subscriber = (overrides: Partial<typeof users.$inferInsert> = {}) =>
    createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_1",
      ...overrides,
    });

  it("cancels the stored subscription right away and every other live one for the person", async () => {
    usePaddle();
    const user = await subscriber({ email: "ada@example.com" });
    paddle.customers.push({ id: "ctm_2", email: "ada@example.com" });
    paddle.subscriptions.push(
      { id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" },
      { id: "sub_2", customer: "ctm_2", price: "pri_pro_trial", status: "trialing" },
    );
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(paddle.callsTo("POST /subscriptions/sub_1/cancel")[0]?.body).toEqual({ effective_from: "immediately" });
    expect(paddle.callsTo("POST /subscriptions/sub_2/cancel")[0]?.body).toEqual({ effective_from: "immediately" });
    expect(paddle.callsTo("GET /subscriptions")[0]?.query.get("customer_id")).toBe("ctm_1,ctm_2");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled", trialEndsAt: null });
  });

  it("does nothing for someone who never subscribed", async () => {
    usePaddle();
    expect(await cancelSubscriptionForDeletion(await createUser())).toBe("none");
    expect(paddle.calls).toEqual([]);
  });

  it("treats a refused cancel as done when Paddle says it already ended", async () => {
    usePaddle();
    const user = await subscriber();
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "canceled" });
    expect(await cancelSubscriptionForDeletion(user)).toBe("already_ended");
    expect(paddle.callsTo("GET /subscriptions/sub_1")).toHaveLength(1);
  });

  it("treats a refused cancel as done when the person already cancelled in the portal", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    usePaddle();
    const user = await subscriber({ planStatus: "scheduled_cancel" });
    const cancel = { action: "cancel" as const, effective_at: "2026-12-08T10:00:00.000Z" };
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active", scheduledChange: cancel });
    paddle.failNext("POST /subscriptions/sub_1/cancel", 400, 1, "subscription_locked_pending_changes");
    expect(await cancelSubscriptionForDeletion(user)).toBe("already_ended");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled" });
  });

  it("fails, keeping the account, when Paddle refuses to cancel a live one, can't find it, or can't be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    usePaddle();
    const user = await subscriber();
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    paddle.failNext("POST /subscriptions/sub_1/cancel", 400, 1, "subscription_locked_renewal");
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    paddle.failNext("POST /subscriptions/sub_1/cancel", 503);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    expect(paddle.callsTo("POST /subscriptions/sub_1/cancel")).toHaveLength(2);
    expect((await reload(user.id))?.plan).toBe("pro");

    const missing = await subscriber({ email: "gone@example.com", billingCustomerId: "ctm_gone", billingSubscriptionId: "sub_gone" });
    await expect(cancelSubscriptionForDeletion(missing)).rejects.toMatchObject({ code: "refused" });
    expect((await reload(missing.id))?.plan).toBe("pro");
  });

  it("cancels the stored subscription even when Paddle can't list the others", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    usePaddle();
    const user = await subscriber();
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    paddle.failNext("GET /subscriptions", 500, 10);
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
  });

  it("warns and carries on when there is no API key to cancel with", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    usePaddle({ NODE_ENV: "production", PADDLE_API_KEY: undefined });
    expect(await cancelSubscriptionForDeletion(await subscriber())).toBe("not_configured");
    expect(paddle.calls).toEqual([]);
  });

  it("downgrades locally in mock mode", async () => {
    const user = await subscriber({ planStatus: "mock_trialing", billingCustomerId: null, billingSubscriptionId: null });
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "mock_cancelled" });
  });

  it("never logs the customer's email", async () => {
    usePaddle();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await subscriber();
    paddle.subscriptions.push({ id: "sub_1", customer: "ctm_1", price: "pri_pro_month", status: "active" });
    paddle.failNext("POST /subscriptions/sub_1/cancel", 502);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    await cancelSubscriptionForDeletion(user);
    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.subscription_cancelled");
    expect(output).not.toContain(user.email);
  });
});
