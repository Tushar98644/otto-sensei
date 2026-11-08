import { APIConnectionTimeoutError, APIError, type DodoPayments } from "dodopayments";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users, type UserRow } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/types";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { toSessionUser } from "@/lib/users";
import {
  BillingError,
  billingMode,
  cancelSubscriptionForDeletion,
  createCheckoutUrl,
  createPortalUrl,
} from "./index";

// Only the fields the code under test reads.
type SubscriptionStub = Pick<DodoPayments.Subscription, "subscription_id" | "status">;
type CustomerStub = Pick<DodoPayments.Customer, "customer_id" | "email">;
type ListedSubscription = Pick<DodoPayments.SubscriptionListResponse, "subscription_id" | "status" | "product_id"> & {
  customer: Pick<DodoPayments.CustomerLimitedDetails, "customer_id">;
};

// The real API is never called: the client is swapped for one whose methods are spies.
const sdk = vi.hoisted(() => ({
  checkoutCreate:
    vi.fn<(params: DodoPayments.CheckoutSessionCreateParams) => Promise<DodoPayments.CheckoutSessionResponse>>(),
  portalCreate:
    vi.fn<(customerId: string, params?: { return_url?: string }) => Promise<DodoPayments.CustomerPortalSession>>(),
  subscriptionUpdate:
    vi.fn<(id: string, params: DodoPayments.SubscriptionUpdateParams) => Promise<SubscriptionStub>>(),
  subscriptionRetrieve: vi.fn<(id: string) => Promise<SubscriptionStub>>(),
  customersList: vi.fn<(params: DodoPayments.CustomerListParams) => Promise<{ items: CustomerStub[] }>>(),
  subscriptionsList:
    vi.fn<(params: DodoPayments.SubscriptionListParams) => Promise<{ items: ListedSubscription[] }>>(),
  changePlan: vi.fn<(id: string, params: DodoPayments.SubscriptionChangePlanParams) => Promise<unknown>>(),
  options: [] as unknown[],
}));

vi.mock("dodopayments", async (importOriginal) => {
  const actual = await importOriginal<typeof import("dodopayments")>();
  class FakeDodoPayments {
    checkoutSessions = { create: sdk.checkoutCreate };
    customers = { customerPortal: { create: sdk.portalCreate }, list: sdk.customersList };
    subscriptions = {
      update: sdk.subscriptionUpdate,
      retrieve: sdk.subscriptionRetrieve,
      list: sdk.subscriptionsList,
      changePlan: sdk.changePlan,
    };

    constructor(options: unknown) {
      sdk.options.push(options);
    }
  }
  return { ...actual, DodoPayments: FakeDodoPayments };
});

const APP_URL = "https://otto.example";
const DODO_KEYS = {
  DODO_PAYMENTS_API_KEY: "sk_test_123",
  DODO_PAYMENTS_PRODUCT_ID: "pdt_otto_pro",
  DODO_PAYMENTS_WEBHOOK_KEY: `whsec_${Buffer.from("otto-test-key").toString("base64")}`,
} as const;

let sequence = 0;

async function createUser(overrides: Partial<UserRow> = {}): Promise<SessionUser> {
  sequence += 1;
  const row: UserRow = {
    id: crypto.randomUUID(),
    email: `person${sequence}@example.com`,
    plan: "free",
    planStatus: null,
    planRenewsAt: null,
    planInterval: null,
    billingCustomerId: null,
    billingSubscriptionId: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
  await insertUserRow(row);
  return toSessionUser(row);
}

async function reload(id: string): Promise<UserRow | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

function useEnv(values: Record<string, string | undefined>) {
  for (const [name, value] of Object.entries(values)) vi.stubEnv(name, value);
  resetEnvForTests();
}

const useDodo = () => useEnv({ ...DODO_KEYS, DODO_PAYMENTS_ENVIRONMENT: "test_mode" });

function listed(
  subscriptionId: string,
  status: DodoPayments.SubscriptionStatus,
  customerId = "cus_1",
  productId: string = DODO_KEYS.DODO_PAYMENTS_PRODUCT_ID,
): ListedSubscription {
  return { subscription_id: subscriptionId, status, product_id: productId, customer: { customer_id: customerId } };
}

// What Dodo lists for each customer id.
function dodoHas(byCustomer: Record<string, ListedSubscription[]>, customers: CustomerStub[] = []) {
  sdk.customersList.mockResolvedValue({ items: customers });
  sdk.subscriptionsList.mockImplementation(async ({ customer_id }) => ({
    items: (customer_id && byCustomer[customer_id]) || [],
  }));
}

beforeEach(async () => {
  useEnv({
    NEXT_PUBLIC_APP_URL: APP_URL,
    DODO_PAYMENTS_API_KEY: undefined,
    DODO_PAYMENTS_PRODUCT_ID: undefined,
    DODO_PAYMENTS_WEBHOOK_KEY: undefined,
    DODO_PAYMENTS_ENVIRONMENT: undefined,
  });
  sdk.checkoutCreate.mockReset();
  sdk.portalCreate.mockReset();
  sdk.subscriptionUpdate.mockReset();
  sdk.subscriptionRetrieve.mockReset();
  // Dodo knows nothing beyond what the stored ids say, unless a test says otherwise.
  sdk.customersList.mockReset().mockResolvedValue({ items: [] });
  sdk.subscriptionsList.mockReset().mockResolvedValue({ items: [] });
  sdk.options.length = 0;
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("billingMode", () => {
  it("is mock in development without keys", () => {
    expect(billingMode()).toBe("mock");
  });

  it("is dodo once all three keys are set", () => {
    useDodo();
    expect(billingMode()).toBe("dodo");
  });

  it("is disabled in production unless every key is set", () => {
    useEnv({ NODE_ENV: "production" });
    expect(billingMode()).toBe("disabled");
    useEnv({ DODO_PAYMENTS_API_KEY: DODO_KEYS.DODO_PAYMENTS_API_KEY });
    expect(billingMode()).toBe("disabled");
  });
});

describe("mock mode", () => {
  it("checkout upgrades the user on the spot", async () => {
    const user = await createUser();

    expect(await createCheckoutUrl(user)).toBe("/account?checkout=success&plan=pro");
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planInterval: "month",
      planStatus: "mock_active",
    });
  });

  it("checkout stores the billing interval picked, and a plan change replaces it", async () => {
    const user = await createUser();
    await createCheckoutUrl(user, "pro", "week");
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planInterval: "week", planRenewsAt: null });

    await createCheckoutUrl({ ...user, plan: "pro", planInterval: "week" }, "max", "year");
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "year" });
  });

  it("portal downgrades a subscribed user", async () => {
    const user = await createUser();
    await createCheckoutUrl(user, "pro", "week");

    expect(await createPortalUrl({ ...user, plan: "pro" })).toBe("/account?portal=mock");
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planInterval: null,
      planStatus: "mock_cancelled",
    });
  });

  it("portal refuses users who never subscribed", async () => {
    const user = await createUser();
    await expect(createPortalUrl(user)).rejects.toMatchObject({ code: "no_subscription" });
    expect((await reload(user.id))?.planStatus).toBeNull();
  });

  it("checkout refuses users who are already on Pro", async () => {
    const user = await createUser({ plan: "pro", planStatus: "mock_active" });
    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "already_subscribed" });
  });
});

describe("disabled mode", () => {
  it("throws unavailable for checkout and portal", async () => {
    useEnv({ NODE_ENV: "production" });
    const user = await createUser({ billingCustomerId: "cus_1" });

    await expect(createCheckoutUrl(user)).rejects.toBeInstanceOf(BillingError);
    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "unavailable" });
    await expect(createPortalUrl(user)).rejects.toMatchObject({ code: "unavailable" });
    expect((await reload(user.id))?.plan).toBe("free");
  });
});

describe("dodo mode", () => {
  it("creates a checkout session tied to the user", async () => {
    useDodo();
    const user = await createUser();
    sdk.checkoutCreate.mockResolvedValue({
      session_id: "cks_1",
      checkout_url: "https://test.checkout.dodopayments.com/session/cks_1",
    });

    expect(await createCheckoutUrl(user)).toBe("https://test.checkout.dodopayments.com/session/cks_1");
    expect(sdk.checkoutCreate).toHaveBeenCalledWith({
      product_cart: [{ product_id: DODO_KEYS.DODO_PAYMENTS_PRODUCT_ID, quantity: 1 }],
      customer: { email: user.email },
      metadata: { user_id: user.id },
      feature_flags: { allow_customer_editing_email: false },
      customization: { theme: "light" },
      return_url: `${APP_URL}/account?checkout=success&plan=pro`,
      cancel_url: `${APP_URL}/account?checkout=cancelled`,
    });
    expect(sdk.options[0]).toMatchObject({
      bearerToken: DODO_KEYS.DODO_PAYMENTS_API_KEY,
      environment: "test_mode",
      baseURL: null,
    });
  });

  it("uses the live API when DODO_PAYMENTS_ENVIRONMENT says so", async () => {
    useDodo();
    useEnv({ DODO_PAYMENTS_ENVIRONMENT: "live_mode" });
    sdk.checkoutCreate.mockResolvedValue({ session_id: "cks_2", checkout_url: "https://checkout.example/2" });

    await createCheckoutUrl(await createUser());
    expect(sdk.options[0]).toMatchObject({ environment: "live_mode" });
  });

  it("checks out the yearly or weekly product when it's set", async () => {
    useDodo();
    useEnv({ DODO_PAYMENTS_PRODUCT_ID_YEARLY: "pdt_otto_pro_yearly" });
    const user = await createUser();
    sdk.checkoutCreate.mockResolvedValue({ session_id: "cks_y", checkout_url: "https://checkout.example/y" });

    expect(await createCheckoutUrl(user, "pro", "year")).toBe("https://checkout.example/y");
    expect(sdk.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ product_cart: [{ product_id: "pdt_otto_pro_yearly", quantity: 1 }] }),
    );
    await expect(createCheckoutUrl(user, "pro", "week")).rejects.toMatchObject({ code: "unavailable" });
    expect(sdk.checkoutCreate).toHaveBeenCalledTimes(1);
  });

  it("checks out Max only once its product is set", async () => {
    useDodo();
    const user = await createUser();
    await expect(createCheckoutUrl(user, "max", "month")).rejects.toMatchObject({ code: "unavailable" });
    useEnv({ DODO_PAYMENTS_MAX_PRODUCT_ID: "pdt_otto_max" });
    sdk.checkoutCreate.mockResolvedValue({ session_id: "cks_m", checkout_url: "https://checkout.example/m" });
    dodoHas({});
    expect(await createCheckoutUrl(user, "max", "month")).toBe("https://checkout.example/m");
    expect(sdk.checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        product_cart: [{ product_id: "pdt_otto_max", quantity: 1 }],
        return_url: `${APP_URL}/account?checkout=success&plan=max`,
      }),
    );
  });

  it("moves a Pro subscription to Max in place instead of a second checkout", async () => {
    useDodo();
    useEnv({ DODO_PAYMENTS_MAX_PRODUCT_ID: "pdt_otto_max" });
    const user = await createUser({
      plan: "pro",
      planStatus: "active",
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_pro",
    });
    dodoHas({ cus_1: [listed("sub_pro", "active", "cus_1")] });
    sdk.changePlan.mockResolvedValue({});

    expect(await createCheckoutUrl(user, "max", "month")).toBe("/account?checkout=success&plan=max");
    expect(sdk.changePlan).toHaveBeenCalledWith("sub_pro", {
      product_id: "pdt_otto_max",
      quantity: 1,
      proration_billing_mode: "prorated_immediately",
    });
    expect(sdk.checkoutCreate).not.toHaveBeenCalled();
    await expect(createCheckoutUrl({ ...user, plan: "max" }, "max", "month")).rejects.toMatchObject({
      code: "already_subscribed",
    });
  });

  it("switches the plan at once in test mode", async () => {
    const user = await createUser();
    expect(await createCheckoutUrl(user, "pro", "month")).toBe("/account?checkout=success&plan=pro");
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("counts a live yearly subscription as one already paid for", async () => {
    useDodo();
    useEnv({ DODO_PAYMENTS_PRODUCT_ID_YEARLY: "pdt_otto_pro_yearly" });
    const user = await createUser({ billingCustomerId: "cus_1" });
    dodoHas({ cus_1: [listed("sub_y", "active", "cus_1", "pdt_otto_pro_yearly")] });
    sdk.portalCreate.mockResolvedValue({ link: "https://customer.dodopayments.com/portal/y" });

    expect(await createCheckoutUrl(user, "pro", "month")).toBe("https://customer.dodopayments.com/portal/y");
    expect(sdk.checkoutCreate).not.toHaveBeenCalled();
  });

  it("reports a provider error when Dodo times out or returns no URL", async () => {
    useDodo();
    const user = await createUser();

    sdk.checkoutCreate.mockRejectedValueOnce(new APIConnectionTimeoutError());
    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "provider_error" });

    sdk.checkoutCreate.mockResolvedValueOnce({ session_id: "cks_3", checkout_url: null });
    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "provider_error" });
  });

  it("never opens a second checkout for a Pro user", async () => {
    useDodo();
    const user = await createUser({ plan: "pro", billingSubscriptionId: "sub_1" });

    await expect(createCheckoutUrl(user)).rejects.toMatchObject({ code: "already_subscribed" });
    expect(sdk.checkoutCreate).not.toHaveBeenCalled();
  });

  it("sends someone whose renewal is on hold to manage it instead of buying again", async () => {
    useDodo();
    const user = await createUser({
      plan: "free",
      planStatus: "on_hold",
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_1",
    });
    dodoHas({ cus_1: [listed("sub_1", "on_hold")] });
    sdk.portalCreate.mockResolvedValue({ link: "https://customer.dodopayments.com/portal/hold" });

    expect(await createCheckoutUrl(user)).toBe("https://customer.dodopayments.com/portal/hold");
    expect(sdk.portalCreate).toHaveBeenCalledWith("cus_1", { return_url: `${APP_URL}/account` });
    expect(sdk.checkoutCreate).not.toHaveBeenCalled();
  });

  it("finds a payment whose webhook hasn't landed yet, by email", async () => {
    useDodo();
    const user = await createUser();
    dodoHas({ cus_9: [listed("sub_9", "active", "cus_9")] }, [{ customer_id: "cus_9", email: user.email.toUpperCase() }]);
    sdk.portalCreate.mockResolvedValue({ link: "https://customer.dodopayments.com/portal/paid" });

    expect(await createCheckoutUrl(user)).toBe("https://customer.dodopayments.com/portal/paid");
    expect(sdk.customersList).toHaveBeenCalledWith(expect.objectContaining({ email: user.email }));
    expect(sdk.portalCreate).toHaveBeenCalledWith("cus_9", expect.anything());
    expect(sdk.checkoutCreate).not.toHaveBeenCalled();
  });

  it("still opens checkout past pending, ended, other-product and other people's subscriptions", async () => {
    useDodo();
    const user = await createUser({ planStatus: "cancelled", billingCustomerId: "cus_1", billingSubscriptionId: "sub_old" });
    dodoHas(
      {
        cus_1: [listed("sub_old", "cancelled"), listed("sub_open", "pending"), listed("sub_x", "active", "cus_1", "pdt_other")],
        cus_near: [listed("sub_near", "active", "cus_near")],
      },
      [{ customer_id: "cus_near", email: `x${user.email}` }],
    );
    sdk.checkoutCreate.mockResolvedValue({ session_id: "cks_4", checkout_url: "https://checkout.example/4" });

    expect(await createCheckoutUrl(user)).toBe("https://checkout.example/4");
    expect(sdk.portalCreate).not.toHaveBeenCalled();
    expect(sdk.subscriptionsList).not.toHaveBeenCalledWith(expect.objectContaining({ customer_id: "cus_near" }));
  });

  it("falls back to the stored subscription when Dodo can't list them", async () => {
    useDodo();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    sdk.customersList.mockRejectedValue(new APIConnectionTimeoutError());
    const onHold = await createUser({ planStatus: "on_hold", billingCustomerId: "cus_1", billingSubscriptionId: "sub_1" });
    sdk.portalCreate.mockResolvedValue({ link: "https://customer.dodopayments.com/portal/fallback" });
    expect(await createCheckoutUrl(onHold)).toBe("https://customer.dodopayments.com/portal/fallback");

    const fresh = await createUser();
    sdk.checkoutCreate.mockResolvedValue({ session_id: "cks_5", checkout_url: "https://checkout.example/5" });
    expect(await createCheckoutUrl(fresh)).toBe("https://checkout.example/5");
  });

  it("opens the customer portal for the stored customer", async () => {
    useDodo();
    const user = await createUser({ plan: "pro", billingCustomerId: "cus_42" });
    sdk.portalCreate.mockResolvedValue({ link: "https://customer.dodopayments.com/portal/abc" });

    expect(await createPortalUrl(user)).toBe("https://customer.dodopayments.com/portal/abc");
    expect(sdk.portalCreate).toHaveBeenCalledWith("cus_42", { return_url: `${APP_URL}/account` });
  });

  it("has no portal for users who never subscribed", async () => {
    useDodo();
    const user = await createUser();

    await expect(createPortalUrl(user)).rejects.toMatchObject({ code: "no_subscription" });
    expect(sdk.portalCreate).not.toHaveBeenCalled();
  });
});

describe("cancelSubscriptionForDeletion", () => {
  const subscriber = (overrides: Partial<UserRow> = {}) =>
    createUser({
      plan: "pro",
      planStatus: "active",
      planRenewsAt: Date.UTC(2026, 11, 6),
      billingCustomerId: "cus_1",
      billingSubscriptionId: "sub_1",
      ...overrides,
    });

  const refused = (status: number) =>
    APIError.generate(status, { code: "INVALID_REQUEST" }, "already cancelled", new Headers());

  it("cancels an active subscription right away in dodo mode", async () => {
    useDodo();
    const user = await subscriber();
    sdk.subscriptionUpdate.mockResolvedValue({ subscription_id: "sub_1", status: "cancelled" });

    expect(await cancelSubscriptionForDeletion(user, 5)).toBe("cancelled");
    expect(sdk.subscriptionUpdate).toHaveBeenCalledTimes(1);
    const [id, params] = sdk.subscriptionUpdate.mock.calls[0] ?? [];
    expect(id).toBe("sub_1");
    expect(params).toMatchObject({ status: "cancelled", cancel_reason: "cancelled_by_customer" });
    // Scheduling it for the period end would leave the deleted user with one more charge.
    expect(params?.cancel_at_next_billing_date).toBeUndefined();
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: "cancelled",
      planRenewsAt: null,
      billingSubscriptionId: "sub_1",
      updatedAt: 5,
    });
  });

  it.each(["past_due", "on_hold", "paused"])("also cancels a %s subscription", async (status) => {
    useDodo();
    const user = await subscriber({ plan: status === "past_due" ? "pro" : "free", planStatus: status });
    sdk.subscriptionUpdate.mockResolvedValue({ subscription_id: "sub_1", status: "cancelled" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(sdk.subscriptionUpdate).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it.each(["cancelled", "expired", "failed"])("leaves a %s subscription alone", async (status) => {
    useDodo();
    const user = await subscriber({ plan: "free", planStatus: status, planRenewsAt: null });

    expect(await cancelSubscriptionForDeletion(user)).toBe("none");
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("does nothing for a user who never subscribed", async () => {
    useDodo();
    const user = await createUser();

    expect(await cancelSubscriptionForDeletion(user)).toBe("none");
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
    // Their deletion doesn't wait on Dodo at all.
    expect(sdk.customersList).not.toHaveBeenCalled();
  });

  it("does nothing for an account that is already gone", async () => {
    useDodo();
    const ghost: SessionUser = {
      id: crypto.randomUUID(),
      email: "gone@example.com",
      plan: "pro",
      planInterval: "month",
      planRenewsAt: null,
    };

    expect(await cancelSubscriptionForDeletion(ghost)).toBe("none");
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("treats a refused cancel as done when Dodo says the subscription already ended", async () => {
    useDodo();
    const user = await subscriber();
    sdk.subscriptionUpdate.mockRejectedValue(refused(422));
    sdk.subscriptionRetrieve.mockResolvedValue({ subscription_id: "sub_1", status: "cancelled" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("already_ended");
    expect(sdk.subscriptionRetrieve).toHaveBeenCalledWith("sub_1");
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("fails when Dodo refuses to cancel a subscription that is still live", async () => {
    useDodo();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await subscriber();
    sdk.subscriptionUpdate.mockRejectedValue(refused(409));
    sdk.subscriptionRetrieve.mockResolvedValue({ subscription_id: "sub_1", status: "active" });

    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active" });
  });

  it("fails without touching the account when Dodo can't be reached", async () => {
    useDodo();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await subscriber();
    sdk.subscriptionUpdate.mockRejectedValue(new APIConnectionTimeoutError());

    await expect(cancelSubscriptionForDeletion(user)).rejects.toBeInstanceOf(BillingError);
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    expect(sdk.subscriptionRetrieve).not.toHaveBeenCalled();
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active" });
  });

  it("fails on a server error instead of guessing", async () => {
    useDodo();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await subscriber();
    sdk.subscriptionUpdate.mockRejectedValue(refused(500));

    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    expect(sdk.subscriptionRetrieve).not.toHaveBeenCalled();
  });

  it("still cancels while checkout is switched off, as long as the API key is set", async () => {
    useEnv({ NODE_ENV: "production", DODO_PAYMENTS_API_KEY: DODO_KEYS.DODO_PAYMENTS_API_KEY });
    expect(billingMode()).toBe("disabled");
    const user = await subscriber();
    sdk.subscriptionUpdate.mockResolvedValue({ subscription_id: "sub_1", status: "cancelled" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(sdk.subscriptionUpdate).toHaveBeenCalledTimes(1);
  });

  it("warns and carries on when there is no API key to cancel with", async () => {
    useEnv({ NODE_ENV: "production" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await subscriber();

    expect(await cancelSubscriptionForDeletion(user)).toBe("not_configured");
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).toContain("billing.cancel_skipped");
  });

  // Only one subscription fits in the row, so a second checkout's webhook replaces the first.
  // Cancelling just the stored one would leave the other charging a deleted account.
  it("cancels every live Pro subscription the person has, not just the stored one", async () => {
    useDodo();
    const user = await subscriber({ billingSubscriptionId: "sub_2" });
    dodoHas(
      {
        cus_1: [
          listed("sub_1", "active"),
          listed("sub_2", "active"),
          listed("sub_3", "cancelled"),
          listed("sub_4", "active", "cus_1", "pdt_other"),
        ],
        cus_2: [listed("sub_5", "on_hold", "cus_2"), listed("sub_6", "pending", "cus_2")],
      },
      [{ customer_id: "cus_2", email: user.email }],
    );
    sdk.subscriptionUpdate.mockImplementation(async (id) => ({ subscription_id: id, status: "cancelled" }));

    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(sdk.subscriptionUpdate.mock.calls.map(([id]) => id).sort()).toEqual(["sub_1", "sub_2", "sub_5"]);
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "cancelled" });
  });

  it("cancels a new payment whose webhook hasn't landed yet", async () => {
    useDodo();
    const user = await createUser({ planStatus: "cancelled", billingCustomerId: "cus_1", billingSubscriptionId: "sub_old" });
    dodoHas({ cus_9: [listed("sub_9", "active", "cus_9")] }, [{ customer_id: "cus_9", email: user.email }]);
    sdk.subscriptionUpdate.mockResolvedValue({ subscription_id: "sub_9", status: "cancelled" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(sdk.subscriptionUpdate).toHaveBeenCalledWith("sub_9", expect.objectContaining({ status: "cancelled" }));
  });

  it("still cancels the stored subscription when Dodo can't list the others", async () => {
    useDodo();
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await subscriber();
    sdk.customersList.mockRejectedValue(new APIConnectionTimeoutError());
    sdk.subscriptionUpdate.mockResolvedValue({ subscription_id: "sub_1", status: "cancelled" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(sdk.subscriptionUpdate).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.lookup_failed");
  });

  it("keeps the account when one of several cancels fails", async () => {
    useDodo();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await subscriber();
    dodoHas({ cus_1: [listed("sub_1", "active"), listed("sub_0", "active")] });
    sdk.subscriptionUpdate.mockImplementation(async (id) => {
      if (id === "sub_0") throw new APIConnectionTimeoutError();
      return { subscription_id: id, status: "cancelled" };
    });

    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
  });

  it("downgrades locally in mock mode", async () => {
    const user = await createUser({ plan: "pro", planStatus: "mock_active" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("cancelled");
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "mock_cancelled" });
    expect(sdk.subscriptionUpdate).not.toHaveBeenCalled();
  });

  it("does nothing in mock mode for a free user", async () => {
    const user = await createUser({ planStatus: "mock_cancelled" });

    expect(await cancelSubscriptionForDeletion(user)).toBe("none");
    expect((await reload(user.id))?.planStatus).toBe("mock_cancelled");
  });

  it("never logs the customer's email", async () => {
    useDodo();
    const sinks = (["info", "warn", "error"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    const user = await subscriber();
    sdk.subscriptionUpdate.mockRejectedValueOnce(
      APIError.generate(502, { message: `upstream error for ${user.email}` }, user.email, new Headers()),
    );
    await expect(cancelSubscriptionForDeletion(user)).rejects.toMatchObject({ code: "provider_error" });
    sdk.subscriptionUpdate.mockResolvedValueOnce({ subscription_id: "sub_1", status: "cancelled" });
    await cancelSubscriptionForDeletion(user);

    const output = JSON.stringify(sinks.flatMap((sink) => sink.mock.calls));
    expect(output).toContain("billing.subscription_cancelled");
    expect(output).not.toContain(user.email);
  });
});
