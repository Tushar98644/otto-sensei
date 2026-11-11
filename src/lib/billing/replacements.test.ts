import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { trialReplacements, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { runCleanup } from "@/lib/cron/cleanup";
import { resetEnvForTests } from "@/lib/env";
import { handleWebhook } from "./index";
import { creemSignature, installFakeCreem, subscriptionEvent, type FakeCreem } from "./testing";

// Pro trial to Max: Creem won't modify a trialing subscription, so Max is its own checkout naming
// the trial, and the webhook cancels the trial once Max is paid (./replacements.ts).

const SECRET = "whsec_replacement_test_secret";
const TRIAL_END = "2026-11-11T10:00:00.000Z";
const CANCEL_TRIAL = "POST /v1/subscriptions/sub_trial/cancel";

let creem: FakeCreem;

type Row = typeof users.$inferSelect;

async function deliver(body: string) {
  return handleWebhook(body, new Headers({ "creem-signature": creemSignature(body, SECRET) }));
}

async function reload(id: string): Promise<Row | undefined> {
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row;
}

async function replacements() {
  return (await getDb()).select().from(trialReplacements);
}

// Someone on the Pro trial, as the trial's webhooks left the row.
async function trialist(): Promise<Row> {
  const id = crypto.randomUUID();
  await insertUserRow({
    id,
    email: "ada@example.com",
    plan: "pro",
    planInterval: "month",
    planStatus: "trialing",
    trialEndsAt: Date.parse(TRIAL_END),
    billingCustomerId: "cust_1",
    billingSubscriptionId: "sub_trial",
    createdAt: 1,
    updatedAt: 1,
  });
  creem.subscriptions.push(
    { id: "sub_trial", customer: "cust_1", product: "prod_pro_trial", status: "trialing" },
    { id: "sub_max", customer: "cust_1", product: "prod_max_month", status: "active" },
  );
  return (await reload(id))!;
}

// An event for the new Max subscription, carrying the checkout's metadata.
function maxEvent(eventType: string, user: Row, event: { id?: string; createdAt?: number } = {}) {
  return subscriptionEvent(
    eventType,
    {
      id: "sub_max",
      status: "active",
      product: "prod_max_month",
      metadata: { user_id: user.id, replaces_subscription_id: "sub_trial" },
    },
    event,
  );
}

beforeEach(async () => {
  vi.stubEnv("CREEM_API_KEY", "creem_test_123");
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("CREEM_PRO_MONTHLY_PRODUCT_ID", "prod_pro_month");
  vi.stubEnv("CREEM_PRO_TRIAL_PRODUCT_ID", "prod_pro_trial");
  vi.stubEnv("CREEM_MAX_MONTHLY_PRODUCT_ID", "prod_max_month");
  resetEnvForTests();
  creem = installFakeCreem();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("a Pro trial replaced by Max", () => {
  it("moves the row to Max and cancels the trial right away, once, however often Creem says so", async () => {
    const user = await trialist();
    const body = maxEvent("subscription.active", user, { id: "evt_max_1", createdAt: 2_000 });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "max",
      planStatus: "active",
      trialEndsAt: null,
      billingSubscriptionId: "sub_max",
    });
    expect(creem.callsTo(CANCEL_TRIAL)).toHaveLength(1);
    expect(creem.callsTo(CANCEL_TRIAL)[0]?.body).toEqual({ mode: "immediate" });
    expect(await replacements()).toMatchObject([
      {
        replacedSubscriptionId: "sub_trial",
        subscriptionId: "sub_max",
        userId: user.id,
        attempts: 1,
      },
    ]);
    expect((await replacements())[0]?.cancelledAt).toEqual(expect.any(Number));

    // A redelivery, the checkout's own event and the first payment's: none cancels again.
    expect(await deliver(body)).toEqual({ status: 200, message: "duplicate" });
    expect(await deliver(maxEvent("subscription.paid", user, { createdAt: 3_000 }))).toMatchObject({
      status: 200,
    });
    expect(creem.callsTo(CANCEL_TRIAL)).toHaveLength(1);
    expect(creem.callsTo("POST /v1/subscriptions/sub_max")).toEqual([]);
  });

  it("does the same from checkout.completed, whose metadata sits on the checkout", async () => {
    const user = await trialist();
    const body = JSON.stringify({
      id: "evt_checkout_max",
      eventType: "checkout.completed",
      created_at: 2_000,
      object: {
        id: "ch_1",
        object: "checkout",
        product: { id: "prod_max_month", object: "product" },
        customer: { id: "cust_1", object: "customer", email: "ada@example.com" },
        subscription: {
          id: "sub_max",
          object: "subscription",
          product: "prod_max_month",
          customer: "cust_1",
          status: "active",
        },
        status: "completed",
        metadata: { user_id: user.id, replaces_subscription_id: "sub_trial" },
      },
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect((await reload(user.id))?.plan).toBe("max");
    expect(creem.callsTo(CANCEL_TRIAL)).toHaveLength(1);
  });

  it("asks Creem to redeliver when the cancel fails, and the redelivery finishes it", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    const body = maxEvent("subscription.active", user, { id: "evt_max_1" });
    creem.failNext(CANCEL_TRIAL, 503);
    expect(await deliver(body)).toEqual({ status: 500, message: "retry" });
    // The plan is Max either way; only the cancel is left.
    expect((await reload(user.id))?.plan).toBe("max");
    expect(await replacements()).toMatchObject([{ attempts: 1, cancelledAt: null }]);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.replace_cancel_failed");

    expect(await deliver(body)).toEqual({ status: 200, message: "duplicate" });
    expect(creem.callsTo(CANCEL_TRIAL)).toHaveLength(2);
    expect(await replacements()).toMatchObject([{ attempts: 2, cancelledAt: expect.any(Number) }]);
  });

  it("leaves a cancel that kept failing to the daily cleanup", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await trialist();
    creem.failNext(CANCEL_TRIAL, 500);
    expect(await deliver(maxEvent("subscription.active", user))).toMatchObject({ status: 500 });

    const outcome = await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 });
    expect(outcome.stats.replacedTrials).toBe(1);
    expect(outcome.failed).toEqual([]);
    expect(creem.callsTo(CANCEL_TRIAL)).toHaveLength(2);
    expect(
      (await runCleanup({ now: Date.now(), deadline: Date.now() + 30_000 })).stats.replacedTrials,
    ).toBe(0);
    expect(creem.callsTo(CANCEL_TRIAL)).toHaveLength(2);
  });

  it("treats a trial Creem already ended as done", async () => {
    const user = await trialist();
    creem.subscriptions[0]!.status = "canceled";
    creem.failNext(CANCEL_TRIAL, 400);
    expect(await deliver(maxEvent("subscription.active", user))).toEqual({
      status: 200,
      message: "applied",
    });
    expect(await replacements()).toMatchObject([{ cancelledAt: expect.any(Number) }]);
  });

  it("never lets the replaced trial's own events change the plan again", async () => {
    const user = await trialist();
    await deliver(maxEvent("subscription.active", user, { createdAt: 2_000 }));
    const trialEvent = (eventType: string, status: string) =>
      subscriptionEvent(
        eventType,
        { id: "sub_trial", status, product: "prod_pro_trial", metadata: { user_id: user.id } },
        { createdAt: 3_000 },
      );
    expect(await deliver(trialEvent("subscription.trialing", "trialing"))).toEqual({
      status: 200,
      message: "ignored",
    });
    expect(await deliver(trialEvent("subscription.paid", "active"))).toEqual({
      status: 200,
      message: "ignored",
    });
    expect(await deliver(trialEvent("subscription.canceled", "canceled"))).toEqual({
      status: 200,
      message: "ignored",
    });
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingSubscriptionId: "sub_max" });
  });

  it("cancels nothing until the new plan is active", async () => {
    const user = await trialist();
    const unfinished = subscriptionEvent("subscription.update", {
      id: "sub_max",
      status: "incomplete",
      product: "prod_max_month",
      metadata: { user_id: user.id, replaces_subscription_id: "sub_trial" },
    });
    expect(await deliver(unfinished)).toEqual({ status: 200, message: "ignored" });
    expect(await replacements()).toEqual([]);
    expect(creem.callsTo(CANCEL_TRIAL)).toEqual([]);
    expect((await reload(user.id))?.plan).toBe("pro");
  });
});
