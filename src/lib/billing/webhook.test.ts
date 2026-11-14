import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { billingEvents, trialHistory, users } from "@/db/schema";
import { captureServerEvent } from "@/lib/analytics/server";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { emailFingerprint } from "./trial";
import { processWebhook, type WebhookConfig } from "./webhook";
import {
  paddleHeaders,
  paddleSignature,
  subscriptionEvent,
  transactionEvent,
  type WebhookSubscription,
} from "./webhook-testing";

vi.mock("@/lib/analytics/server", () => ({ captureServerEvent: vi.fn() }));
vi.mock("@/lib/portfolio/cache", () => ({ refreshPortfolioPages: vi.fn() }));
vi.mock("@/lib/billing/paddle", () => ({
  cancelPaddleSubscription: vi.fn(),
  getPaddleSubscription: vi.fn(),
}));

const captured = vi.mocked(captureServerEvent);
const refreshed = vi.mocked(refreshPortfolioPages);

const SECRET = "pdl_ntfset_webhook_test_secret";
const PRO_MONTH = "pri_pro_month";
const PRO_TRIAL = "pri_pro_trial";
const MAX_YEAR = "pri_max_year";
const TRIAL_END = "2026-11-11T10:00:00.000Z";
const NEXT_MONTH = "2026-12-11T10:00:00.000Z";

const PRICES: Record<string, { plan: PaidPlanId; interval: BillingInterval }> = {
  [PRO_MONTH]: { plan: "pro", interval: "month" },
  [PRO_TRIAL]: { plan: "pro", interval: "month" },
  [MAX_YEAR]: { plan: "max", interval: "year" },
};

const CONFIG: WebhookConfig = {
  secret: SECRET,
  priceIds: Object.keys(PRICES),
  planForPrice: (id) => PRICES[id] ?? null,
};

type Row = typeof users.$inferSelect;

function deliver(body: string, headers = paddleHeaders(body, SECRET), config = CONFIG) {
  return processWebhook(body, headers, config);
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
  const [row] = await (await getDb()).select().from(users).where(eq(users.id, id));
  return row;
}

async function recordedEvents() {
  return (await getDb()).select().from(billingEvents);
}

function event(eventType: string, subscription: WebhookSubscription = {}, at?: number | string) {
  return subscriptionEvent(eventType, subscription, at === undefined ? {} : { occurredAt: at });
}

const tracked = (overrides: Partial<typeof users.$inferInsert> = {}) =>
  createUser({
    plan: "pro",
    planInterval: "month",
    planStatus: "active",
    billingCustomerId: "ctm_1",
    billingSubscriptionId: "sub_1",
    ...overrides,
  });

beforeEach(async () => {
  captured.mockReset();
  refreshed.mockReset();
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signature", () => {
  it("accepts a body signed with the destination's secret", async () => {
    const user = await createUser();
    const body = event("subscription.activated", { custom_data: { user_id: user.id } });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("answers 401 for a wrong secret, a changed body or a missing or garbled header, and changes nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    const body = event("subscription.activated", { custom_data: { user_id: user.id } });
    const invalid = { status: 401, message: "invalid_signature" };
    expect(await deliver(body, paddleHeaders(body, "pdl_ntfset_someone_else"))).toEqual(invalid);
    expect(await deliver(body.replace("active", "trialing"), paddleHeaders(body, SECRET))).toEqual(
      invalid,
    );
    expect(await deliver(body, new Headers())).toEqual(invalid);
    for (const header of ["h1=abc", "ts=;h1=", "ts=abc;h1=00", `ts=1;h1=${"z".repeat(64)}`]) {
      expect(await deliver(body, new Headers({ "paddle-signature": header }))).toEqual(invalid);
    }
    expect((await reload(user.id))?.plan).toBe("free");
    expect(await recordedEvents()).toEqual([]);
  });

  it("accepts any matching h1 while a secret is being rotated", async () => {
    const user = await createUser();
    const body = event("subscription.activated", { custom_data: { user_id: user.id } });
    const ts = Math.floor(Date.now() / 1000);
    const old = paddleSignature(body, "pdl_ntfset_old_secret", ts).split(";")[1];
    const current = paddleSignature(body, SECRET, ts).split(";")[1];
    const header = `ts=${ts};${old};${current}`;
    expect(await deliver(body, new Headers({ "paddle-signature": header }))).toMatchObject({
      message: "applied",
    });
  });

  it("refuses a signature more than five minutes away from now, either way", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    const body = event("subscription.activated", { custom_data: { user_id: user.id } });
    const now = Math.floor(Date.now() / 1000);
    for (const ts of [now - 301, now + 301]) {
      expect(await deliver(body, paddleHeaders(body, SECRET, ts))).toEqual({
        status: 401,
        message: "invalid_signature",
      });
    }
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).toContain("stale");
    expect(await deliver(body, paddleHeaders(body, SECRET, now - 290))).toMatchObject({
      message: "applied",
    });
  });

  it("answers 503 without a secret, and 413 for an oversized body before checking it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = event("subscription.activated");
    expect(await deliver(body, paddleHeaders(body, SECRET), { ...CONFIG, secret: "" })).toEqual({
      status: 503,
      message: "not_configured",
    });
    const huge = "x".repeat(300 * 1024);
    expect(await deliver(huge, new Headers())).toEqual({ status: 413, message: "too_large" });
  });

  it("asks for a retry when a signed body can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const noId = JSON.stringify({ event_type: "subscription.activated", data: {} });
    expect(await deliver(noId)).toEqual({ status: 500, message: "malformed" });
    expect(await deliver("not json")).toEqual({ status: 500, message: "malformed" });
    const badObject = JSON.stringify({
      event_id: "evt_bad",
      event_type: "subscription.updated",
      occurred_at: new Date().toISOString(),
      data: { id: 7 },
    });
    expect(await deliver(badObject)).toEqual({ status: 500, message: "malformed" });
    expect(await recordedEvents()).toEqual([]);
  });
});

describe("idempotency and order", () => {
  it("applies an event once: a redelivery with the same event_id is a duplicate", async () => {
    const user = await createUser();
    const subscription = {
      status: "trialing",
      price_id: PRO_TRIAL,
      custom_data: { user_id: user.id },
      trial_ends_at: TRIAL_END,
    };
    const first = subscriptionEvent("subscription.trialing", subscription, { id: "evt_trial_1" });
    const again = subscriptionEvent("subscription.trialing", subscription, { id: "evt_trial_1" });
    expect(JSON.parse(first).notification_id).not.toBe(JSON.parse(again).notification_id);
    expect(await deliver(first)).toEqual({ status: 200, message: "applied" });
    expect(await deliver(again)).toEqual({ status: 200, message: "duplicate" });
    expect((await recordedEvents()).map((row) => row.id)).toEqual(["evt_trial_1"]);
  });

  it("ignores an older event for the same subscription, and applies one from the same moment", async () => {
    const user = await createUser();
    const at = "2026-11-08T10:00:02.000Z";
    const paid = event(
      "subscription.activated",
      { price_id: PRO_TRIAL, custom_data: { user_id: user.id } },
      at,
    );
    expect(await deliver(paid)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.billingEventAt).toBe(Date.parse(at));
    const late = event(
      "subscription.trialing",
      { status: "trialing", price_id: PRO_TRIAL, trial_ends_at: TRIAL_END },
      "2026-11-08T10:00:01.000Z",
    );
    expect(await deliver(late)).toEqual({ status: 200, message: "ignored" });
    expect(await reload(user.id)).toMatchObject({ planStatus: "active", trialEndsAt: null });
    const same = event("subscription.updated", { scheduled_change: { action: "cancel" } }, at);
    expect(await deliver(same)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.planStatus).toBe("scheduled_cancel");
  });

  it("reads Paddle's microsecond timestamps", async () => {
    const user = await createUser();
    const body = event(
      "subscription.activated",
      { custom_data: { user_id: user.id }, next_billed_at: "2026-12-08T10:00:00.654321Z" },
      "2026-11-08T10:00:02.123456Z",
    );
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      billingEventAt: Date.parse("2026-11-08T10:00:02.123Z"),
      planRenewsAt: Date.parse("2026-12-08T10:00:00.654Z"),
    });
    const late = event(
      "subscription.canceled",
      { status: "canceled", next_billed_at: null, current_billing_period: null },
      "2026-11-08T10:00:02.122999Z",
    );
    expect(await deliver(late)).toEqual({ status: 200, message: "ignored" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("compares times only against the tracked subscription", async () => {
    const user = await tracked({ billingEventAt: Date.parse("2026-11-09T00:00:00.000Z") });
    const other = event(
      "subscription.created",
      { id: "sub_2", customer_id: "ctm_1", price_id: MAX_YEAR },
      "2026-11-08T00:00:00.000Z",
    );
    expect(await deliver(other)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingSubscriptionId: "sub_2" });
  });

  it("skips the order check for an event whose time can't be read", async () => {
    const user = await tracked({ billingEventAt: Date.parse("2026-11-09T00:00:00.000Z") });
    const body = event("subscription.updated", { price_id: MAX_YEAR }, "not a date");
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "max",
      billingEventAt: Date.parse("2026-11-09T00:00:00.000Z"),
    });
  });
});

describe("statuses", () => {
  it("trialing: Pro until the item's trial end, and the person is written down as having trialed", async () => {
    const user = await createUser();
    const body = event("subscription.created", {
      status: "trialing",
      price_id: PRO_TRIAL,
      custom_data: { user_id: user.id },
      trial_ends_at: TRIAL_END,
      next_billed_at: NEXT_MONTH,
      current_billing_period: { starts_at: "2026-11-08T10:00:00.000Z", ends_at: TRIAL_END },
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planInterval: "month",
      planStatus: "trialing",
      trialEndsAt: Date.parse(TRIAL_END),
      planRenewsAt: Date.parse(NEXT_MONTH),
      planPeriodEndsAt: Date.parse(TRIAL_END),
      billingCustomerId: "ctm_1",
      billingSubscriptionId: "sub_1",
    });
    const [seen] = await (await getDb()).select().from(trialHistory);
    expect(seen).toMatchObject({ emailHash: emailFingerprint("ada@example.com"), kind: "trial" });
  });

  it("trialing without trial dates ends the trial at the next charge", async () => {
    const user = await createUser();
    const body = event("subscription.trialing", {
      status: "trialing",
      price_id: PRO_TRIAL,
      custom_data: { user_id: user.id },
      next_billed_at: TRIAL_END,
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.trialEndsAt).toBe(Date.parse(TRIAL_END));
  });

  it("activated: the first payment ends the trial and starts the paid period", async () => {
    const user = await tracked({ planStatus: "trialing", trialEndsAt: 5 });
    const body = event("subscription.activated", {
      price_id: PRO_TRIAL,
      next_billed_at: NEXT_MONTH,
      current_billing_period: { starts_at: TRIAL_END, ends_at: NEXT_MONTH },
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      trialEndsAt: null,
      planRenewsAt: Date.parse(NEXT_MONTH),
      planPeriodStartsAt: Date.parse(TRIAL_END),
      planPeriodEndsAt: Date.parse(NEXT_MONTH),
    });
    const [seen] = await (await getDb()).select().from(trialHistory);
    expect(seen?.kind).toBe("paid");
  });

  it("a cancel scheduled on an active subscription keeps the plan with nothing renewing", async () => {
    const user = await tracked({ planRenewsAt: 9 });
    const body = event("subscription.updated", {
      scheduled_change: { action: "cancel", effective_at: NEXT_MONTH },
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "scheduled_cancel",
      planRenewsAt: null,
      trialEndsAt: null,
    });
  });

  it("a cancel scheduled during the trial keeps the trial's end", async () => {
    const user = await tracked({ planStatus: "trialing", trialEndsAt: Date.parse(TRIAL_END) });
    const body = event("subscription.updated", {
      status: "trialing",
      price_id: PRO_TRIAL,
      trial_ends_at: TRIAL_END,
      scheduled_change: { action: "cancel", effective_at: TRIAL_END },
      next_billed_at: null,
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "scheduled_cancel",
      planRenewsAt: null,
      trialEndsAt: Date.parse(TRIAL_END),
    });
  });

  it("a scheduled pause is not a cancel", async () => {
    const user = await tracked();
    const body = event("subscription.updated", {
      scheduled_change: { action: "pause", effective_at: NEXT_MONTH },
      next_billed_at: NEXT_MONTH,
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      planStatus: "active",
      planRenewsAt: Date.parse(NEXT_MONTH),
    });
  });

  it("past_due keeps the plan, and a failed first payment keeps the trial's allowance", async () => {
    const user = await tracked({ planStatus: "trialing", trialEndsAt: 5 });
    const body = event("subscription.past_due", {
      status: "past_due",
      price_id: PRO_TRIAL,
      scheduled_change: { action: "cancel" },
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "past_due",
      trialEndsAt: 5,
    });
  });

  it.each([
    ["subscription.paused", "paused"],
    ["subscription.canceled", "canceled"],
  ])("%s drops the plan to Free", async (eventType, status) => {
    const user = await tracked({ trialEndsAt: 5, planRenewsAt: 9, planPeriodEndsAt: 9 });
    const body = event(eventType, { status, next_billed_at: null, current_billing_period: null });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: status,
      planInterval: null,
      planRenewsAt: null,
      trialEndsAt: null,
      planPeriodEndsAt: null,
    });
  });

  it("resumed brings the paid plan back", async () => {
    const user = await tracked({ plan: "free", planInterval: null, planStatus: "paused" });
    expect(await deliver(event("subscription.resumed"))).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active" });
  });

  it("ignores a status Paddle may add later, without recording it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    const body = event("subscription.updated", {
      status: "something_new",
      custom_data: { user_id: user.id },
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "ignored" });
    expect((await reload(user.id))?.plan).toBe("free");
    expect(await recordedEvents()).toEqual([]);
  });

  it("follows a plan change from Pro to Max yearly", async () => {
    const user = await createUser();
    const bought = event("subscription.created", { custom_data: { user_id: user.id } }, 1_000);
    expect(await deliver(bought)).toMatchObject({ message: "applied" });
    const upgraded = event("subscription.updated", { price_id: MAX_YEAR }, 2_000);
    expect(await deliver(upgraded)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "year" });
  });

  it("reads the plan from whichever item is ours", async () => {
    const user = await createUser();
    const body = event("subscription.created", {
      price_id: ["pri_addon", MAX_YEAR],
      custom_data: { user_id: user.id },
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.plan).toBe("max");
  });

  it("never lets another price, or someone else's subscription, take a paid plan away", async () => {
    const user = await tracked();
    const other = event("subscription.created", { id: "sub_ebook", price_id: "pri_ebook" });
    expect(await deliver(other)).toEqual({ status: 200, message: "ignored" });
    const stale = event("subscription.canceled", { id: "sub_old", status: "canceled" });
    expect(await deliver(stale)).toEqual({ status: 200, message: "ignored" });
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingSubscriptionId: "sub_1" });
  });

  it("keeps the paid plan when the tracked subscription moves to a price we don't list", async () => {
    const user = await tracked({ plan: "max", planInterval: "year" });
    const body = event("subscription.updated", { price_id: "pri_legacy" });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "year" });
  });

  it("ignores events it doesn't use", async () => {
    for (const eventType of ["subscription.imported", "customer.created", "adjustment.created"]) {
      expect(await deliver(event(eventType))).toEqual({ status: 200, message: "ignored" });
    }
    expect(await recordedEvents()).toEqual([]);
  });
});

describe("finding the user", () => {
  it("uses custom_data.user_id only when it's a uuid, then the stored ids", async () => {
    const user = await createUser({ billingCustomerId: "ctm_known" });
    const body = event("subscription.created", {
      customer_id: "ctm_known",
      custom_data: { user_id: "1 or 1=1" },
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("reads the customer's email from Paddle only when nothing else matched a paid status", async () => {
    const user = await createUser({ email: "maya@example.com" });
    const customerEmail = vi.fn(async () => "  Maya@Example.com ");
    const config = { ...CONFIG, customerEmail };
    const paid = event("subscription.created", { id: "sub_9", customer_id: "ctm_9" });
    expect(await deliver(paid, undefined, config)).toMatchObject({ message: "applied" });
    expect(customerEmail).toHaveBeenCalledExactlyOnceWith("ctm_9");
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingCustomerId: "ctm_9" });

    const known = event("subscription.updated", { id: "sub_9", customer_id: "ctm_9" });
    expect(await deliver(known, undefined, config)).toMatchObject({ message: "applied" });
    const ended = event("subscription.canceled", { id: "sub_x", status: "canceled" });
    expect(await deliver(ended, undefined, config)).toEqual({ status: 200, message: "ignored" });
    expect(customerEmail).toHaveBeenCalledTimes(1);
  });

  it("asks for a retry when the email can't be read, and records nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await createUser();
    const config = {
      ...CONFIG,
      customerEmail: vi.fn(async () => Promise.reject(new Error("timeout"))),
    };
    const body = event("subscription.created", { id: "sub_9", customer_id: "ctm_9" });
    expect(await deliver(body, undefined, config)).toEqual({ status: 500, message: "retry" });
    expect(await recordedEvents()).toEqual([]);
  });

  it("ignores a subscription it can't match to anyone, as the simulator's are", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await createUser();
    const body = event("subscription.created", {
      id: "sub_01simulated",
      customer_id: "ctm_01simulated",
      price_id: "pri_01simulated",
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "ignored" });
    expect(
      await deliver(event("subscription.created", { id: "sub_9", customer_id: "ctm_9" })),
    ).toEqual({ status: 200, message: "ignored" });
  });
});

describe("checkout_completed analytics", () => {
  it("fires once for the transaction that started a subscription", async () => {
    const user = await createUser();
    const body = transactionEvent("transaction.completed", {
      price_id: MAX_YEAR,
      custom_data: { user_id: user.id },
    });
    expect(await deliver(body)).toEqual({ status: 200, message: "applied" });
    expect(captured).toHaveBeenCalledExactlyOnceWith(
      user.id,
      "checkout_completed",
      { plan: "max", trial: false },
      { set: { plan: "max" } },
    );
    expect(await deliver(body)).toEqual({ status: 200, message: "duplicate" });
    const replayed = transactionEvent("transaction.completed", {
      price_id: MAX_YEAR,
      custom_data: { user_id: user.id },
    });
    expect(await deliver(replayed)).toEqual({ status: 200, message: "duplicate" });
    expect(captured).toHaveBeenCalledTimes(1);
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("says when the checkout started a trial", async () => {
    const user = await tracked({ plan: "free", planInterval: null, planStatus: null });
    const body = transactionEvent("transaction.completed", {
      origin: "web",
      price_id: PRO_TRIAL,
      trial: true,
      custom_data: null,
    });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(captured).toHaveBeenCalledWith(
      user.id,
      "checkout_completed",
      { plan: "pro", trial: true },
      { set: { plan: "pro" } },
    );
  });

  it("ignores renewals, other prices, one-off purchases and strangers", async () => {
    const user = await createUser();
    const mine = { custom_data: { user_id: user.id } };
    const ignoredBodies = [
      transactionEvent("transaction.completed", { ...mine, origin: "subscription_recurring" }),
      transactionEvent("transaction.completed", { ...mine, origin: "subscription_update" }),
      transactionEvent("transaction.completed", { ...mine, price_id: "pri_ebook" }),
      transactionEvent("transaction.completed", { ...mine, subscription_id: null }),
      transactionEvent("transaction.completed", { subscription_id: "sub_9", customer_id: "ctm_9" }),
      transactionEvent("transaction.paid", mine),
    ];
    for (const body of ignoredBodies) {
      expect(await deliver(body)).toEqual({ status: 200, message: "ignored" });
    }
    expect(captured).not.toHaveBeenCalled();
    expect(await recordedEvents()).toEqual([]);
  });

  it("is never fired by subscription events", async () => {
    const user = await createUser();
    const body = event("subscription.created", { custom_data: { user_id: user.id } });
    expect(await deliver(body)).toMatchObject({ message: "applied" });
    expect(captured).not.toHaveBeenCalled();
  });
});

describe("published portfolios", () => {
  it("refresh when the plan crosses between paid and Free, and only then", async () => {
    const user = await createUser();
    await deliver(event("subscription.created", { custom_data: { user_id: user.id } }, 1_000));
    expect(refreshed).toHaveBeenCalledTimes(1);
    await deliver(event("subscription.updated", { price_id: MAX_YEAR }, 2_000));
    expect(refreshed).toHaveBeenCalledTimes(1);
    await deliver(event("subscription.canceled", { status: "canceled" }, 3_000));
    expect(refreshed).toHaveBeenCalledTimes(2);
  });
});
