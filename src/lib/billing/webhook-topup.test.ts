import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { billingLog, users } from "@/db/schema";
import { captureServerEvent } from "@/lib/analytics/server";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { signBillingId } from "./billing-sign";
import { attachCheckoutSession, startTopup } from "./credit";
import {
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_IDS,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  disputeEvent,
  paymentEvent,
  refundEvent,
  standardWebhookHeaders,
  type PaymentFields,
} from "./dodo-webhook-testing";
import { processWebhook, type WebhookConfig } from "./webhook";

vi.mock("@/lib/analytics/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/server")>()),
  captureServerEvent: vi.fn(),
}));

const TOPUP = "pdt_TestTopupCredit000001";
const PAY = DODO_TEST_IDS.payment;
const SESSION = "cks_TestCheckout00000001";
const CONFIG: WebhookConfig = {
  secret: DODO_WEBHOOK_TEST_SECRET,
  signingSecret: BILLING_TEST_SIGNING_SECRET,
  productIds: [DODO_TEST_PRODUCTS.proMonth],
  planForProduct: (id) =>
    id === DODO_TEST_PRODUCTS.proMonth ? { plan: "pro", interval: "month" } : null,
  trialProductId: DODO_TEST_PRODUCTS.proTrial,
  topupProductId: TOPUP,
};

const APPLIED = { status: 200, message: "applied" };
const IGNORED = { status: 200, message: "ignored" };
const DUPLICATE = { status: 200, message: "duplicate" };

function deliver(body: string, config: WebhookConfig = CONFIG) {
  return processWebhook(body, standardWebhookHeaders(body, DODO_WEBHOOK_TEST_SECRET), config);
}

// Odd values for the fields only top-ups read; any other payment must not notice them.
const ODD_TOPUP_FIELDS = {
  product_cart: "not a cart",
  total_amount: "lots",
  tax: { amount: 1 },
  currency: 12345,
  checkout_session_id: "x".repeat(500),
};

async function buyer(): Promise<string> {
  const id = crypto.randomUUID();
  await insertUserRow({
    id,
    email: `${id}@example.com`,
    plan: "pro",
    planInterval: "month",
    planStatus: "active",
    billingCustomerId: DODO_TEST_IDS.customer,
    createdAt: 1,
    updatedAt: 1,
  });
  return id;
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

// What our checkout makes: a pending record, then a one-time payment of the $1 product times the dollars.
async function checkout(userId: string, usd: number) {
  const started = await startTopup(userId, usd * 100, Date.now());
  if (!started.ok) throw new Error("no room");
  const topupId = started.id;
  await attachCheckoutSession(topupId, SESSION);
  const payment = (fields: PaymentFields = {}, metadata: Record<string, unknown> = {}) =>
    paymentEvent("payment.succeeded", {
      subscription_id: null,
      charge_type: null,
      product_cart: [{ product_id: TOPUP, quantity: usd }],
      total_amount: usd * 100 + 88,
      tax: 88,
      currency: "USD",
      checkout_session_id: SESSION,
      ...fields,
      metadata: {
        user_id: userId,
        topup_id: topupId,
        topup_sig: signBillingId(topupId, BILLING_TEST_SIGNING_SECRET),
        topup_usd: String(usd),
        ...metadata,
      },
    });
  return { topupId, payment };
}

beforeEach(async () => {
  await resetDb();
  vi.mocked(captureServerEvent).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a top-up payment", () => {
  it("credits the pre-tax dollars once, however often Dodo delivers it", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    const body = payment();
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(1000);
    // A redelivery has a new webhook-id; the payment id still counts once.
    expect(await deliver(body)).toEqual(DUPLICATE);
    expect(await balanceOf(userId)).toBe(1000);
    expect(captureServerEvent).toHaveBeenCalledWith(userId, "credit_added", { usd: 10 });
    const [purchase] = await (
      await getDb()
    )
      .select({ ref: billingLog.ref, cents: billingLog.cents })
      .from(billingLog)
      .where(and(eq(billingLog.kind, "topup"), eq(billingLog.key, PAY)));
    expect(purchase).toEqual({ ref: "1088 USD", cents: 1000 });
  });

  it("credits nothing when the quantity, amount, account or signature don't match our record", async () => {
    const userId = await buyer();
    const other = await buyer();
    const { payment } = await checkout(userId, 10);
    const cases = [
      payment({ product_cart: [{ product_id: TOPUP, quantity: 50 }] }),
      payment({ total_amount: 1500, tax: 0 }),
      payment({ product_cart: [{ product_id: DODO_TEST_PRODUCTS.proMonth, quantity: 10 }] }),
      payment({}, { user_id: other }),
      payment({}, { topup_sig: "0".repeat(64) }),
      payment({}, { topup_id: crypto.randomUUID(), topup_sig: undefined }),
      payment({ checkout_session_id: "cks_SomeoneElses0000001" }),
    ];
    for (const body of cases) expect(await deliver(body)).toEqual(IGNORED);
    expect(await balanceOf(userId)).toBe(0);
    expect(await balanceOf(other)).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("billing.topup_mismatch"),
      expect.anything(),
    );
  });

  it("asks Dodo to retry when our record can't be read", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 5);
    const db = await getDb();
    const select = vi.spyOn(db, "select").mockImplementationOnce(() => {
      throw new Error("database down");
    });
    expect(await deliver(payment())).toEqual({ status: 500, message: "retry" });
    select.mockRestore();
    expect(await deliver(payment())).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(500);
  });

  it("leaves subscription payments to the plan path, with no credit", async () => {
    const userId = await buyer();
    const body = paymentEvent("payment.succeeded", {
      metadata: { user_id: userId, plan: "pro", interval: "month", trial: "false" },
    });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
    expect(captureServerEvent).toHaveBeenCalledWith(
      userId,
      "checkout_completed",
      { plan: "pro", trial: false, usd: 1 },
      { set: { plan: "pro" } },
    );
    const topups = await (
      await getDb()
    )
      .select()
      .from(billingLog)
      .where(eq(billingLog.kind, "topup"));
    expect(topups).toEqual([]);
  });
});

describe("a top-up refunded or disputed", () => {
  it("takes a refund's credit back once, clamped at zero, and logs it", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    await deliver(payment());
    await (await getDb()).update(users).set({ creditCents: 400 }).where(eq(users.id, userId));
    const refund = refundEvent("refund.succeeded", { amount: 1088, is_partial: false });
    const headers = standardWebhookHeaders(refund, DODO_WEBHOOK_TEST_SECRET);
    expect(await processWebhook(refund, headers, CONFIG)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
    expect(await processWebhook(refund, headers, CONFIG)).toEqual(DUPLICATE);
    // A redelivery under a new webhook-id is logged again, but the refund takes nothing twice.
    await (await getDb()).update(users).set({ creditCents: 250 }).where(eq(users.id, userId));
    expect(await deliver(refund)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(250);
    const backs = await (
      await getDb()
    )
      .select({ cents: billingLog.cents })
      .from(billingLog)
      .where(eq(billingLog.kind, "topup_back"));
    expect(backs).toEqual([{ cents: 1000 }]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("billing.topup_taken_back"),
      expect.objectContaining({ removedCents: 400 }),
    );
  });

  it("takes a partial refund's share of the credit", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    await deliver(payment());
    expect(
      await deliver(refundEvent("refund.succeeded", { amount: 544, is_partial: true })),
    ).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(500);
  });

  it("takes a lost dispute's credit back, but not an opened one's", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 20);
    await deliver(payment());
    expect(await deliver(disputeEvent("dispute.opened"))).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(2000);
    expect(await deliver(disputeEvent("dispute.lost"))).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
    // Accepted after lost is the same dispute: nothing more to take.
    expect(await deliver(disputeEvent("dispute.accepted"))).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
  });

  it("changes no balance for a refund of a subscription payment", async () => {
    const userId = await buyer();
    await (await getDb()).update(users).set({ creditCents: 700 }).where(eq(users.id, userId));
    expect(await deliver(refundEvent("refund.succeeded"))).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(700);
  });
});

describe("the review's cases", () => {
  it("credits a signed, recorded top-up even after the top-up product id is unset", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    const unset: WebhookConfig = { ...CONFIG, topupProductId: null };
    expect(await deliver(payment(), unset)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(1000);
  });

  it("refuses an odd top-up payload, logged and not credited", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    expect(await deliver(payment({ product_cart: [{ product_id: TOPUP, quantity: 0 }] }))).toEqual(
      IGNORED,
    );
    expect(await deliver(payment({ total_amount: "1088" }))).toEqual(IGNORED);
    expect(await balanceOf(userId)).toBe(0);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("billing.topup_mismatch"),
      expect.objectContaining({ errorMessage: "top-up not credited: malformed" }),
    );
  });

  it("lets a subscription payment with odd top-up fields through exactly as before", async () => {
    const userId = await buyer();
    const fields = {
      metadata: { user_id: userId, plan: "pro", interval: "month", trial: "false" },
    };
    expect(
      await deliver(paymentEvent("payment.succeeded", { ...fields, ...ODD_TOPUP_FIELDS })),
    ).toEqual(APPLIED);
    const failed = paymentEvent("payment.failed", {
      charge_type: "plan_change",
      ...ODD_TOPUP_FIELDS,
    });
    expect(await deliver(failed)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
  });

  it("asks Dodo to retry a refund that comes before its top-up's credit, then takes it back", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    const lookups: string[] = [];
    const config: WebhookConfig = {
      ...CONFIG,
      isTopupPayment: async (id) => {
        lookups.push(id);
        return id === PAY;
      },
    };
    const refund = refundEvent("refund.succeeded", { amount: 1088, is_partial: false });
    expect(await deliver(refund, config)).toEqual({ status: 500, message: "retry" });
    expect(lookups).toEqual([PAY]);
    expect(await deliver(payment(), config)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(1000);
    expect(await deliver(refund, config)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
  });

  it("answers a refund of a payment that isn't a top-up as before, after one lookup", async () => {
    const config: WebhookConfig = { ...CONFIG, isTopupPayment: async () => false };
    expect(await deliver(refundEvent("refund.succeeded"), config)).toEqual(APPLIED);
  });

  it("takes the whole credit back for a partial refund whose amount can't be read", async () => {
    const userId = await buyer();
    const { payment } = await checkout(userId, 10);
    await deliver(payment());
    const refund = refundEvent("refund.succeeded", {
      refund_id: "ref_NullAmount000000001",
      amount: null,
      is_partial: true,
    });
    expect(await deliver(refund)).toEqual(APPLIED);
    expect(await balanceOf(userId)).toBe(0);
  });
});
