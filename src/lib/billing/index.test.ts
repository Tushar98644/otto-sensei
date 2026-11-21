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
import { signBillingId } from "./billing-sign";
import { chargeableSubscriptionId } from "./entitlements";
import { dodoId, installFakeDodo, type FakeDodo } from "./dodo-testing";
import { recordTrialHistory } from "./trial";

const APP_URL = "https://otto.example";
const KEY = "dodo_test_apikey";
const SIGNING_SECRET = "billing_signing_secret_for_tests";
const PRO_MONTH = dodoId("pdt", "promonth");
const PRO_TRIAL = dodoId("pdt", "protrial");
const PRO_YEAR = dodoId("pdt", "proyear");
const MAX_MONTH = dodoId("pdt", "maxmonth");
const MAX_YEAR = dodoId("pdt", "maxyear");
const EBOOK = dodoId("pdt", "ebook");
const DODO = {
  DODO_API_KEY: KEY,
  DODO_WEBHOOK_SECRET: "whsec_dGVzdC13ZWJob29rLXNlY3JldA==",
  BILLING_SIGNING_SECRET: SIGNING_SECRET,
  DODO_PRO_MONTHLY_PRODUCT_ID: PRO_MONTH,
  DODO_PRO_TRIAL_PRODUCT_ID: PRO_TRIAL,
} as const;
const MAX = { DODO_MAX_MONTHLY_PRODUCT_ID: MAX_MONTH, DODO_MAX_YEARLY_PRODUCT_ID: MAX_YEAR };
const UNSET = {
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
// Paddle-sandbox ids still stored before the reset: never sent to Dodo.
const PADDLE = {
  billingCustomerId: `ctm_${"a1".repeat(13)}`,
  billingSubscriptionId: `sub_${"b2".repeat(13)}`,
};
const DAY_MS = 86_400_000;
const CANCEL_NOW = { status: "cancelled", cancel_reason: "cancelled_by_merchant" };

const cus = (name: string | number) => dodoId("cus", name);
const sub = (name: string | number) => dodoId("sub", name);
const hosted = (n: number) =>
  `https://test.checkout.dodopayments.com/session/cks_${String(n).padStart(21, "0")}`;
const portal = (customer: string) => `https://customer-portal.dodo.test/${customer}`;
const signed = (id: string) => signBillingId(id, SIGNING_SECRET);
const changeBody = (product: string, mode: string) => ({
  product_id: product,
  quantity: 1,
  proration_billing_mode: mode,
  effective_at: "immediately",
  on_payment_failure: "prevent_change",
});

type Row = typeof users.$inferSelect;
let sequence = 0;
let dodo: FakeDodo;

async function createUser(
  overrides: Partial<typeof users.$inferInsert> = {},
): Promise<SessionUser> {
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

const useDodo = (extra: Record<string, string | undefined> = {}) => useEnv({ ...DODO, ...extra });

const writes = () => dodo.calls.filter((call) => call.method !== "GET");
const checkoutBody = () =>
  dodo.callsTo("POST /checkouts").at(-1)?.body as Record<string, unknown> | undefined;
const changes = () =>
  dodo.calls
    .filter((call) => call.path.endsWith("/change-plan"))
    .map((call) => [call.path, call.body]);
const fetched = () => vi.mocked(fetch).mock.calls.map(([input]) => String(input));
const sentAnywhere = (value: string) =>
  dodo.calls.some((call) =>
    `${call.path}?${call.query.toString()} ${JSON.stringify(call.body ?? "")}`.includes(value),
  );

beforeEach(async () => {
  useEnv({ NEXT_PUBLIC_APP_URL: APP_URL, ...UNSET });
  dodo = installFakeDodo();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billingMode", () => {
  it("is mock in development without keys, and dodo once the key, both secrets and the Pro product are set", () => {
    expect(billingMode()).toBe("mock");
    useDodo({ BILLING_SIGNING_SECRET: undefined });
    expect(billingMode()).toBe("mock");
    useDodo({ DODO_WEBHOOK_SECRET: "" });
    expect(billingMode()).toBe("mock");
    useDodo({ DODO_PRO_MONTHLY_PRODUCT_ID: undefined });
    expect(billingMode()).toBe("mock");
    useDodo();
    expect(billingMode()).toBe("dodo");
  });

  it("is disabled in production unless every key is set", () => {
    useEnv({ NODE_ENV: "production", DODO_API_KEY: KEY });
    expect(billingMode()).toBe("disabled");
    useDodo({ NODE_ENV: "production", DODO_WEBHOOK_SECRET: "" });
    expect(billingMode()).toBe("disabled");
    useDodo({ NODE_ENV: "production" });
    expect(billingMode()).toBe("dodo");
  });

  it("stays off, logging it once, when the key belongs to the other Dodo mode", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo({ DODO_ENVIRONMENT: "live" });
    expect(billingMode()).toBe("mock");
    useDodo({ NODE_ENV: "production", DODO_ENVIRONMENT: "live" });
    expect(billingMode()).toBe("disabled");
    useDodo({ NODE_ENV: "production", DODO_API_KEY: "dodo_live_apikey", DODO_ENVIRONMENT: "test" });
    expect(billingMode()).toBe("disabled");
    useDodo({ NODE_ENV: "production", DODO_API_KEY: "pdl_live_apikey", DODO_ENVIRONMENT: "live" });
    expect(billingMode()).toBe("disabled");
    useDodo({ NODE_ENV: "production", DODO_API_KEY: "dodo_live_apikey", DODO_ENVIRONMENT: "live" });
    expect(billingMode()).toBe("dodo");
    const logged = errors.mock.calls.filter(([line]) =>
      String(line).includes("billing.key_environment_mismatch"),
    );
    expect(logged).toHaveLength(1);
    expect(JSON.stringify(errors.mock.calls)).not.toContain("apikey");
  });
});

describe("mock mode", () => {
  it("starts a new account on the trial: Pro, trialing, ending in 3 days, written down once", async () => {
    const user = await createUser();
    const before = Date.now();
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(
      "/account?checkout=success&plan=pro&trial=1",
    );
    const row = await reload(user.id);
    expect(row).toMatchObject({ plan: "pro", planInterval: "month", planStatus: "mock_trialing" });
    expect(row?.trialEndsAt).toBeGreaterThanOrEqual(before + 3 * DAY_MS);
    expect(await (await getDb()).select().from(trialHistory)).toHaveLength(1);
    expect(dodo.calls).toEqual([]);
  });

  it("gives someone who already had a trial the plain plan, and Max or yearly never trial", async () => {
    const returning = await createUser({ planStatus: "mock_cancelled" });
    expect(await createCheckoutUrl(returning, "pro", "month")).toBe(
      "/account?checkout=success&plan=pro",
    );
    expect(await reload(returning.id)).toMatchObject({
      plan: "pro",
      planStatus: "mock_active",
      trialEndsAt: null,
    });

    const fresh = await createUser();
    expect(await createCheckoutUrl(fresh, "max", "year")).toBe(
      "/account?checkout=success&plan=max",
    );
    expect(await reload(fresh.id)).toMatchObject({
      plan: "max",
      planInterval: "year",
      trialEndsAt: null,
    });
  });

  it("portal downgrades a subscribed user and ends the trial; it refuses someone who never subscribed", async () => {
    const user = await createUser();
    await createCheckoutUrl(user, "pro", "month");
    expect(await createPortalUrl(user)).toBe("/account?portal=mock");
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      trialEndsAt: null,
      planStatus: "mock_cancelled",
    });
    expect(await trialAvailableFor(toSessionUser((await reload(user.id))!))).toBe(false);

    const never = await createUser();
    await expect(createPortalUrl(never)).rejects.toMatchObject({ code: "no_subscription" });
  });

  it("refuses a second checkout for the plan the user is on", async () => {
    const user = await createUser({ plan: "pro", planStatus: "mock_active" });
    await expect(createCheckoutUrl(user, "pro")).rejects.toMatchObject({
      code: "already_subscribed",
    });
  });
});

describe("disabled mode", () => {
  it("throws unavailable for checkout and portal", async () => {
    useEnv({ NODE_ENV: "production" });
    const user = await createUser();
    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "unavailable" });
    await expect(createPortalUrl(user)).rejects.toMatchObject({ code: "unavailable" });
    expect(dodo.calls).toEqual([]);
  });
});

describe("trial eligibility", () => {
  it("is one per person: a trial or a payment under the email, any billing history, or a paid plan", async () => {
    useDodo();
    const fresh = await createUser();
    expect(await trialAvailableFor(fresh)).toBe(true);

    const trialed = await createUser();
    await recordTrialHistory(await getDb(), trialed.email, "trial");
    expect(await trialAvailableFor(trialed)).toBe(false);

    const again = await createUser({ email: `  ${trialed.email.toUpperCase()} ` });
    expect(await trialAvailableFor({ ...again, email: trialed.email.toUpperCase() })).toBe(false);

    const paidBefore = await createUser({
      planStatus: "canceled",
      billingSubscriptionId: sub("old"),
    });
    expect(await trialAvailableFor(paidBefore)).toBe(false);

    const paying = await createUser({ plan: "pro", planStatus: "active" });
    expect(await trialAvailableFor(paying)).toBe(false);
  });

  it("isn't offered without a trial product", async () => {
    useDodo({ DODO_PRO_TRIAL_PRODUCT_ID: undefined });
    expect(await trialAvailableFor(await createUser())).toBe(false);
  });
});

describe("dodo mode", () => {
  it("checks a new account out on the trial product: by email, the signed user and the choice in metadata, on Dodo's hosted page", async () => {
    useDodo();
    const user = await createUser({ email: "new@example.com" });
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(hosted(1));
    expect(checkoutBody()).toEqual({
      product_cart: [{ product_id: PRO_TRIAL, quantity: 1 }],
      billing_currency: "USD",
      customer: { email: "new@example.com" },
      metadata: {
        user_id: user.id,
        user_sig: signed(user.id),
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
      customization: { theme: "light" },
    });
    const call = dodo.callsTo("POST /checkouts")[0];
    expect(call?.headers.get("authorization")).toBe(`Bearer ${KEY}`);
    expect(fetched()).toContain("https://test.dodopayments.com/checkouts");
    expect(writes()).toHaveLength(1);
    expect((await reload(user.id))?.billingCustomerId).toBeNull();
  });

  it("checks someone who has trialed or paid before out on the normal Pro product, by email so Dodo reuses their customer", async () => {
    useDodo();
    const user = await createUser({ email: "back@example.com" });
    dodo.customers.push({ id: cus("back"), email: "back@example.com" });
    await recordTrialHistory(await getDb(), user.email, "paid");
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(hosted(1));
    expect(checkoutBody()).toMatchObject({
      product_cart: [{ product_id: PRO_MONTH, quantity: 1 }],
      billing_currency: "USD",
      customer: { email: "back@example.com" },
      metadata: { plan: "pro", interval: "month", trial: "false" },
      return_url: `${APP_URL}/api/billing/return?plan=pro`,
    });
    expect(dodo.callsTo("GET /subscriptions")[0]?.query.get("customer_id")).toBe(cus("back"));
  });

  it("checks out under the stored customer once the old subscription has ended", async () => {
    useDodo();
    const user = await createUser({
      planStatus: "canceled",
      billingCustomerId: cus(7),
      billingSubscriptionId: sub(7),
    });
    dodo.subscriptions.push({
      id: sub(7),
      customer: cus(7),
      product: PRO_MONTH,
      status: "cancelled",
    });
    await createCheckoutUrl(user, "pro", "month");
    expect(checkoutBody()).toMatchObject({
      customer: { customer_id: cus(7) },
      product_cart: [{ product_id: PRO_MONTH, quantity: 1 }],
      billing_currency: "USD",
    });
  });

  it("uses the live API only when DODO_ENVIRONMENT says live", async () => {
    useDodo({ DODO_API_KEY: "dodo_live_apikey", DODO_ENVIRONMENT: " Live " });
    await createCheckoutUrl(await createUser(), "pro", "month");
    expect(fetched()).toContain("https://live.dodopayments.com/checkouts");
    expect(fetched().some((url) => url.includes("test.dodopayments.com"))).toBe(false);
  });

  it("checks out the yearly or Max product only once it's set, never on the trial", async () => {
    useDodo();
    const user = await createUser();
    await expect(createCheckoutUrl(user, "pro", "year")).rejects.toMatchObject({
      code: "unavailable",
    });
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "unavailable",
    });
    useDodo({ DODO_PRO_YEARLY_PRODUCT_ID: PRO_YEAR, DODO_MAX_MONTHLY_PRODUCT_ID: MAX_MONTH });
    expect(await createCheckoutUrl(user, "pro", "year")).toBe(hosted(1));
    expect(checkoutBody()).toMatchObject({
      product_cart: [{ product_id: PRO_YEAR, quantity: 1 }],
      billing_currency: "USD",
      metadata: { plan: "pro", interval: "year", trial: "false" },
    });
    expect(await createCheckoutUrl(user, "max", "month")).toBe(hosted(2));
    expect(checkoutBody()).toMatchObject({
      product_cart: [{ product_id: MAX_MONTH, quantity: 1 }],
      billing_currency: "USD",
      metadata: { plan: "max", interval: "month", trial: "false" },
      return_url: `${APP_URL}/api/billing/return?plan=max`,
    });
  });

  it("refuses a product id that isn't Dodo's (a Paddle price left in the env) before writing anything", async () => {
    const paddlePrice = `pri_${"c3".repeat(13)}`;
    useDodo({ DODO_PRO_MONTHLY_PRODUCT_ID: paddlePrice, DODO_PRO_TRIAL_PRODUCT_ID: undefined });
    await expect(createCheckoutUrl(await createUser(), "pro", "month")).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(writes()).toEqual([]);
    expect(sentAnywhere(paddlePrice)).toBe(false);
  });

  it("moves an active Pro subscription to Max in place, charging the difference now and keeping the renewal date", async () => {
    useDodo(MAX);
    const user = await createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: cus(1),
      billingSubscriptionId: sub(1),
    });
    dodo.subscriptions.push({ id: sub(1), customer: cus(1), product: PRO_MONTH, status: "active" });
    expect(await createCheckoutUrl(user, "max", "month")).toBe(
      "/account?checkout=success&plan=max",
    );
    expect(changes()).toEqual([
      [
        `/subscriptions/${sub(1)}/change-plan`,
        changeBody(MAX_MONTH, "prorated_immediately_keep_cycle"),
      ],
    ]);
    expect(dodo.callsTo("POST /checkouts")).toEqual([]);
  });

  it("refuses Max to Pro and a switch between monthly and yearly, before asking Dodo anything", async () => {
    useDodo({ ...MAX, DODO_PRO_YEARLY_PRODUCT_ID: PRO_YEAR });
    const paid = { planStatus: "active", billingCustomerId: cus(1), billingSubscriptionId: sub(1) };
    const max = await createUser({ plan: "max", planInterval: "month", ...paid });
    const pro = await createUser({ plan: "pro", planInterval: "month", ...paid });
    const yearly = await createUser({ plan: "pro", planInterval: "year", ...paid });
    await expect(createCheckoutUrl(max, "pro", "month")).rejects.toMatchObject({
      code: "change_not_offered",
    });
    await expect(createCheckoutUrl(pro, "max", "year")).rejects.toMatchObject({
      code: "change_not_offered",
    });
    await expect(createCheckoutUrl(yearly, "max", "month")).rejects.toMatchObject({
      code: "change_not_offered",
    });
    expect(dodo.calls).toEqual([]);
  });

  it("finds the subscription under the same-email customer too, and only on our products", async () => {
    useDodo(MAX);
    const user = await createUser({ plan: "pro", planStatus: "active", email: "ada@example.com" });
    dodo.customers.push(
      { id: cus("ada"), email: "ada@example.com" },
      { id: cus("nada"), email: "nada@example.com" },
    );
    dodo.subscriptions.push(
      { id: sub("other"), customer: cus("ada"), product: EBOOK, status: "active" },
      { id: sub("ada"), customer: cus("ada"), product: PRO_MONTH, status: "active" },
      { id: sub("nada"), customer: cus("nada"), product: PRO_MONTH, status: "active" },
    );
    await createCheckoutUrl(user, "max", "year");
    expect(changes()).toEqual([
      [`/subscriptions/${sub("ada")}/change-plan`, changeBody(MAX_YEAR, expect.any(String))],
    ]);
    const lookup = dodo.callsTo("GET /customers")[0]?.query;
    expect(lookup?.get("email")).toBe("ada@example.com");
    const listed = dodo.callsTo("GET /subscriptions").map((call) => call.query);
    expect(listed.map((query) => query.get("customer_id"))).toEqual([cus("ada")]);
    expect(listed[0]?.get("page_size")).toBe("100");
  });

  describe("with ids left over from the Paddle sandbox", () => {
    it("checks out by email, never sending the Paddle ids", async () => {
      useDodo();
      const user = await createUser({ planStatus: "canceled", ...PADDLE });
      expect(await createCheckoutUrl(user, "pro", "month")).toBe(hosted(1));
      expect(checkoutBody()?.customer).toEqual({ email: user.email });
      expect(dodo.callsTo("GET /subscriptions")).toEqual([]);
      expect(sentAnywhere(PADDLE.billingCustomerId)).toBe(false);
      expect(sentAnywhere(PADDLE.billingSubscriptionId)).toBe(false);
    });

    it("still finds a Dodo subscription under the same email", async () => {
      useDodo(MAX);
      const user = await createUser({
        plan: "pro",
        planStatus: "active",
        email: "ada@example.com",
        ...PADDLE,
      });
      dodo.customers.push({ id: cus("ada"), email: "ada@example.com" });
      dodo.subscriptions.push({
        id: sub("ada"),
        customer: cus("ada"),
        product: PRO_MONTH,
        status: "active",
      });
      expect(await createCheckoutUrl(user, "max", "month")).toBe(
        "/account?checkout=success&plan=max",
      );
      expect(dodo.callsTo("GET /subscriptions")[0]?.query.get("customer_id")).toBe(cus("ada"));
      expect(sentAnywhere(PADDLE.billingSubscriptionId)).toBe(false);
    });

    it("doesn't fall back to them when Dodo can't list subscriptions", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      useDodo();
      const user = await createUser({ planStatus: "paused", ...PADDLE });
      dodo.failNext("GET /customers", 500, 3);
      expect(await createCheckoutUrl(user, "pro", "month")).toBe(hosted(1));
      expect(checkoutBody()?.customer).toEqual({ email: user.email });
      expect(sentAnywhere(PADDLE.billingCustomerId)).toBe(false);
    });

    it("has no portal to open", async () => {
      useDodo();
      const user = await createUser({ plan: "pro", planStatus: "active", ...PADDLE });
      await expect(createPortalUrl(user)).rejects.toMatchObject({ code: "no_subscription" });
      expect(dodo.calls).toEqual([]);
    });
  });

  describe("on the Pro trial", () => {
    const trialist = (overrides: Partial<typeof users.$inferInsert> = {}) =>
      createUser({
        plan: "pro",
        planInterval: "month",
        planStatus: "trialing",
        trialEndsAt: Date.now() + DAY_MS,
        billingCustomerId: cus(1),
        billingSubscriptionId: sub("trial"),
        ...overrides,
      });

    it("moves the trial to Max in place: the trial ends, the full price is charged now, and no checkout opens", async () => {
      useDodo(MAX);
      const user = await trialist();
      dodo.subscriptions.push({
        id: sub("trial"),
        customer: cus(1),
        product: PRO_TRIAL,
        status: "active",
        trial: true,
      });
      expect(await createCheckoutUrl(user, "max", "year")).toBe(
        "/account?checkout=success&plan=max",
      );
      expect(changes()).toEqual([
        [`/subscriptions/${sub("trial")}/change-plan`, changeBody(MAX_YEAR, "full_immediately")],
      ]);
      expect(dodo.callsTo("POST /checkouts")).toEqual([]);
      expect(dodo.callsTo("PATCH /subscriptions")).toEqual([]);
      // The new plan arrives by webhook.
      expect((await reload(user.id))?.planStatus).toBe("trialing");
    });

    it("sends a trial set to cancel, and a paid plan set to end, to the portal: Dodo refuses to change either", async () => {
      useDodo(MAX);
      const user = await trialist();
      dodo.subscriptions.push({
        id: sub("trial"),
        customer: cus(1),
        product: PRO_TRIAL,
        status: "active",
        trial: true,
        cancelAtNextBillingDate: true,
      });
      expect(await createCheckoutUrl(user, "max", "month")).toBe(portal(cus(1)));

      const paid = await trialist({
        email: "paid@example.com",
        planStatus: "scheduled_cancel",
        trialEndsAt: null,
        billingCustomerId: cus(2),
        billingSubscriptionId: sub("paid"),
      });
      dodo.subscriptions.push({
        id: sub("paid"),
        customer: cus(2),
        product: PRO_MONTH,
        status: "active",
        cancelAtNextBillingDate: true,
      });
      expect(await createCheckoutUrl(paid, "max", "month")).toBe(portal(cus(2)));
      const opened = dodo.callsTo(`POST /customers/${cus(2)}/customer-portal/session`)[0];
      expect(opened?.query.get("return_url")).toBe(`${APP_URL}/account`);
      expect(opened?.query.get("send_email")).toBe("false");
      expect(changes()).toEqual([]);
      expect(dodo.callsTo("POST /checkouts")).toEqual([]);
    });

    it("goes to the portal while a plan bought a moment ago is still on its way", async () => {
      useDodo(MAX);
      const user = await trialist();
      dodo.subscriptions.push(
        { id: sub("trial"), customer: cus(1), product: PRO_TRIAL, status: "active", trial: true },
        { id: sub("max"), customer: cus(1), product: MAX_MONTH, status: "active" },
      );
      expect(await createCheckoutUrl(user, "max", "month")).toBe(portal(cus(1)));
      expect(changes()).toEqual([]);
      expect(dodo.callsTo("POST /checkouts")).toEqual([]);
    });

    it("asks to try again when Dodo can't list the subscriptions, rather than risk a second plan", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      useDodo(MAX);
      const user = await trialist();
      dodo.failNext("GET /customers", 500, 10);
      await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
        code: "provider_error",
      });
      expect(writes()).toEqual([]);
    });

    it("passes on why Dodo refused the change, so the copy can say so", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      useDodo(MAX);
      const user = await trialist();
      dodo.subscriptions.push({
        id: sub("trial"),
        customer: cus(1),
        product: PRO_TRIAL,
        status: "active",
        trial: true,
      });
      const route = `POST /subscriptions/${sub("trial")}/change-plan`;
      dodo.failNext(route, 409, 1, "PENDING_PLAN_CHANGE_EXISTS");
      await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
        code: "refused",
        details: {
          operation: "change_plan",
          providerStatus: 409,
          providerCode: "pending_plan_change_exists",
          reason: "busy",
        },
      });
      expect(dodo.callsTo(route)).toHaveLength(1);
    });
  });

  it("refuses a plan change while a renewal is past due, without writing to Dodo", async () => {
    useDodo(MAX);
    const user = await createUser({
      plan: "pro",
      planStatus: "past_due",
      billingCustomerId: cus(1),
      billingSubscriptionId: sub(1),
    });
    dodo.subscriptions.push({
      id: sub(1),
      customer: cus(1),
      product: PRO_MONTH,
      status: "past_due",
    });
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "payment_overdue",
    });
    expect(writes()).toEqual([]);
  });

  it("sends someone whose plan is on hold to the portal to fix the card, never into a second subscription", async () => {
    useDodo(MAX);
    const user = await createUser({
      plan: "free",
      planStatus: "on_hold",
      billingCustomerId: cus(1),
      billingSubscriptionId: sub(1),
    });
    dodo.subscriptions.push({
      id: sub(1),
      customer: cus(1),
      product: PRO_MONTH,
      status: "on_hold",
    });
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(portal(cus(1)));
    expect(await createCheckoutUrl(user, "max", "month")).toBe(portal(cus(1)));
    expect(dodo.callsTo("POST /checkouts")).toEqual([]);
    expect(changes()).toEqual([]);
  });

  it("tells a refused change (4xx, with Dodo's code) apart from Dodo being down (5xx), never retrying the write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo(MAX);
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: cus(1),
      billingSubscriptionId: sub(1),
    });
    dodo.subscriptions.push({ id: sub(1), customer: cus(1), product: PRO_MONTH, status: "active" });
    const route = `POST /subscriptions/${sub(1)}/change-plan`;
    dodo.failNext(route, 422, 1, "SubscriptionInactive");
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "refused",
      details: {
        operation: "change_plan",
        providerStatus: 422,
        providerCode: "subscription_inactive",
        reason: "inactive",
      },
    });
    dodo.failNext(route, 502);
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "provider_error",
    });
    dodo.failNext(route, 0);
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({
      code: "provider_error",
    });
    expect(dodo.callsTo(route)).toHaveLength(3);
  });

  it("routes each status to a plan change", () => {
    expect(
      [
        "active",
        "trialing",
        "past_due",
        "scheduled_cancel",
        "on_hold",
        "paused",
        "canceled",
        "pending",
        "unknown",
      ].map((status) => [status, planChangeRoute(status)]),
    ).toEqual([
      ["active", "in_place"],
      ["trialing", "upgrade_trial"],
      ["past_due", "fix_payment"],
      ["scheduled_cancel", "portal"],
      ["on_hold", "portal"],
      ["paused", "portal"],
      ["canceled", "portal"],
      ["pending", "portal"],
      ["unknown", "portal"],
    ]);
  });

  it("sends someone with a paused subscription, or one still being set up, to the portal instead of a second one", async () => {
    useDodo();
    const user = await createUser({ email: "maya@example.com" });
    dodo.customers.push({ id: cus(9), email: "maya@example.com" });
    dodo.subscriptions.push({ id: sub(9), customer: cus(9), product: PRO_MONTH, status: "paused" });
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(portal(cus(9)));

    const settingUp = await createUser({ email: "lin@example.com" });
    dodo.customers.push({ id: cus(8), email: "lin@example.com" });
    dodo.subscriptions.push({
      id: sub(8),
      customer: cus(8),
      product: PRO_TRIAL,
      status: "pending",
    });
    expect(await createCheckoutUrl(settingUp, "pro", "month")).toBe(portal(cus(8)));
    expect(dodo.callsTo("POST /checkouts")).toEqual([]);
  });

  it("opens checkout past ended and other products' subscriptions", async () => {
    useDodo();
    const user = await createUser({ email: "maya@example.com" });
    dodo.customers.push({ id: cus(9), email: "maya@example.com" });
    dodo.subscriptions.push(
      { id: sub("a"), customer: cus(9), product: PRO_MONTH, status: "cancelled" },
      { id: sub("b"), customer: cus(9), product: EBOOK, status: "active" },
      { id: sub("c"), customer: cus(9), product: PRO_MONTH, status: "failed" },
    );
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(hosted(1));
    expect(checkoutBody()?.metadata).toMatchObject({ trial: "true" });
  });

  it("falls back to the stored subscription when Dodo can't list them, and reports provider errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    const user = await createUser({
      planStatus: "paused",
      billingCustomerId: cus(1),
      billingSubscriptionId: sub(1),
    });
    dodo.failNext("GET /customers", 500, 3);
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(portal(cus(1)));

    const fresh = await createUser();
    dodo.failNext("POST /checkouts", 500);
    await expect(createCheckoutUrl(fresh, "pro", "month")).rejects.toMatchObject({
      code: "provider_error",
    });
    expect(dodo.callsTo("POST /checkouts")).toHaveLength(1);
  });

  it("retries a read that hit a busy or unreachable Dodo", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    const user = await createUser({ email: "kai@example.com" });
    dodo.customers.push({ id: cus("kai"), email: "kai@example.com" });
    dodo.failNext("GET /customers", 503);
    dodo.failNext("GET /subscriptions", 0);
    expect(await createCheckoutUrl(user, "pro", "month")).toBe(hosted(1));
    expect(dodo.callsTo("GET /customers")).toHaveLength(2);
    expect(dodo.callsTo("GET /subscriptions")).toHaveLength(2);
  });

  it("opens the customer portal for the stored customer, and has none for someone who never paid", async () => {
    useDodo();
    const user = await createUser({
      plan: "pro",
      billingCustomerId: cus(7),
      billingSubscriptionId: sub(7),
    });
    expect(await createPortalUrl(user)).toBe(portal(cus(7)));
    const opened = dodo.callsTo(`POST /customers/${cus(7)}/customer-portal/session`)[0];
    expect(opened?.query.get("return_url")).toBe(`${APP_URL}/account`);
    expect(opened?.query.get("send_email")).toBe("false");
    await expect(createPortalUrl(await createUser())).rejects.toMatchObject({
      code: "no_subscription",
    });
  });

  it("says when Dodo refuses a checkout because the customer already has a subscription", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    dodo.failNext("POST /checkouts", 422, 1, "CUSTOMER_HAS_EXISTING_SUBSCRIPTION");
    await expect(createCheckoutUrl(await createUser(), "pro", "month")).rejects.toMatchObject({
      code: "refused",
      details: { operation: "checkout", reason: "has_subscription" },
    });
  });

  it("never logs the customer's email when checkout fails", async () => {
    useDodo();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await createUser({ email: "secret.person@example.com" });
    dodo.failNext(
      "POST /checkouts",
      422,
      1,
      "INVALID_REQUEST_PARAMETERS",
      "email secret.person@example.com is invalid",
    );
    await expect(createCheckoutUrl(user, "pro", "month")).rejects.toMatchObject({
      code: "refused",
      details: {
        operation: "checkout",
        providerStatus: 422,
        providerCode: "invalid_request_parameters",
      },
    });
    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.provider_failed");
    expect(output).not.toContain("secret.person");
  });
});

describe("cancelSubscriptionForDeletion", () => {
  const subscriber = (overrides: Partial<typeof users.$inferInsert> = {}) =>
    createUser({
      plan: "pro",
      planInterval: "month",
      planStatus: "active",
      billingCustomerId: cus(1),
      billingSubscriptionId: sub(1),
      ...overrides,
    });

  it("cancels the stored subscription right away and every other live one for the person, on hold and pending too", async () => {
    useDodo(MAX);
    const user = await subscriber({ email: "ada@example.com" });
    dodo.customers.push({ id: cus(2), email: "ada@example.com" });
    dodo.subscriptions.push(
      { id: sub(1), customer: cus(1), product: PRO_MONTH, status: "active" },
      { id: sub(2), customer: cus(2), product: PRO_TRIAL, status: "active", trial: true },
      { id: sub(3), customer: cus(2), product: PRO_MONTH, status: "on_hold" },
      { id: sub(4), customer: cus(2), product: MAX_MONTH, status: "pending" },
      { id: sub(5), customer: cus(2), product: PRO_MONTH, status: "cancelled" },
      { id: sub(6), customer: cus(2), product: EBOOK, status: "active" },
    );
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(dodo.callsTo("PATCH /subscriptions").map((call) => [call.path, call.body])).toEqual([
      [`/subscriptions/${sub(1)}`, CANCEL_NOW],
      [`/subscriptions/${sub(2)}`, CANCEL_NOW],
      [`/subscriptions/${sub(3)}`, CANCEL_NOW],
      [`/subscriptions/${sub(4)}`, CANCEL_NOW],
    ]);
    expect(
      dodo
        .callsTo("GET /subscriptions")
        .map((call) => call.query.get("customer_id"))
        .sort(),
    ).toEqual([cus(1), cus(2)]);
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: "canceled",
      trialEndsAt: null,
    });
  });

  it("cancels a subscription on hold: the user is on Free, but Dodo could still charge it", async () => {
    useDodo();
    const user = await subscriber({ plan: "free", planInterval: null, planStatus: "on_hold" });
    expect(chargeableSubscriptionId((await reload(user.id))!)).toBe(sub(1));
    dodo.subscriptions.push({
      id: sub(1),
      customer: cus(1),
      product: PRO_MONTH,
      status: "on_hold",
    });
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(dodo.callsTo(`PATCH /subscriptions/${sub(1)}`)[0]?.body).toEqual(CANCEL_NOW);
  });

  it("only looks up the email for someone who never subscribed", async () => {
    useDodo();
    expect(await cancelSubscriptionForDeletion(await createUser())).toBe("none");
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["GET /customers"]);
  });

  it("cancels a paid checkout whose webhook hasn't arrived, active or still pending, with nothing stored", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    useDodo();
    const user = await createUser({ email: "ada@example.com" });
    dodo.customers.push(
      { id: cus("ada"), email: "ada@example.com" },
      { id: cus("near"), email: "ada@example.com.au" },
    );
    dodo.subscriptions.push(
      { id: sub("paid"), customer: cus("ada"), product: PRO_MONTH, status: "active" },
      { id: sub("trial"), customer: cus("ada"), product: PRO_TRIAL, status: "pending" },
      { id: sub("near"), customer: cus("near"), product: PRO_MONTH, status: "active" },
    );
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(
      dodo
        .callsTo("PATCH /subscriptions")
        .map((call) => [call.path, call.body])
        .sort(),
    ).toEqual([
      [`/subscriptions/${sub("paid")}`, CANCEL_NOW],
      [`/subscriptions/${sub("trial")}`, CANCEL_NOW],
    ]);
    expect(dodo.subscriptions.find((found) => found.id === sub("near"))?.status).toBe("active");
  });

  it("still deletes, with nothing stored, when Dodo can't be asked about the email", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    dodo.failNext("GET /customers", 500, 10);
    expect(await cancelSubscriptionForDeletion(await createUser())).toBe("none");
    expect(writes()).toEqual([]);
    expect(JSON.stringify(errors.mock.calls)).toContain("billing.lookup_failed");
  });

  it("never sends Paddle-shaped ids, but still cancels a Dodo subscription under the same email", async () => {
    useDodo();
    const user = await subscriber({ email: "ada@example.com", ...PADDLE });
    expect(await cancelSubscriptionForDeletion(user)).toBe("none");
    expect(dodo.calls.map((call) => `${call.method} ${call.path}`)).toEqual(["GET /customers"]);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", ...PADDLE });

    // Paid through Dodo, but the webhook that stores the new ids hasn't arrived yet.
    dodo.customers.push({ id: cus("ada"), email: "ada@example.com" });
    dodo.subscriptions.push({
      id: sub("ada"),
      customer: cus("ada"),
      product: PRO_MONTH,
      status: "active",
    });
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(dodo.callsTo(`PATCH /subscriptions/${sub("ada")}`)[0]?.body).toEqual(CANCEL_NOW);
    expect(sentAnywhere(PADDLE.billingCustomerId)).toBe(false);
    expect(sentAnywhere(PADDLE.billingSubscriptionId)).toBe(false);
  });

  it("treats a refused cancel as done when Dodo says it already ended", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    const user = await subscriber();
    dodo.subscriptions.push({
      id: sub(1),
      customer: cus(1),
      product: PRO_MONTH,
      status: "cancelled",
    });
    expect(await cancelSubscriptionForDeletion(user)).toBe("already_ended");
    expect(dodo.callsTo(`GET /subscriptions/${sub(1)}`)).toHaveLength(1);
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled" });
  });

  it("treats a refused cancel as done when the person already cancelled in the portal", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    const user = await subscriber({ planStatus: "scheduled_cancel" });
    dodo.subscriptions.push({
      id: sub(1),
      customer: cus(1),
      product: PRO_MONTH,
      status: "active",
      cancelAtNextBillingDate: true,
    });
    dodo.failNext(`PATCH /subscriptions/${sub(1)}`, 409, 1, "SUBSCRIPTION_CANCELLATION_SCHEDULED");
    expect(await cancelSubscriptionForDeletion(user)).toBe("already_ended");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled" });
  });

  it("fails, keeping the account, when Dodo refuses to cancel a live one, can't find it, or can't be reached", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    const user = await subscriber();
    dodo.subscriptions.push({ id: sub(1), customer: cus(1), product: PRO_MONTH, status: "active" });
    const route = `PATCH /subscriptions/${sub(1)}`;
    dodo.failNext(route, 422, 1, "INVALID_REQUEST_PARAMETERS");
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({
      code: "provider_error",
    });
    dodo.failNext(route, 503);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({
      code: "provider_error",
    });
    expect(dodo.callsTo(route)).toHaveLength(2);
    expect((await reload(user.id))?.plan).toBe("pro");

    // Test and live ids look alike: a 404 must never pass for "already ended".
    const missing = await subscriber({
      email: "gone@example.com",
      billingCustomerId: cus("gone"),
      billingSubscriptionId: sub("gone"),
    });
    await expect(cancelSubscriptionForDeletion(missing)).rejects.toMatchObject({ code: "refused" });
    expect((await reload(missing.id))?.plan).toBe("pro");
    expect(JSON.stringify(errors.mock.calls)).toContain("billing.cancel_not_found");
  });

  it("cancels the stored subscription even when Dodo can't list the others", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    useDodo();
    const user = await subscriber();
    dodo.subscriptions.push({ id: sub(1), customer: cus(1), product: PRO_MONTH, status: "active" });
    dodo.failNext("GET /subscriptions", 500, 10);
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(dodo.callsTo(`PATCH /subscriptions/${sub(1)}`)).toHaveLength(1);
  });

  it("refuses in production without an API key while a Dodo subscription could still charge", async () => {
    useDodo({ NODE_ENV: "production", DODO_API_KEY: undefined });
    const user = await subscriber();
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active" });
    expect(dodo.calls).toEqual([]);
  });

  it("goes ahead in production without an API key when nothing at Dodo can charge", async () => {
    useDodo({ NODE_ENV: "production", DODO_API_KEY: undefined });
    expect(await cancelSubscriptionForDeletion(await subscriber({ planStatus: "canceled" }))).toBe(
      "none",
    );
    expect(await cancelSubscriptionForDeletion(await subscriber(PADDLE))).toBe("none");
    expect(await cancelSubscriptionForDeletion(await createUser())).toBe("none");
    expect(dodo.calls).toEqual([]);
  });

  it("downgrades locally in mock mode", async () => {
    const user = await subscriber({
      planStatus: "mock_trialing",
      billingCustomerId: null,
      billingSubscriptionId: null,
    });
    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "mock_cancelled" });
  });

  it("never logs the customer's email", async () => {
    useDodo();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await subscriber();
    dodo.subscriptions.push({ id: sub(1), customer: cus(1), product: PRO_MONTH, status: "active" });
    dodo.failNext(`PATCH /subscriptions/${sub(1)}`, 502);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({
      code: "provider_error",
    });
    await cancelSubscriptionForDeletion(user);
    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.subscription_cancelled");
    expect(output).not.toContain(user.email);
  });
});
