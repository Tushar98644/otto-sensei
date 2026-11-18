import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { trialReplacements, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { runCleanup } from "@/lib/cron/cleanup";
import { resetEnvForTests } from "@/lib/env";
import { BillingError } from "./errors";
import {
  cancelPaddleSubscription,
  getPaddleSubscription,
  completedPaddleTransactions,
  refundPaddleTransaction,
  type PaddleSubscription,
} from "./paddle";
import { signBillingId } from "./paddle-sign";
import { processWebhook, type WebhookConfig } from "./webhook";
import {
  paddleHeaders,
  subscriptionEvent,
  WEBHOOK_TEST_SECRET,
  type WebhookSubscription,
} from "./webhook-testing";

vi.mock("@/lib/billing/paddle", () => ({
  cancelPaddleSubscription: vi.fn(),
  getPaddleSubscription: vi.fn(),
  completedPaddleTransactions: vi.fn(async () => ["txn_trial"]),
  refundPaddleTransaction: vi.fn(async () => undefined),
}));

const cancel = vi.mocked(cancelPaddleSubscription);
const read = vi.mocked(getPaddleSubscription);
const refund = vi.mocked(refundPaddleTransaction);
const completed = vi.mocked(completedPaddleTransactions);

const SECRET = WEBHOOK_TEST_SECRET;
const TRIAL_END = "2026-11-11T10:00:00.000Z";

const CONFIG: WebhookConfig = {
  secret: SECRET,
  trialPriceId: "pri_pro_trial",
  priceIds: ["pri_pro_month", "pri_pro_trial", "pri_max_month"],
  planForPrice: (id) =>
    id === "pri_max_month"
      ? { plan: "max", interval: "month" }
      : id.startsWith("pri_pro")
        ? { plan: "pro", interval: "month" }
        : null,
};

type Row = typeof users.$inferSelect;

function deliver(body: string) {
  return processWebhook(body, paddleHeaders(body, SECRET), CONFIG);
}

async function reload(id: string): Promise<Row | undefined> {
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row;
}

async function replacements() {
  return (await getDb()).select().from(trialReplacements);
}

async function trialist(): Promise<Row> {
  const id = crypto.randomUUID();
  await insertUserRow({
    id,
    email: "ada@example.com",
    plan: "pro",
    planInterval: "month",
    planStatus: "trialing",
    trialEndsAt: Date.parse(TRIAL_END),
    billingCustomerId: "ctm_1",
    billingSubscriptionId: "sub_trial",
    createdAt: 1,
    updatedAt: 1,
  });
  return (await reload(id))!;
}

function maxEvent(
  eventType: string,
  user: Row,
  event: { id?: string; occurredAt?: number } = {},
  subscription: WebhookSubscription = {},
) {
  return subscriptionEvent(
    eventType,
    {
      id: "sub_max",
      price_id: "pri_max_month",
      custom_data: { user_id: user.id, replaces_subscription_id: "sub_trial" },
      ...subscription,
    },
    event,
  );
}

function paddleTrial(status: PaddleSubscription["status"]): PaddleSubscription {
  return {
    id: "sub_trial",
    status,
    customer_id: "ctm_1",
    items: [{ price: { id: "pri_pro_trial" } }],
    scheduled_change: null,
    next_billed_at: null,
    current_billing_period: null,
    custom_data: null,
  };
}

const refused = () =>
  new BillingError("refused", "Paddle refused", { providerStatus: 400, providerCode: "x" });

beforeEach(async () => {
  vi.stubEnv("PADDLE_API_KEY", "pdl_sdbx_apikey_test");
  resetEnvForTests();
  cancel.mockReset();
  refund.mockReset();
  completed.mockReset();
  completed.mockResolvedValue(["txn_trial"]);
  cancel.mockResolvedValue(undefined);
  read.mockReset();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("a Pro trial replaced by Max", () => {
  it("moves the row to Max and cancels the trial right away, once, however often Paddle says so", async () => {
    const error = vi.spyOn(console, "error");
    const user = await trialist();
    const body = maxEvent("subscription.created", user, { id: "evt_max_1", occurredAt: 2_000 });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "max",
      planStatus: "active",
      trialEndsAt: null,
      billingSubscriptionId: "sub_max",
    });
    expect(cancel).toHaveBeenCalledExactlyOnceWith("sub_trial", { immediately: true });
    expect(await replacements()).toMatchObject([
      {
        replacedSubscriptionId: "sub_trial",
        subscriptionId: "sub_max",
        userId: user.id,
        attempts: 1,
        cancelledAt: expect.any(Number),
      },
    ]);

    expect(await deliver(body)).toEqual({ status: 200, message: "duplicate" });
    expect(await deliver(maxEvent("subscription.updated", user, { occurredAt: 3_000 }))).toEqual({
      status: 200,
      message: "applied",
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    // The trial being replaced is expected to be live, so this is no second subscription.
    expect(error).not.toHaveBeenCalled();
    // Only a refused second trial gets its charge back; a trial replaced by Max was used.
    expect(refund).not.toHaveBeenCalled();
  });

  it("also settles when the new subscription already has a cancel scheduled", async () => {
    const user = await trialist();
    const body = maxEvent(
      "subscription.created",
      user,
      {},
      {
        scheduled_change: { action: "cancel" },
      },
    );
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.planStatus).toBe("scheduled_cancel");
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("asks Paddle to redeliver when the cancel fails, and the redelivery finishes it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    const body = maxEvent("subscription.created", user, { id: "evt_max_1" });
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Paddle is down"));
    expect(await deliver(body)).toEqual({ status: 500, message: "retry" });
    expect((await reload(user.id))?.plan).toBe("max");
    expect(await replacements()).toMatchObject([{ attempts: 1, cancelledAt: null }]);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.replace_cancel_failed");

    expect(await deliver(body)).toEqual({ status: 200, message: "duplicate" });
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(await replacements()).toMatchObject([{ attempts: 2, cancelledAt: expect.any(Number) }]);
  });

  it("leaves a cancel that kept failing to the daily cleanup", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Paddle is down"));
    expect(await deliver(maxEvent("subscription.created", user))).toMatchObject({ status: 500 });

    const outcome = await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 });
    expect(outcome.stats.replacedTrials).toBe(1);
    expect(outcome.failed).toEqual([]);
    expect(cancel).toHaveBeenCalledTimes(2);
    const again = await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 });
    expect(again.stats.replacedTrials).toBe(0);
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  it("treats a trial Paddle already ended as done", async () => {
    const user = await trialist();
    cancel.mockRejectedValueOnce(refused());
    read.mockResolvedValueOnce(paddleTrial("canceled"));
    expect(await deliver(maxEvent("subscription.created", user))).toEqual({
      status: 200,
      message: "applied",
    });
    expect(read).toHaveBeenCalledWith("sub_trial");
    expect(await replacements()).toMatchObject([{ cancelledAt: expect.any(Number) }]);
  });

  it("keeps trying when Paddle refuses and the trial is still running", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    cancel.mockRejectedValueOnce(refused());
    read.mockResolvedValueOnce(paddleTrial("trialing"));
    expect(await deliver(maxEvent("subscription.created", user))).toEqual({
      status: 500,
      message: "retry",
    });
    expect(await replacements()).toMatchObject([{ attempts: 1, cancelledAt: null }]);
  });

  it("waits without an API key instead of losing the cancel", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("PADDLE_API_KEY", "");
    resetEnvForTests();
    const user = await trialist();
    expect(await deliver(maxEvent("subscription.created", user))).toEqual({
      status: 500,
      message: "retry",
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(await replacements()).toMatchObject([{ attempts: 0, cancelledAt: null }]);
  });

  it("never lets the replaced trial's own events change the plan again", async () => {
    const user = await trialist();
    await deliver(maxEvent("subscription.created", user, { occurredAt: 2_000 }));
    const trialEvent = (eventType: string, status: string) =>
      subscriptionEvent(
        eventType,
        {
          id: "sub_trial",
          status,
          price_id: "pri_pro_trial",
          custom_data: { user_id: user.id },
          trial_ends_at: status === "trialing" ? TRIAL_END : null,
        },
        { occurredAt: 3_000 },
      );
    for (const [eventType, status] of [
      ["subscription.trialing", "trialing"],
      ["subscription.activated", "active"],
      ["subscription.canceled", "canceled"],
    ] as const) {
      expect(await deliver(trialEvent(eventType, status))).toEqual({
        status: 200,
        message: "ignored",
      });
    }
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingSubscriptionId: "sub_max" });
  });

  it("cancels nothing until the new plan is paid for", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await trialist();
    const overdue = maxEvent("subscription.past_due", user, {}, { status: "past_due" });
    expect(await deliver(overdue)).toMatchObject({ status: 200 });
    const stranger = maxEvent(
      "subscription.created",
      user,
      {},
      {
        id: "sub_other",
        price_id: "pri_ebook",
      },
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
      () => signBillingId("sub_trial", "pdl_ntfset_someone_else"),
      (userId: string) => signBillingId(userId, SECRET),
    ];
    for (const [index, forge] of forgeries.entries()) {
      await resetDb();
      const user = await trialist();
      const custom_data = {
        user_id: user.id,
        replaces_subscription_id: "sub_trial",
        replaces_sig: forge(user.id),
      };
      const event = { id: `evt_unsigned_${index}` };
      const body = maxEvent("subscription.created", user, event, { custom_data });
      expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
      expect(await reload(user.id)).toMatchObject({
        plan: "max",
        billingSubscriptionId: "sub_max",
      });
      expect(await replacements()).toEqual([]);
    }
    expect(cancel).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).toContain("billing.unsigned_custom_data");
    expect(JSON.stringify(warn.mock.calls)).toContain("replaces_subscription_id");
    // Untrusted, the trial still running beside Max is a second live subscription.
    expect(JSON.stringify(error.mock.calls)).toContain("billing.second_live_subscription");
  });

  it("never cancels a subscription named in custom_data that the buyer isn't on", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    const forged = { user_id: user.id, replaces_subscription_id: "sub_someone_else" };
    for (const eventType of ["subscription.created", "subscription.updated"]) {
      expect(await deliver(maxEvent(eventType, user, {}, { custom_data: forged }))).toEqual({
        status: 200,
        message: "applied",
      });
    }
    expect(await replacements()).toEqual([]);
    expect(cancel).not.toHaveBeenCalled();
  });
});
