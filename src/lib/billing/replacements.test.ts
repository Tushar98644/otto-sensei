import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { runCleanup } from "@/lib/cron/cleanup";
import { resetEnvForTests } from "@/lib/env";
import { signBillingId } from "./billing-sign";
import { cancelSubscription, getSubscription, refundPayment, succeededPayments } from "./dodo";
import { DodoSubscriptionSchema, type DodoSubscription } from "./dodo-status";
import { dodoId } from "./dodo-testing";
import {
  AFTER_TRIAL,
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  ON_TRIAL,
  TEST_DATES,
  standardWebhookHeaders,
  subscriptionEvent,
  subscriptionPayload,
  type SubscriptionFields,
} from "./dodo-webhook-testing";
import { BillingError } from "./errors";
import { addTrialHistory, eventRows, replacementRows } from "./log-testing";
import { isOrphan, refundRefusedTrial, settleOrphan } from "./replacements";
import { emailFingerprint } from "./trial";
import { processWebhook, type WebhookConfig } from "./webhook";

vi.mock("@/lib/billing/dodo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./dodo")>()),
  cancelSubscription: vi.fn(),
  getSubscription: vi.fn(),
  succeededPayments: vi.fn(),
  refundPayment: vi.fn(),
}));

const cancel = vi.mocked(cancelSubscription);
const read = vi.mocked(getSubscription);
const refund = vi.mocked(refundPayment);
const payments = vi.mocked(succeededPayments);

const SECRET = DODO_WEBHOOK_TEST_SECRET;
const SIGNING = BILLING_TEST_SIGNING_SECRET;
const { proMonth: PRO_MONTH, proTrial: PRO_TRIAL } = DODO_TEST_PRODUCTS;
const MAX_MONTH = DODO_TEST_PRODUCTS.maxMonth;
const CUS = dodoId("cus", 1);
const SUB_TRIAL = dodoId("sub", "trial");
const SUB_MAX = dodoId("sub", "max");
const PAY_TRIAL = dodoId("pay", "trial");

const CONFIG: WebhookConfig = {
  secret: SECRET,
  signingSecret: SIGNING,
  trialProductId: PRO_TRIAL,
  productIds: [PRO_MONTH, PRO_TRIAL, MAX_MONTH],
  planForProduct: (id) =>
    id === MAX_MONTH
      ? { plan: "max", interval: "month" }
      : id === PRO_MONTH || id === PRO_TRIAL
        ? { plan: "pro", interval: "month" }
        : null,
};

type Row = typeof users.$inferSelect;
type Delivery = { id?: string; timestamp?: number };

function deliver(body: string, id?: string) {
  return processWebhook(body, standardWebhookHeaders(body, SECRET, id ? { id } : {}), CONFIG);
}

async function reload(id: string): Promise<Row | undefined> {
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row;
}

async function replacements() {
  return replacementRows();
}

async function trialist(overrides: Partial<typeof users.$inferInsert> = {}): Promise<Row> {
  const id = crypto.randomUUID();
  await insertUserRow({
    id,
    email: "ada@example.com",
    plan: "pro",
    planInterval: "month",
    planStatus: "trialing",
    trialEndsAt: TEST_DATES.trialEnd,
    billingCustomerId: CUS,
    billingSubscriptionId: SUB_TRIAL,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });
  return (await reload(id))!;
}

// A Max subscription bought by its own checkout, naming the trial it replaces.
function maxEvent(
  type: string,
  user: Row,
  delivery: Delivery = {},
  fields: SubscriptionFields = {},
) {
  return subscriptionEvent(
    type,
    {
      subscription_id: SUB_MAX,
      customer: { customer_id: CUS },
      product_id: MAX_MONTH,
      metadata: { user_id: user.id, replaces_subscription_id: SUB_TRIAL },
      ...fields,
    },
    delivery.timestamp === undefined ? {} : { timestamp: delivery.timestamp },
  );
}

function dodoTrial(status: string): DodoSubscription {
  return DodoSubscriptionSchema.parse(
    subscriptionPayload("subscription.updated", {
      subscription_id: SUB_TRIAL,
      customer: { customer_id: CUS },
      product_id: PRO_TRIAL,
      status,
      ...ON_TRIAL,
    }),
  );
}

const refused = () =>
  new BillingError("refused", "Dodo refused", { providerStatus: 422, providerCode: "x" });

beforeEach(async () => {
  vi.stubEnv("DODO_API_KEY", "dodo_test_apikey");
  resetEnvForTests();
  cancel.mockReset();
  cancel.mockResolvedValue("cancelled");
  read.mockReset();
  refund.mockReset();
  refund.mockResolvedValue("refunded");
  payments.mockReset();
  payments.mockResolvedValue([PAY_TRIAL]);
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

// Kept until the in-place trial upgrade is verified in Dodo test mode.
describe("a Pro trial replaced by a separately bought Max", () => {
  it("moves the row to Max and cancels the trial right away, once, however often Dodo says so", async () => {
    const error = vi.spyOn(console, "error");
    const user = await trialist();
    const body = maxEvent("subscription.active", user, { timestamp: 2_000 });
    expect(await deliver(body, "msg_max_1")).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "max",
      planStatus: "active",
      trialEndsAt: null,
      billingSubscriptionId: SUB_MAX,
    });
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB_TRIAL, { immediately: true });
    expect(await replacements()).toMatchObject([
      {
        replacedSubscriptionId: SUB_TRIAL,
        subscriptionId: SUB_MAX,
        userId: user.id,
        attempts: 1,
        cancelledAt: expect.any(Number),
      },
    ]);

    expect(await deliver(body, "msg_max_1")).toEqual({ status: 200, message: "duplicate" });
    expect(await deliver(maxEvent("subscription.updated", user, { timestamp: 3_000 }))).toEqual({
      status: 200,
      message: "applied",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    // The trial being replaced is expected to be live, so this is no second subscription.
    expect(error).not.toHaveBeenCalled();
    // Only a refused second trial gets its charge back; a trial replaced by Max was used.
    expect(payments).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
  });

  it("also settles when the new subscription already has a cancel scheduled", async () => {
    const user = await trialist();
    const body = maxEvent("subscription.active", user, {}, { cancel_at_next_billing_date: true });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.planStatus).toBe("scheduled_cancel");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("asks Dodo to redeliver when the cancel fails, and the redelivery finishes it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    const body = maxEvent("subscription.active", user);
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    expect(await deliver(body, "msg_max_1")).toEqual({ status: 500, message: "retry" });
    expect((await reload(user.id))?.plan).toBe("max");
    expect(await replacements()).toMatchObject([{ attempts: 1, cancelledAt: null }]);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.replace_cancel_failed");

    expect(await deliver(body, "msg_max_1")).toEqual({ status: 200, message: "duplicate" });
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(await replacements()).toMatchObject([{ attempts: 2, cancelledAt: expect.any(Number) }]);
  });

  it("leaves a cancel that kept failing to the daily cleanup", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    expect(await deliver(maxEvent("subscription.active", user))).toMatchObject({ status: 500 });

    const outcome = await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 });
    expect(outcome.stats.replacedTrials).toBe(1);
    expect(outcome.failed).toEqual([]);
    expect(cancel).toHaveBeenCalledTimes(2);
    const again = await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 });
    expect(again.stats.replacedTrials).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("treats a trial Dodo already ended as done, whether the client or the read-back says so", async () => {
    const user = await trialist();
    cancel.mockResolvedValueOnce("already_ended");
    expect(await deliver(maxEvent("subscription.active", user))).toEqual({
      status: 200,
      message: "applied",
    });
    expect(await replacements()).toMatchObject([{ cancelledAt: expect.any(Number) }]);
    expect(read).not.toHaveBeenCalled();

    for (const status of ["cancelled", "expired", "failed"]) {
      await resetDb();
      const again = await trialist();
      cancel.mockRejectedValueOnce(refused());
      read.mockResolvedValueOnce(dodoTrial(status));
      expect(await deliver(maxEvent("subscription.active", again))).toEqual({
        status: 200,
        message: "applied",
      });
      expect(await replacements()).toMatchObject([{ cancelledAt: expect.any(Number) }]);
    }
    expect(read.mock.calls).toEqual([[SUB_TRIAL], [SUB_TRIAL], [SUB_TRIAL]]);
  });

  it("keeps trying when Dodo refuses and the trial is still running", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    cancel.mockRejectedValueOnce(refused());
    read.mockResolvedValueOnce(dodoTrial("active"));
    expect(await deliver(maxEvent("subscription.active", user))).toEqual({
      status: 500,
      message: "retry",
    });
    expect(await replacements()).toMatchObject([{ attempts: 1, cancelledAt: null }]);
  });

  it("waits without an API key instead of losing the cancel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("DODO_API_KEY", "");
    resetEnvForTests();
    const user = await trialist();
    expect(await deliver(maxEvent("subscription.active", user))).toEqual({
      status: 500,
      message: "retry",
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(await replacements()).toMatchObject([{ attempts: 0, cancelledAt: null }]);
  });

  it("never lets the replaced trial's own events change the plan again", async () => {
    const user = await trialist();
    await deliver(maxEvent("subscription.active", user, { timestamp: 2_000 }));
    const trialEvent = (type: string, fields: SubscriptionFields) =>
      subscriptionEvent(
        type,
        {
          subscription_id: SUB_TRIAL,
          customer: { customer_id: CUS },
          product_id: PRO_TRIAL,
          metadata: { user_id: user.id },
          ...fields,
        },
        { timestamp: 3_000 },
      );
    for (const [type, fields] of [
      ["subscription.updated", ON_TRIAL],
      ["subscription.renewed", AFTER_TRIAL],
      ["subscription.cancelled", ON_TRIAL],
    ] as const) {
      expect(await deliver(trialEvent(type, fields))).toEqual({
        status: 200,
        message: "ignored",
      });
    }
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingSubscriptionId: SUB_MAX });
  });

  it("cancels nothing until the new plan is paid for", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await trialist();
    const overdue = maxEvent("subscription.past_due", user);
    expect(await deliver(overdue)).toMatchObject({ status: 200 });
    const stranger = maxEvent(
      "subscription.active",
      user,
      {},
      { subscription_id: dodoId("sub", "other"), product_id: dodoId("pdt", "ebook") },
    );
    expect(await deliver(stranger)).toEqual({ status: 200, message: "ignored" });
    expect(await replacements()).toEqual([]);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("cancels nothing for a replaces_subscription_id without our signature, even the buyer's own trial", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const forgeries = [
      () => undefined,
      () => "0".repeat(64),
      () => signBillingId(SUB_TRIAL, "someone_elses_secret"),
      () => signBillingId(SUB_TRIAL, SECRET),
      (userId: string) => signBillingId(userId, SIGNING),
    ];
    for (const [index, forge] of forgeries.entries()) {
      await resetDb();
      const user = await trialist();
      const metadata = {
        user_id: user.id,
        replaces_subscription_id: SUB_TRIAL,
        replaces_sig: forge(user.id),
      };
      const body = maxEvent("subscription.active", user, {}, { metadata });
      expect(await deliver(body, `msg_unsigned_${index}`)).toEqual({
        status: 200,
        message: "applied",
      });
      expect(await reload(user.id)).toMatchObject({
        plan: "max",
        billingSubscriptionId: SUB_MAX,
      });
      expect(await replacements()).toEqual([]);
    }
    expect(cancel).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).toContain("billing.unsigned_custom_data");
    expect(JSON.stringify(warn.mock.calls)).toContain("replaces_subscription_id");
    // Untrusted, the trial still running beside Max is a second live subscription.
    expect(JSON.stringify(error.mock.calls)).toContain("billing.second_live_subscription");
  });

  it("never cancels a subscription named in metadata that the buyer isn't on", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    const metadata = { user_id: user.id, replaces_subscription_id: dodoId("sub", "someone") };
    for (const type of ["subscription.active", "subscription.updated"]) {
      expect(await deliver(maxEvent(type, user, {}, { metadata }))).toEqual({
        status: 200,
        message: "applied",
      });
    }
    expect(await replacements()).toEqual([]);
    expect(cancel).not.toHaveBeenCalled();
  });
});

describe("a refused second trial", () => {
  const SUB_AGAIN = dodoId("sub", "again");

  async function returning(): Promise<Row> {
    const user = await trialist({
      plan: "free",
      planInterval: null,
      planStatus: "canceled",
      trialEndsAt: null,
      billingSubscriptionId: dodoId("sub", "first"),
    });
    await addTrialHistory({ emailHash: emailFingerprint(user.email), kind: "trial", createdAt: 1 });
    return user;
  }

  const secondTrial = (user: Row) =>
    subscriptionEvent("subscription.active", {
      subscription_id: SUB_AGAIN,
      customer: { customer_id: CUS },
      product_id: PRO_TRIAL,
      ...ON_TRIAL,
      metadata: { user_id: user.id },
    });

  async function claims() {
    return (await eventRows())
      .map((row) => row.id)
      .filter((id) => id.startsWith("refund:"))
      .sort();
  }

  it("is cancelled at once and each succeeded charge refunded once, claimed by payment id", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await returning();
    const second = dodoId("pay", "second");
    payments.mockResolvedValue([PAY_TRIAL, second]);
    expect(await deliver(secondTrial(user))).toEqual({ status: 200, message: "ignored" });
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB_AGAIN, { immediately: true });
    expect(payments).toHaveBeenCalledExactlyOnceWith(SUB_AGAIN);
    expect(refund.mock.calls).toEqual([[PAY_TRIAL], [second]]);
    expect(await claims()).toEqual([`refund:${second}`, `refund:${PAY_TRIAL}`].sort());
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled" });

    expect(await refundRefusedTrial(SUB_AGAIN, user.id)).toBe(0);
    expect(refund).toHaveBeenCalledTimes(2);
  });

  it("counts a trial Dodo already ended as done, and still refunds its charge", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await returning();
    cancel.mockResolvedValueOnce("already_ended");
    expect(await deliver(secondTrial(user))).toEqual({ status: 200, message: "ignored" });
    expect(await replacements()).toMatchObject([
      { replacedSubscriptionId: SUB_AGAIN, cancelledAt: expect.any(Number) },
    ]);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
  });

  it("waits for the daily cron without an API key, then cancels and refunds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("DODO_API_KEY", "");
    resetEnvForTests();
    const user = await returning();
    expect(await deliver(secondTrial(user))).toEqual({ status: 200, message: "ignored" });
    expect(cancel).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
    expect(await replacements()).toMatchObject([{ attempts: 0, cancelledAt: null }]);

    vi.stubEnv("DODO_API_KEY", "dodo_test_apikey");
    resetEnvForTests();
    const outcome = await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 });
    expect(outcome.stats.replacedTrials).toBe(1);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB_AGAIN, { immediately: true });
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
    expect(await replacements()).toMatchObject([{ attempts: 1, cancelledAt: expect.any(Number) }]);
  });

  it("frees a failed refund's claim and logs it, so a later try refunds it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await returning();
    refund.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    expect(await deliver(secondTrial(user))).toEqual({ status: 200, message: "ignored" });
    expect(await claims()).toEqual([]);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.reused_trial_refund_failed");
    expect(JSON.stringify(error.mock.calls)).toContain(PAY_TRIAL);
    expect(JSON.stringify(error.mock.calls)).not.toContain(user.email);

    expect(await refundRefusedTrial(SUB_AGAIN, user.id)).toBe(1);
    expect(await claims()).toEqual([`refund:${PAY_TRIAL}`]);
  });

  it("logs and gives up for now when Dodo can't list the trial's payments", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await returning();
    payments.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    expect(await deliver(secondTrial(user))).toEqual({ status: 200, message: "ignored" });
    expect(refund).not.toHaveBeenCalled();
    expect(JSON.stringify(error.mock.calls)).toContain("billing.reused_trial_refund_failed");
    // A later payment.succeeded for the trial still refunds it by its payment id.
    expect(await refundRefusedTrial(SUB_AGAIN, user.id, [PAY_TRIAL])).toBe(1);
  });
});

describe("settleOrphan", () => {
  const userId = crypto.randomUUID();
  const orphanKeys = async () =>
    (await eventRows()).map((row) => row.id).filter((id) => id.startsWith("orphan:"));

  it("cancels and refunds only a subscription Dodo says can still charge", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const charging = ["active", "past_due", "on_hold", "paused"];
    for (const status of charging) {
      read.mockResolvedValueOnce(dodoTrial(status));
      expect(await settleOrphan(SUB_TRIAL, userId)).toBe("cancelled");
    }
    expect(cancel).toHaveBeenCalledTimes(charging.length);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
    expect(await orphanKeys()).toEqual([`orphan:${SUB_TRIAL}`]);
    expect(await isOrphan(SUB_TRIAL)).toBe(true);
    expect(await replacements()).toEqual([]);
  });

  it("keeps the charges of one that ended or is set to end without it", async () => {
    for (const status of ["cancelled", "expired", "failed", "pending"]) {
      read.mockResolvedValueOnce(dodoTrial(status));
      expect(await settleOrphan(SUB_TRIAL, userId)).toBe("kept");
    }
    read.mockResolvedValueOnce({ ...dodoTrial("active"), cancel_at_next_billing_date: true });
    expect(await settleOrphan(SUB_TRIAL, userId)).toBe("kept");
    expect(cancel).not.toHaveBeenCalled();
    expect(payments).not.toHaveBeenCalled();
    expect(await isOrphan(SUB_TRIAL)).toBe(false);
  });

  it("refunds a charge that succeeded after its own cancel, once", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    read.mockResolvedValueOnce(dodoTrial("active"));
    expect(await settleOrphan(SUB_TRIAL, userId)).toBe("cancelled");
    const later = dodoId("pay", "later");
    payments.mockResolvedValue([PAY_TRIAL, later]);
    read.mockResolvedValue(dodoTrial("cancelled"));
    expect(await settleOrphan(SUB_TRIAL, userId)).toBe("rechecked");
    expect(await settleOrphan(SUB_TRIAL, userId)).toBe("rechecked");
    expect(refund.mock.calls).toEqual([[PAY_TRIAL], [later]]);
  });

  it("throws when Dodo can't be asked or the cancel fails, so the webhook asks for a retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    read.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    await expect(settleOrphan(SUB_TRIAL, userId)).rejects.toThrow(BillingError);
    expect(await isOrphan(SUB_TRIAL)).toBe(false);
    read.mockResolvedValueOnce(dodoTrial("active"));
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    await expect(settleOrphan(SUB_TRIAL, userId)).rejects.toThrow(BillingError);
    expect(refund).not.toHaveBeenCalled();
  });
});
