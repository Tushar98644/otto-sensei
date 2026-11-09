import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { billingEvents, trialHistory, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { handleWebhook } from "./index";
import { creemSignature, subscriptionEvent, type WebhookSubscription } from "./testing";
import { emailFingerprint } from "./trial";

const SECRET = "whsec_otto_resume_test_secret";
const PRO_MONTH = "prod_pro_month";
const PRO_TRIAL = "prod_pro_trial";
const MAX_WEEK = "prod_max_week";
const TRIAL_END = "2026-11-11T10:00:00.000Z";
const NEXT_MONTH = "2026-12-11T10:00:00.000Z";

type Row = typeof users.$inferSelect;

function signed(body: string, secret = SECRET): Headers {
  return new Headers({ "creem-signature": creemSignature(body, secret) });
}

async function deliver(body: string, headers = signed(body)) {
  return handleWebhook(body, headers);
}

async function createUser(overrides: Partial<typeof users.$inferInsert> = {}): Promise<Row> {
  const row = {
    id: crypto.randomUUID(),
    email: "ada@example.com",
    plan: "free" as const,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
  await insertUserRow(row);
  return (await reload(row.id))!;
}

async function reload(id: string): Promise<Row | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row;
}

function event(eventType: string, subscription: WebhookSubscription = {}, at?: number) {
  return subscriptionEvent(eventType, subscription, at === undefined ? {} : { createdAt: at });
}

beforeEach(async () => {
  vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("CREEM_PRO_MONTHLY_PRODUCT_ID", PRO_MONTH);
  vi.stubEnv("CREEM_PRO_TRIAL_PRODUCT_ID", PRO_TRIAL);
  vi.stubEnv("CREEM_MAX_WEEKLY_PRODUCT_ID", MAX_WEEK);
  resetEnvForTests();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("signature", () => {
  it("accepts a body signed with the webhook secret", async () => {
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id } });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
  });

  it("answers 401 for a wrong secret, a changed body or no signature, and changes nothing", async () => {
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id } });
    expect(await deliver(body, signed(body, "whsec_someone_else"))).toEqual({
      status: 401,
      message: "invalid_signature",
    });
    expect(await deliver(body.replace("active", "trialing"), signed(body))).toMatchObject({ status: 401 });
    expect(await deliver(body, new Headers())).toMatchObject({ status: 401 });
    expect((await reload(user.id))?.plan).toBe("free");
    expect(await (await getDb()).select().from(billingEvents)).toEqual([]);
  });

  it("answers 503 without a secret, and 413 for an oversized body before checking it", async () => {
    vi.stubEnv("CREEM_WEBHOOK_SECRET", "");
    resetEnvForTests();
    const body = event("subscription.active");
    expect(await deliver(body)).toEqual({ status: 503, message: "not_configured" });
    vi.stubEnv("CREEM_WEBHOOK_SECRET", SECRET);
    resetEnvForTests();
    const huge = "x".repeat(300 * 1024);
    expect(await deliver(huge, signed(huge))).toEqual({ status: 413, message: "too_large" });
  });

  it("asks for a retry when a signed body can't be read", async () => {
    const body = JSON.stringify({ id: "evt_1", eventType: "subscription.active", object: { id: 7 } });
    expect(await deliver(body)).toEqual({ status: 500, message: "malformed" });
  });
});

describe("idempotency", () => {
  it("applies an event once: a redelivery with the same id is a duplicate", async () => {
    const user = await createUser();
    const body = subscriptionEvent(
      "subscription.trialing",
      { status: "trialing", product: PRO_TRIAL, metadata: { user_id: user.id }, current_period_end_date: TRIAL_END },
      { id: "evt_trial_1" },
    );
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(await deliver(body)).toEqual({ status: 200, message: "duplicate" });
    const events = await (await getDb()).select().from(billingEvents);
    expect(events.map((row) => row.id)).toEqual(["evt_trial_1"]);
  });

  it("ignores an older event for the same subscription that arrives late", async () => {
    const user = await createUser();
    const paid = event(
      "subscription.paid",
      { status: "active", product: PRO_TRIAL, metadata: { user_id: user.id }, next_transaction_date: NEXT_MONTH },
      2_000,
    );
    expect(await deliver(paid)).toMatchObject({ message: "applied" });
    // Creem retried the trial's start after the first payment had already landed.
    const late = event(
      "subscription.trialing",
      { status: "trialing", product: PRO_TRIAL, metadata: { user_id: user.id }, current_period_end_date: TRIAL_END },
      1_000,
    );
    expect(await deliver(late)).toEqual({ status: 200, message: "ignored" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active", trialEndsAt: null });
  });
});

describe("statuses", () => {
  it("trialing: Pro with the trial's end date, and the person is written down as having trialed", async () => {
    const user = await createUser();
    const body = event("subscription.trialing", {
      status: "trialing",
      product: PRO_TRIAL,
      metadata: { user_id: user.id },
      current_period_end_date: TRIAL_END,
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planInterval: "month",
      planStatus: "trialing",
      trialEndsAt: Date.parse(TRIAL_END),
      planRenewsAt: Date.parse(TRIAL_END),
      billingCustomerId: "cust_1",
      billingSubscriptionId: "sub_1",
    });
    const [seen] = await (await getDb()).select().from(trialHistory);
    expect(seen).toMatchObject({ emailHash: emailFingerprint("ada@example.com"), kind: "trial" });
  });

  it("active: the first regular payment ends the trial", async () => {
    const user = await createUser({ plan: "pro", planInterval: "month", trialEndsAt: 5, billingSubscriptionId: "sub_1" });
    const body = event("subscription.paid", {
      status: "active",
      product: PRO_TRIAL,
      next_transaction_date: NEXT_MONTH,
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      trialEndsAt: null,
      planRenewsAt: Date.parse(NEXT_MONTH),
    });
  });

  it("past_due keeps the plan, and a failed first payment keeps the trial's allowance", async () => {
    const user = await createUser({ plan: "pro", planInterval: "month", trialEndsAt: 5, billingSubscriptionId: "sub_1" });
    expect(await deliver(event("subscription.past_due", { status: "past_due", product: PRO_TRIAL }))).toMatchObject({
      message: "applied",
    });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "past_due", trialEndsAt: 5 });
  });

  it("scheduled_cancel keeps the plan until the period ends, with nothing renewing", async () => {
    const user = await createUser({ plan: "pro", planInterval: "month", billingSubscriptionId: "sub_1" });
    const body = event("subscription.scheduled_cancel", { status: "scheduled_cancel", next_transaction_date: NEXT_MONTH });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "scheduled_cancel", planRenewsAt: null });
  });

  it.each([
    ["subscription.canceled", "canceled"],
    ["subscription.unpaid", "unpaid"],
    ["subscription.paused", "paused"],
    // Creem leaves the old status in an expired event's payload; the event itself ends access.
    ["subscription.expired", "active"],
  ])("%s drops the plan to Free", async (eventType, status) => {
    const user = await createUser({
      plan: "pro",
      planInterval: "month",
      trialEndsAt: 5,
      planRenewsAt: 9,
      billingSubscriptionId: "sub_1",
    });
    expect(await deliver(event(eventType, { status }))).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planInterval: null,
      planRenewsAt: null,
      trialEndsAt: null,
    });
  });

  it("ignores an unfinished checkout and a status Creem may add later", async () => {
    const user = await createUser();
    for (const status of ["incomplete", "something_new"]) {
      const body = event("subscription.update", { status, metadata: { user_id: user.id } });
      expect(await deliver(body)).toEqual({ status: 200, message: "ignored" });
    }
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("follows a plan change from Pro to Max weekly and writes down a payment", async () => {
    const user = await createUser();
    const bought = event("subscription.active", { metadata: { user_id: user.id } }, 1_000);
    expect(await deliver(bought)).toMatchObject({ message: "applied" });
    const upgraded = event("subscription.update", { product: MAX_WEEK }, 2_000);
    expect(await deliver(upgraded)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "week" });
    const [seen] = await (await getDb()).select().from(trialHistory);
    expect(seen?.kind).toBe("paid");
  });

  it("never lets another product, or someone else's subscription, take a paid plan away", async () => {
    const user = await createUser({ plan: "pro", planInterval: "month", billingSubscriptionId: "sub_1" });
    const other = event("subscription.active", { id: "sub_ebook", product: "prod_ebook" });
    expect(await deliver(other)).toEqual({ status: 200, message: "ignored" });
    const stale = event("subscription.canceled", { id: "sub_old", status: "canceled" });
    expect(await deliver(stale)).toEqual({ status: 200, message: "ignored" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });
});

describe("checkout.completed", () => {
  it("applies the subscription it carries, found by the checkout's metadata", async () => {
    const user = await createUser({ email: "maya@example.com" });
    const body = JSON.stringify({
      id: "evt_checkout_1",
      eventType: "checkout.completed",
      created_at: 1_000,
      object: {
        id: "ch_1",
        object: "checkout",
        product: { id: PRO_TRIAL, object: "product" },
        customer: { id: "cust_9", object: "customer", email: "maya@example.com" },
        subscription: {
          id: "sub_9",
          object: "subscription",
          product: PRO_TRIAL,
          customer: "cust_9",
          status: "trialing",
          current_period_end_date: TRIAL_END,
          metadata: { user_id: user.id },
        },
        status: "completed",
        metadata: { user_id: user.id },
      },
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      trialEndsAt: Date.parse(TRIAL_END),
      billingCustomerId: "cust_9",
      billingSubscriptionId: "sub_9",
    });
  });

  it("ignores a one-time purchase and events it doesn't use", async () => {
    const oneTime = JSON.stringify({
      id: "evt_2",
      eventType: "checkout.completed",
      object: { id: "ch_2", product: "prod_ebook", status: "completed" },
    });
    expect(await deliver(oneTime)).toEqual({ status: 200, message: "ignored" });
    const refund = JSON.stringify({ id: "evt_3", eventType: "refund.created", object: { id: "ref_1" } });
    expect(await deliver(refund)).toEqual({ status: 200, message: "ignored" });
  });
});
