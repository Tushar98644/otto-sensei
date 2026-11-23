import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { captureServerEvent } from "@/lib/analytics/server";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import { signBillingId } from "./billing-sign";
import { cancelSubscription, getSubscription, refundPayment, succeededPayments } from "./dodo";
import { DodoSubscriptionSchema } from "./dodo-status";
import { dodoId } from "./dodo-testing";
import {
  AFTER_TRIAL,
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_IDS,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  ON_TRIAL,
  TEST_DATES,
  disputeEvent,
  dodoTime,
  paymentEvent,
  refundEvent,
  standardWebhookHeaders,
  standardWebhookSignature,
  subscriptionEvent,
  subscriptionPayload,
  type SubscriptionFields,
} from "./dodo-webhook-testing";
import { chargeableSubscriptionId } from "./entitlements";
import { BillingError } from "./errors";
import { addTrialHistory, eventRows, replacementRows, trialRows } from "./log-testing";
import { retryPendingReplacements } from "./replacements";
import { emailFingerprint } from "./trial";
import { processWebhook, type WebhookConfig } from "./webhook";

vi.mock("@/lib/analytics/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/server")>()),
  captureServerEvent: vi.fn(),
}));
vi.mock("@/lib/portfolio/cache", () => ({ refreshPortfolioPages: vi.fn() }));
vi.mock("@/lib/billing/dodo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./dodo")>()),
  cancelSubscription: vi.fn(),
  getSubscription: vi.fn(),
  succeededPayments: vi.fn(),
  refundPayment: vi.fn(),
}));

const captured = vi.mocked(captureServerEvent);
const refreshed = vi.mocked(refreshPortfolioPages);
const cancel = vi.mocked(cancelSubscription);
const refund = vi.mocked(refundPayment);
const payments = vi.mocked(succeededPayments);
const lookup = vi.mocked(getSubscription);

const SECRET = DODO_WEBHOOK_TEST_SECRET;
const SIGNING = BILLING_TEST_SIGNING_SECRET;
const { proMonth: PRO_MONTH, proTrial: PRO_TRIAL, maxYear: MAX_YEAR } = DODO_TEST_PRODUCTS;
const CUS = DODO_TEST_IDS.customer;
const SUB = DODO_TEST_IDS.subscription;
const PAY = DODO_TEST_IDS.payment;
const PAY_TRIAL = dodoId("pay", "trial");
const OTHER_SECRET = `whsec_${Buffer.from("someone-elses-endpoint").toString("base64")}`;

const PRODUCTS: Record<string, { plan: PaidPlanId; interval: BillingInterval }> = {
  [PRO_MONTH]: { plan: "pro", interval: "month" },
  [PRO_TRIAL]: { plan: "pro", interval: "month" },
  [MAX_YEAR]: { plan: "max", interval: "year" },
};

const CONFIG: WebhookConfig = {
  secret: SECRET,
  signingSecret: SIGNING,
  productIds: Object.keys(PRODUCTS),
  planForProduct: (id) => PRODUCTS[id] ?? null,
  trialProductId: PRO_TRIAL,
};

const APPLIED = { status: 200, message: "applied" };
const IGNORED = { status: 200, message: "ignored" };
const DUPLICATE = { status: 200, message: "duplicate" };
const INVALID = { status: 401, message: "invalid_signature" };
const MALFORMED = { status: 500, message: "malformed" };

const cus = (name: string | number) => dodoId("cus", name);
const sub = (name: string | number) => dodoId("sub", name);

type Row = typeof users.$inferSelect;

function deliver(body: string, headers = standardWebhookHeaders(body, SECRET), config = CONFIG) {
  return processWebhook(body, headers, config);
}

const withId = (body: string, id: string) => standardWebhookHeaders(body, SECRET, { id });

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
  return eventRows();
}

function event(type: string, fields: SubscriptionFields = {}, at?: number | string) {
  return subscriptionEvent(type, fields, at === undefined ? {} : { timestamp: at });
}

// A JSON body with a valid signature but a payload of our choosing.
function rawEvent(type: string, data: unknown): string {
  return JSON.stringify({ type, timestamp: dodoTime(Date.now()), data });
}

const tracked = (overrides: Partial<typeof users.$inferInsert> = {}) =>
  createUser({
    plan: "pro",
    planInterval: "month",
    planStatus: "active",
    billingCustomerId: CUS,
    billingSubscriptionId: SUB,
    ...overrides,
  });

beforeEach(async () => {
  captured.mockReset();
  refreshed.mockReset();
  cancel.mockReset();
  cancel.mockResolvedValue("cancelled");
  refund.mockReset();
  refund.mockResolvedValue("refunded");
  payments.mockReset();
  payments.mockResolvedValue([PAY_TRIAL]);
  await resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The calls of one log event, or every call at that level without a name.
function logged(level: "info" | "warn" | "error", name = ""): string {
  const calls = vi.mocked(console[level]).mock.calls;
  return JSON.stringify(calls.filter((call) => String(call[0]).includes(name)));
}

function loggedCount(level: "info" | "warn" | "error", name: string): number {
  return vi.mocked(console[level]).mock.calls.filter((call) => String(call[0]).includes(name))
    .length;
}

describe("signature", () => {
  it("accepts a body signed with the endpoint's secret", async () => {
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id } });
    expect(await deliver(body)).toEqual(APPLIED);
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("answers 401 for a wrong secret, a changed body, id or time, re-encoded JSON or a missing or garbled header, and changes nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id } });
    const good = standardWebhookHeaders(body, SECRET);
    expect(await deliver(body, standardWebhookHeaders(body, OTHER_SECRET))).toEqual(INVALID);
    expect(await deliver(body.replace('"active"', '"paused"'), good)).toEqual(INVALID);
    expect(await deliver(JSON.stringify(JSON.parse(body), null, 2), good)).toEqual(INVALID);
    expect(await deliver(body, new Headers())).toEqual(INVALID);
    const signature = good.get("webhook-signature") ?? "";
    for (const [name, value] of [
      ["webhook-id", "msg_someone_else"],
      ["webhook-id", ""],
      ["webhook-timestamp", String(Number(good.get("webhook-timestamp")) - 1)],
      ["webhook-timestamp", "soon"],
      ["webhook-signature", "v1,abc"],
      ["webhook-signature", signature.replace("v1,", "v2,")],
      ["webhook-signature", signature.replace("v1,", "")],
      ["webhook-signature", `v1,${"A".repeat(2048)}`],
    ] as const) {
      const headers = new Headers(good);
      headers.set(name, value);
      expect(await deliver(body, headers)).toEqual(INVALID);
    }
    expect((await reload(user.id))?.plan).toBe("free");
    expect(await recordedEvents()).toEqual([]);
  });

  it("accepts any matching v1 entry while a secret is being rotated", async () => {
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id } });
    const id = "msg_rotation";
    const timestamp = Math.floor(Date.now() / 1000);
    const old = standardWebhookSignature(body, OTHER_SECRET, id, timestamp);
    const current = standardWebhookSignature(body, SECRET, id, timestamp);
    const headers = new Headers({
      "webhook-id": id,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `${old} ${current}`,
    });
    expect(await deliver(body, headers)).toEqual(APPLIED);
  });

  it("refuses a signature more than five minutes away from now, either way", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id } });
    const now = Math.floor(Date.now() / 1000);
    for (const timestamp of [now - 301, now + 301]) {
      expect(await deliver(body, standardWebhookHeaders(body, SECRET, { timestamp }))).toEqual(
        INVALID,
      );
    }
    expect(logged("warn", "billing.webhook_invalid")).toContain("stale");
    const fresh = standardWebhookHeaders(body, SECRET, { timestamp: now - 290 });
    expect(await deliver(body, fresh)).toEqual(APPLIED);
  });

  it("answers 503 without a usable webhook secret or signing secret, and 413 for an oversized body before checking it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const body = event("subscription.active");
    const headers = standardWebhookHeaders(body, SECRET);
    const notConfigured = { status: 503, message: "not_configured" };
    for (const config of [
      { ...CONFIG, secret: "" },
      { ...CONFIG, secret: undefined },
      { ...CONFIG, secret: "whsec_not base64!" },
      { ...CONFIG, signingSecret: undefined },
      { ...CONFIG, signingSecret: "" },
    ]) {
      expect(await deliver(body, headers, config)).toEqual(notConfigured);
    }
    const huge = "x".repeat(300 * 1024);
    expect(await deliver(huge, new Headers())).toEqual({ status: 413, message: "too_large" });
    expect(await recordedEvents()).toEqual([]);
  });

  it("asks for a retry when a signed body can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const bodies = [
      "not json",
      JSON.stringify({ business_id: DODO_TEST_IDS.business, data: {} }),
      rawEvent("subscription.updated", { subscription_id: 7 }),
      rawEvent("subscription.active", { subscription_id: SUB, status: "active" }),
      rawEvent("payment.succeeded", { payment_id: PAY }),
      rawEvent("payment.failed", { payment_id: 7 }),
    ];
    for (const body of bodies) expect(await deliver(body)).toEqual(MALFORMED);
    expect(logged("error", "billing.webhook_malformed")).toContain("msg_");
    expect(await recordedEvents()).toEqual([]);
  });
});

describe("idempotency and order", () => {
  it("applies an event once: a redelivery with the same webhook-id is a duplicate", async () => {
    const user = await createUser();
    const body = event("subscription.active", {
      product_id: PRO_TRIAL,
      ...ON_TRIAL,
      metadata: { user_id: user.id },
    });
    expect(await deliver(body, withId(body, "msg_trial_1"))).toEqual(APPLIED);
    expect(await deliver(body, withId(body, "msg_trial_1"))).toEqual(DUPLICATE);
    expect((await recordedEvents()).map((row) => row.id)).toEqual(["msg_trial_1"]);
  });

  it("ignores an older event for the same subscription, and applies one from the same moment", async () => {
    const user = await createUser();
    const at = Date.parse("2026-11-11T10:00:02.000Z");
    const paid = event(
      "subscription.renewed",
      { product_id: PRO_TRIAL, ...AFTER_TRIAL, metadata: { user_id: user.id } },
      at,
    );
    expect(await deliver(paid)).toEqual(APPLIED);
    expect((await reload(user.id))?.billingEventAt).toBe(at);
    const late = event("subscription.active", { product_id: PRO_TRIAL, ...ON_TRIAL }, at - 1_000);
    expect(await deliver(late)).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({ planStatus: "active", trialEndsAt: null });
    const same = event(
      "subscription.updated",
      { product_id: PRO_TRIAL, ...AFTER_TRIAL, cancel_at_next_billing_date: true },
      at,
    );
    expect(await deliver(same)).toEqual(APPLIED);
    expect((await reload(user.id))?.planStatus).toBe("scheduled_cancel");
  });

  it("ignores a late redelivery: the newer event already wrote the state Dodo now sends", async () => {
    const user = await tracked({ billingEventAt: 1_000 });
    const cancelling = { cancel_at_next_billing_date: true };
    expect(await deliver(event("subscription.updated", cancelling, 3_000))).toEqual(APPLIED);
    // Dodo retries the older renewal with the subscription as it is now.
    expect(await deliver(event("subscription.renewed", cancelling, 2_000))).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({
      planStatus: "scheduled_cancel",
      billingEventAt: 3_000,
    });
  });

  it("reads Dodo's microsecond timestamps", async () => {
    const user = await createUser();
    const body = event(
      "subscription.active",
      { metadata: { user_id: user.id }, next_billing_date: "2026-12-08T10:00:00.654321Z" },
      "2026-11-08T10:00:02.123456Z",
    );
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      billingEventAt: Date.parse("2026-11-08T10:00:02.123Z"),
      planRenewsAt: Date.parse("2026-12-08T10:00:00.654Z"),
    });
    const late = event("subscription.cancelled", {}, "2026-11-08T10:00:02.122999Z");
    expect(await deliver(late)).toEqual(IGNORED);
    expect((await reload(user.id))?.plan).toBe("pro");
  });

  it("compares times only against the tracked subscription", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await tracked({ billingEventAt: Date.parse("2026-11-09T00:00:00.000Z") });
    const other = event(
      "subscription.active",
      { subscription_id: sub(2), product_id: MAX_YEAR, metadata: { user_id: user.id } },
      "2026-11-08T00:00:00.000Z",
    );
    expect(await deliver(other)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingSubscriptionId: sub(2) });
  });

  it("ignores a late paid event of a subscription that ended, so the next one's cancel still moves the user to Free", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await createUser();
    const a = { subscription_id: sub("a"), metadata: { user_id: user.id } };
    const b = { subscription_id: sub("b"), metadata: { user_id: user.id } };
    expect(await deliver(event("subscription.active", a, 1_000))).toEqual(APPLIED);
    expect(await deliver(event("subscription.cancelled", a, 3_000))).toEqual(APPLIED);
    expect(await deliver(event("subscription.active", b, 4_000))).toEqual(APPLIED);
    const late = event("subscription.updated", { ...a, cancel_at_next_billing_date: true }, 2_000);
    expect(await deliver(late)).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      billingSubscriptionId: sub("b"),
      billingEventAt: 4_000,
    });
    expect(await deliver(event("subscription.cancelled", b, 5_000))).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: "canceled",
      billingSubscriptionId: sub("b"),
    });
    expect(error).not.toHaveBeenCalled();
  });

  it("keeps a Max yearly bought after Pro ended when Pro's scheduled cancel is retried late, and its on_hold still means Free", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await createUser();
    const { start, monthEnd, yearEnd } = TEST_DATES;
    const s1 = { subscription_id: sub(1), metadata: { user_id: user.id } };
    const s2 = {
      subscription_id: sub(2),
      product_id: MAX_YEAR,
      created_at: dodoTime(monthEnd + HOUR_MS),
      previous_billing_date: dodoTime(monthEnd + HOUR_MS),
      next_billing_date: dodoTime(yearEnd),
      metadata: { user_id: user.id },
    };
    expect(await deliver(event("subscription.active", s1, start))).toEqual(APPLIED);
    const scheduled = event(
      "subscription.updated",
      { ...s1, cancel_at_next_billing_date: true },
      start + 20 * DAY_MS,
    );
    expect(await deliver(event("subscription.cancelled", s1, monthEnd))).toEqual(APPLIED);
    expect(await deliver(event("subscription.active", s2, monthEnd + HOUR_MS))).toEqual(APPLIED);
    expect(await deliver(scheduled)).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({
      plan: "max",
      planInterval: "year",
      planStatus: "active",
      planRenewsAt: yearEnd,
      billingSubscriptionId: sub(2),
    });
    expect(await deliver(event("subscription.on_hold", s2, monthEnd + 2 * HOUR_MS))).toEqual(
      APPLIED,
    );
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: "on_hold",
      billingSubscriptionId: sub(2),
    });
    expect(error).not.toHaveBeenCalled();
  });

  it("ignores an ended subscription's paid event however late it comes, even without a readable time", async () => {
    const user = await createUser();
    const a = { subscription_id: sub("a"), metadata: { user_id: user.id } };
    const b = { subscription_id: sub("b"), metadata: { user_id: user.id } };
    const scheduled = { ...a, cancel_at_next_billing_date: true };
    expect(await deliver(event("subscription.active", a, 1_000))).toEqual(APPLIED);
    expect(await deliver(event("subscription.cancelled", a, 3_000))).toEqual(APPLIED);
    expect(await deliver(event("subscription.updated", scheduled, "not a date"))).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({ plan: "free", billingSubscriptionId: sub("a") });
    expect(await deliver(event("subscription.active", b, 4_000))).toEqual(APPLIED);
    expect(await deliver(event("subscription.cancelled", b, 5_000))).toEqual(APPLIED);
    expect(await deliver(event("subscription.updated", scheduled, 2_000))).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: "canceled",
      billingSubscriptionId: sub("b"),
    });
  });

  it("skips the order check for an event whose time is missing or can't be read", async () => {
    const stored = Date.parse("2026-11-09T00:00:00.000Z");
    const user = await tracked({ billingEventAt: stored });
    const unreadable = event("subscription.plan_changed", { product_id: MAX_YEAR }, "not a date");
    expect(await deliver(unreadable)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingEventAt: stored });
    expect(await deliver(event("subscription.plan_changed", {}, ""))).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingEventAt: stored });
  });
});

describe("statuses", () => {
  it("a paid trial's first period is trialing: Pro until next_billing_date, and the person is written down as having trialed", async () => {
    const user = await createUser();
    const body = event("subscription.active", {
      product_id: PRO_TRIAL,
      ...ON_TRIAL,
      metadata: { user_id: user.id },
    });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planInterval: "month",
      planStatus: "trialing",
      trialEndsAt: TEST_DATES.trialEnd,
      planRenewsAt: TEST_DATES.trialEnd,
      planPeriodStartsAt: TEST_DATES.start,
      planPeriodEndsAt: TEST_DATES.trialEnd,
      billingCustomerId: CUS,
      billingSubscriptionId: SUB,
    });
    const [seen] = await trialRows();
    expect(seen).toMatchObject({ emailHash: emailFingerprint("ada@example.com"), kind: "trial" });
  });

  it("the first full charge ends the trial and starts the paid period", async () => {
    const user = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
    const body = event("subscription.renewed", {
      product_id: PRO_TRIAL,
      ...AFTER_TRIAL,
      payment_id: PAY,
    });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "active",
      trialEndsAt: null,
      planRenewsAt: TEST_DATES.monthAfterTrial,
      planPeriodStartsAt: TEST_DATES.trialEnd,
      planPeriodEndsAt: TEST_DATES.monthAfterTrial,
    });
    const [seen] = await trialRows();
    expect(seen?.kind).toBe("paid");
  });

  it("a cancel at the next billing date keeps the plan with nothing renewing, and undoing it renews again", async () => {
    const user = await tracked({ planRenewsAt: 9 });
    const scheduled = event("subscription.updated", { cancel_at_next_billing_date: true }, 1_000);
    expect(await deliver(scheduled)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "scheduled_cancel",
      planRenewsAt: null,
      trialEndsAt: null,
    });
    const resumed = event("subscription.updated", { cancel_at_next_billing_date: false }, 2_000);
    expect(await deliver(resumed)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      planStatus: "active",
      planRenewsAt: TEST_DATES.monthEnd,
    });
  });

  it("a cancel scheduled during the trial keeps the trial's end", async () => {
    const user = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
    const body = event("subscription.updated", {
      product_id: PRO_TRIAL,
      ...ON_TRIAL,
      cancel_at_next_billing_date: true,
    });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "scheduled_cancel",
      planRenewsAt: null,
      trialEndsAt: TEST_DATES.trialEnd,
    });
  });

  it("past_due keeps the plan through the grace period, and a failed first full charge keeps the trial's allowance", async () => {
    const trialist = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
    const firstCharge = event("subscription.past_due", { product_id: PRO_TRIAL, ...ON_TRIAL });
    expect(await deliver(firstCharge)).toEqual(APPLIED);
    expect(await reload(trialist.id)).toMatchObject({
      plan: "pro",
      planStatus: "past_due",
      trialEndsAt: TEST_DATES.trialEnd,
    });

    const payer = await tracked({
      email: "payer@example.com",
      billingCustomerId: cus("payer"),
      billingSubscriptionId: sub("payer"),
    });
    const renewal = event("subscription.past_due", {
      subscription_id: sub("payer"),
      customer: { customer_id: cus("payer") },
      past_due_ends_at: dodoTime(TEST_DATES.monthEnd + 3 * DAY_MS),
    });
    expect(await deliver(renewal)).toEqual(APPLIED);
    expect(await reload(payer.id)).toMatchObject({
      plan: "pro",
      planStatus: "past_due",
      trialEndsAt: null,
    });
  });

  it("on_hold after the grace period moves the user to Free, keeps the subscription chargeable, and a fixed card brings the plan back", async () => {
    const user = await tracked({ planRenewsAt: 9, planPeriodEndsAt: 9 });
    expect(await deliver(event("subscription.on_hold", {}, 1_000))).toEqual(APPLIED);
    const held = await reload(user.id);
    expect(held).toMatchObject({
      plan: "free",
      planStatus: "on_hold",
      planInterval: null,
      planRenewsAt: null,
      planPeriodEndsAt: null,
      billingSubscriptionId: SUB,
    });
    expect(chargeableSubscriptionId(held!)).toBe(SUB);
    expect(await deliver(event("subscription.active", {}, 2_000))).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active" });
  });

  it.each([
    ["subscription.paused", "paused"],
    ["subscription.cancelled", "canceled"],
    ["subscription.expired", "canceled"],
  ])("%s drops the plan to Free", async (type, status) => {
    const user = await tracked({ trialEndsAt: 5, planRenewsAt: 9, planPeriodEndsAt: 9 });
    const body = event(type, { cancelled_at: dodoTime(TEST_DATES.monthEnd) });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "free",
      planStatus: status,
      planInterval: null,
      planRenewsAt: null,
      trialEndsAt: null,
      planPeriodEndsAt: null,
    });
  });

  it("unpaused brings the paid plan back", async () => {
    const user = await tracked({ plan: "free", planInterval: null, planStatus: "paused" });
    expect(await deliver(event("subscription.unpaused"))).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "active" });
  });

  it("ignores pending, failed and statuses Dodo may add later, without recording them", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    for (const [type, status] of [
      ["subscription.updated", "pending"],
      ["subscription.failed", "failed"],
      ["subscription.updated", "something_new"],
    ] as const) {
      const body = event(type, { status, metadata: { user_id: user.id } });
      expect(await deliver(body)).toEqual(IGNORED);
    }
    expect((await reload(user.id))?.plan).toBe("free");
    expect(await recordedEvents()).toEqual([]);
    const warned = logged("warn", "billing.webhook_ignored");
    expect(warned).toContain("dodo:something_new");
    expect(warned).not.toContain("dodo:pending");
    expect(warned).not.toContain("dodo:failed");
    expect(logged("info", "billing.webhook_ignored")).toContain("dodo:pending");
  });

  it("follows a plan change from Pro to Max yearly", async () => {
    const user = await createUser();
    const bought = event("subscription.active", { metadata: { user_id: user.id } }, 1_000);
    expect(await deliver(bought)).toEqual(APPLIED);
    const upgraded = event(
      "subscription.plan_changed",
      { product_id: MAX_YEAR, next_billing_date: dodoTime(TEST_DATES.yearEnd) },
      2_000,
    );
    expect(await deliver(upgraded)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "max",
      planInterval: "year",
      planRenewsAt: TEST_DATES.yearEnd,
    });
  });

  it.each([0, 3])(
    "follows a trial moved to Max in place: Max at once, the trial over, written down as paid (trial_period_days %i)",
    async (trialDays) => {
      const user = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
      const changedAt = TEST_DATES.start + DAY_MS;
      const body = event("subscription.plan_changed", {
        product_id: MAX_YEAR,
        trial_period_days: trialDays,
        created_at: dodoTime(TEST_DATES.start),
        previous_billing_date: dodoTime(changedAt),
        next_billing_date: dodoTime(changedAt + 365 * DAY_MS),
      });
      expect(await deliver(body)).toEqual(APPLIED);
      expect(await reload(user.id)).toMatchObject({
        plan: "max",
        planInterval: "year",
        planStatus: "active",
        trialEndsAt: null,
        planPeriodStartsAt: changedAt,
        planRenewsAt: changedAt + 365 * DAY_MS,
        billingSubscriptionId: SUB,
      });
      const [seen] = await trialRows();
      expect(seen?.kind).toBe("paid");
      expect(await replacementRows()).toEqual([]);
    },
  );

  it("never lets another product, or someone else's subscription, take a paid plan away", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await tracked();
    const other = event("subscription.active", {
      subscription_id: sub("ebook"),
      product_id: dodoId("pdt", "ebook"),
    });
    expect(await deliver(other)).toEqual(IGNORED);
    const stale = event("subscription.cancelled", { subscription_id: sub("old") });
    expect(await deliver(stale)).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", billingSubscriptionId: SUB });
  });

  it("keeps the paid plan when the tracked subscription moves to a product we don't list", async () => {
    const user = await tracked({ plan: "max", planInterval: "year" });
    const body = event("subscription.plan_changed", { product_id: dodoId("pdt", "legacy") });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "max", planInterval: "year" });
  });

  it("ignores events it doesn't use", async () => {
    await tracked();
    for (const type of [
      "customer.created",
      "license_key.created",
      "dunning.started",
      "subscription.created",
      "payment.processing",
    ]) {
      expect(await deliver(event(type))).toEqual(IGNORED);
    }
    expect(await recordedEvents()).toEqual([]);
  });

  it("warns when a trial-product subscription isn't seen as a trial in its first days, and still applies it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    const created = Date.now() - DAY_MS;
    const missed = event("subscription.active", {
      product_id: PRO_TRIAL,
      trial_period_days: 0,
      created_at: dodoTime(created),
      previous_billing_date: dodoTime(created),
      next_billing_date: dodoTime(created + 30 * DAY_MS),
      metadata: { user_id: user.id },
    });
    expect(await deliver(missed, withId(missed, "msg_missed"))).toEqual(APPLIED);
    expect(await deliver(missed, withId(missed, "msg_missed"))).toEqual(DUPLICATE);
    expect((await reload(user.id))?.planStatus).toBe("active");
    expect(logged("warn", "billing.trial_not_detected")).toContain(SUB);

    const trialist = await tracked({ email: "t@example.com", billingSubscriptionId: sub("t") });
    const started = Date.now() - HOUR_MS;
    const recentTrial = {
      trial_period_days: 3,
      created_at: dodoTime(started),
      previous_billing_date: dodoTime(started),
      next_billing_date: dodoTime(started + 3 * DAY_MS),
    };
    for (const dates of [recentTrial, AFTER_TRIAL]) {
      const body = event("subscription.updated", {
        subscription_id: sub("t"),
        product_id: PRO_TRIAL,
        ...dates,
      });
      expect(await deliver(body)).toEqual(APPLIED);
    }
    expect((await reload(trialist.id))?.planStatus).toBe("active");
    expect(loggedCount("warn", "billing.trial_not_detected")).toBe(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain("ada@example.com");
  });
});

describe("finding the user", () => {
  it("won't take a user_id that isn't a uuid, nor let an unsigned new subscription in by customer id", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser({ billingCustomerId: CUS });
    const body = event("subscription.active", { metadata: { user_id: "1 or 1=1" } });
    expect(await deliver(body)).toEqual(IGNORED);
    expect(await reload(user.id)).toMatchObject({ plan: "free", billingSubscriptionId: null });
  });

  it("reads the customer's email only for an unmatched paid status, and an email match alone grants nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await createUser({ email: "maya@example.com" });
    const customerEmail = vi.fn(async () => "  Maya@Example.com ");
    const config = { ...CONFIG, customerEmail };
    const paid = event("subscription.active", {
      subscription_id: sub(9),
      customer: { customer_id: cus(9) },
    });
    expect(await deliver(paid, undefined, config)).toEqual(IGNORED);
    expect(customerEmail).toHaveBeenCalledExactlyOnceWith(cus(9));
    expect(await reload(user.id)).toMatchObject({ plan: "free", billingCustomerId: null });

    const ended = event("subscription.cancelled", { subscription_id: sub("x") });
    expect(await deliver(ended, undefined, config)).toEqual(IGNORED);
    expect(customerEmail).toHaveBeenCalledTimes(1);
  });

  it("asks for a retry when the email can't be read, and records nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await createUser();
    const config = {
      ...CONFIG,
      customerEmail: vi.fn(async () => Promise.reject(new Error("timeout"))),
    };
    const body = event("subscription.active", {
      subscription_id: sub(9),
      customer: { customer_id: cus(9) },
    });
    expect(await deliver(body, undefined, config)).toEqual({ status: 500, message: "retry" });
    expect(await recordedEvents()).toEqual([]);
  });

  it("ignores a subscription it can't match to anyone, as a dashboard test event's is", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await createUser();
    const body = event("subscription.active", {
      subscription_id: sub("simulated"),
      customer: { customer_id: cus("simulated") },
      product_id: dodoId("pdt", "simulated"),
    });
    expect(await deliver(body)).toEqual(IGNORED);
    const unknownPaid = event("subscription.active", {
      subscription_id: sub(9),
      customer: { customer_id: cus(9) },
    });
    expect(await deliver(unknownPaid)).toEqual(IGNORED);
  });
});

describe("signed metadata", () => {
  const attacker = {
    subscription_id: sub("attacker"),
    customer: { customer_id: cus("attacker") },
  };

  it("ignores a user_id without our signature, as a payment link's metadata would carry, so it grants nobody anything", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const victim = await createUser();
    const forgeries: Record<string, unknown>[] = [
      { user_id: victim.id, user_sig: undefined },
      { user_id: victim.id, user_sig: "0".repeat(64) },
      { user_id: victim.id, user_sig: signBillingId(victim.id, "someone_elses_secret") },
      { user_id: victim.id, user_sig: signBillingId(victim.id, SECRET) },
      { user_id: victim.id, user_sig: signBillingId(crypto.randomUUID(), SIGNING) },
      { user_id: victim.id, user_sig: signBillingId(victim.id, SIGNING).toUpperCase() },
      { user_id: victim.id, user_sig: 42 },
    ];
    for (const [index, metadata] of forgeries.entries()) {
      const body = event("subscription.active", { ...attacker, product_id: MAX_YEAR, metadata });
      expect(await deliver(body, withId(body, `msg_forged_${index}`))).toEqual(IGNORED);
    }
    expect(await reload(victim.id)).toEqual(victim);
    expect(await recordedEvents()).toEqual([]);
    const unsigned = logged("warn", "billing.unsigned_custom_data");
    for (const index of forgeries.keys()) expect(unsigned).toContain(`msg_forged_${index}`);
    expect(unsigned).toContain("user_id");
    expect(logged("warn")).not.toContain(victim.email);
  });

  it("won't let a forged user_id move a paying user's plan or tracking, or end it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const victim = await tracked();
    const forged = { user_id: victim.id, user_sig: undefined };
    for (const fields of [
      { ...attacker, product_id: MAX_YEAR, metadata: forged },
      { ...attacker, product_id: PRO_TRIAL, ...ON_TRIAL, metadata: forged },
      { ...attacker, status: "cancelled", metadata: forged },
    ]) {
      expect(await deliver(event("subscription.updated", fields))).toEqual(IGNORED);
    }
    expect(await reload(victim.id)).toEqual(victim);
    expect(cancel).not.toHaveBeenCalled();
  });

  it("follows the stored subscription for an unsigned user_id, but a new subscription by customer id alone grants nothing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const named = await createUser({ email: "named@example.com" });
    const bySubscription = await createUser({
      email: "sub@example.com",
      billingSubscriptionId: sub("known"),
    });
    const byCustomer = await createUser({
      email: "cus@example.com",
      billingCustomerId: cus("known"),
    });
    const unsigned = { user_id: named.id, user_sig: undefined };
    const first = event("subscription.active", {
      subscription_id: sub("known"),
      metadata: unsigned,
    });
    expect(await deliver(first)).toEqual(APPLIED);
    const second = event("subscription.active", {
      subscription_id: sub("other"),
      customer: { customer_id: cus("known") },
      metadata: unsigned,
    });
    expect(await deliver(second)).toEqual(IGNORED);
    expect((await reload(bySubscription.id))?.plan).toBe("pro");
    expect(await reload(byCustomer.id)).toMatchObject({
      plan: "free",
      billingSubscriptionId: null,
    });
    expect((await reload(named.id))?.plan).toBe("free");
    expect(logged("error", "billing.unsigned_subscription")).toContain(sub("other"));
  });

  it("logs nothing when metadata carries no ids", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await tracked();
    expect(await deliver(event("subscription.updated", { metadata: null }))).toEqual(APPLIED);
    expect(await deliver(event("subscription.updated", { metadata: {} }))).toEqual(APPLIED);
    expect(warn).not.toHaveBeenCalled();
  });

  it("credits a checkout only to a signed user_id", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const victim = await createUser();
    const body = paymentEvent("payment.succeeded", {
      subscription_id: sub(9),
      customer: { customer_id: cus(9) },
      metadata: {
        user_id: victim.id,
        user_sig: "f".repeat(64),
        plan: "max",
        interval: "year",
        trial: "false",
      },
    });
    expect(await deliver(body)).toEqual(IGNORED);
    expect(captured).not.toHaveBeenCalled();
    expect(logged("warn", "billing.unsigned_custom_data")).toContain(PAY);
  });
});

describe("checkout_completed analytics", () => {
  const choice = (extra: Record<string, unknown> = {}) => ({
    plan: "max",
    interval: "year",
    trial: "false",
    ...extra,
  });

  it("fires once for the payment that started a subscription, however often it's delivered", async () => {
    const user = await createUser();
    const body = paymentEvent("payment.succeeded", {
      total_amount: 25_520,
      tax: 2_320,
      metadata: { user_id: user.id, ...choice() },
    });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(captured).toHaveBeenCalledExactlyOnceWith(
      user.id,
      "checkout_completed",
      { plan: "max", trial: false, usd: 232 },
      { set: { plan: "max" } },
    );
    expect(await deliver(body)).toEqual(DUPLICATE);
    const replayed = paymentEvent("payment.succeeded", {
      payment_id: dodoId("pay", "replayed"),
      metadata: { user_id: user.id, ...choice() },
    });
    expect(await deliver(replayed)).toEqual(DUPLICATE);
    expect(captured).toHaveBeenCalledTimes(1);
    expect((await recordedEvents()).map((row) => row.id)).toEqual([`checkout:${SUB}`]);
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("says when the checkout started a trial, as a string or a boolean", async () => {
    const user = await tracked({ plan: "free", planInterval: null, planStatus: null });
    const byStored = paymentEvent("payment.succeeded", {
      metadata: choice({ plan: "pro", interval: "month", trial: "true" }),
    });
    expect(await deliver(byStored)).toEqual(APPLIED);
    const bySigned = paymentEvent("payment.succeeded", {
      subscription_id: sub(2),
      metadata: { user_id: user.id, ...choice({ plan: "pro", interval: "month", trial: true }) },
    });
    expect(await deliver(bySigned)).toEqual(APPLIED);
    const trial = { plan: "pro", trial: true, usd: 1 };
    expect(captured.mock.calls).toEqual([
      [user.id, "checkout_completed", trial, { set: { plan: "pro" } }],
      [user.id, "checkout_completed", trial, { set: { plan: "pro" } }],
    ]);
  });

  it("ignores renewals, other products, payments without a subscription and strangers", async () => {
    const user = await createUser();
    const mine = { user_id: user.id, ...choice() };
    const ignoredBodies = [
      paymentEvent("payment.succeeded", { charge_type: "renewal", metadata: mine }),
      paymentEvent("payment.succeeded", { charge_type: "on_demand", metadata: mine }),
      paymentEvent("payment.succeeded", { charge_type: null, metadata: mine }),
      paymentEvent("payment.succeeded", { metadata: { ...mine, plan: "ebook" } }),
      paymentEvent("payment.succeeded", { metadata: { ...mine, interval: "week" } }),
      paymentEvent("payment.succeeded", { metadata: { user_id: user.id } }),
      paymentEvent("payment.succeeded", { subscription_id: null, metadata: mine }),
      paymentEvent("payment.succeeded", {
        subscription_id: sub(9),
        customer: { customer_id: cus(9) },
        metadata: choice(),
      }),
      paymentEvent("payment.processing", { metadata: mine }),
    ];
    for (const body of ignoredBodies) expect(await deliver(body)).toEqual(IGNORED);
    expect(captured).not.toHaveBeenCalled();
    expect(await recordedEvents()).toEqual([]);
  });

  it("is never fired by subscription events, which only set the person's plan", async () => {
    const user = await createUser();
    const body = event("subscription.active", { metadata: { user_id: user.id, ...choice() } });
    expect(await deliver(body)).toEqual(APPLIED);
    expect(captured.mock.calls).toEqual([[user.id, "$set", {}, { set: { plan: "pro" } }]]);
  });
});

describe("published portfolios", () => {
  it("refresh when the plan crosses between paid and Free, and only then", async () => {
    const user = await createUser();
    await deliver(event("subscription.active", { metadata: { user_id: user.id } }, 1_000));
    expect(refreshed).toHaveBeenCalledTimes(1);
    await deliver(event("subscription.plan_changed", { product_id: MAX_YEAR }, 2_000));
    expect(refreshed).toHaveBeenCalledTimes(1);
    await deliver(event("subscription.cancelled", {}, 3_000));
    expect(refreshed).toHaveBeenCalledTimes(2);
  });
});

describe("a declined plan-change charge", () => {
  it("is logged once with its ids and changes no plan; other failed payments aren't logged", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await tracked();
    const declined = paymentEvent("payment.failed", { charge_type: "plan_change" });
    expect(await deliver(declined, withId(declined, "msg_declined"))).toEqual(APPLIED);
    expect(await deliver(declined, withId(declined, "msg_declined"))).toEqual(DUPLICATE);
    for (const chargeType of ["renewal", "new"]) {
      const other = paymentEvent("payment.failed", { charge_type: chargeType });
      expect(await deliver(other, withId(other, `msg_${chargeType}`))).toEqual(APPLIED);
    }
    expect(await reload(user.id)).toEqual(user);
    expect(loggedCount("warn", "billing.plan_change_payment_failed")).toBe(1);
    const text = logged("warn", "billing.plan_change_payment_failed");
    for (const value of ["msg_declined", PAY, SUB]) expect(text).toContain(value);
    expect(text).not.toContain("ada@example.com");
    expect((await recordedEvents()).map((row) => row.id).sort()).toEqual([
      "msg_declined",
      "msg_new",
      "msg_renewal",
    ]);
  });

  it("is still logged when no account matches it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const declined = paymentEvent("payment.failed", { charge_type: "plan_change" });
    expect(await deliver(declined)).toEqual(APPLIED);
    expect(loggedCount("warn", "billing.plan_change_payment_failed")).toBe(1);
    expect(captured).not.toHaveBeenCalled();
  });
});

describe("one trial per person", () => {
  const SUB2 = sub(2);
  const CUS2 = cus(2);

  beforeEach(() => {
    vi.stubEnv("DODO_API_KEY", "dodo_test_apikey");
    resetEnvForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvForTests();
  });

  async function hadTrial(email: string) {
    await addTrialHistory({ emailHash: emailFingerprint(email), kind: "trial", createdAt: 1 });
  }

  async function pendingCancels() {
    return replacementRows();
  }

  const trialOf = (user: Row, fields: SubscriptionFields = {}): SubscriptionFields => ({
    subscription_id: SUB2,
    customer: { customer_id: CUS2 },
    product_id: PRO_TRIAL,
    ...ON_TRIAL,
    metadata: { user_id: user.id },
    ...fields,
  });

  const trialCharge = (user: Row | null, paymentId = PAY_TRIAL) =>
    paymentEvent("payment.succeeded", {
      payment_id: paymentId,
      subscription_id: SUB2,
      customer: { customer_id: CUS2 },
      metadata: {
        ...(user ? { user_id: user.id } : {}),
        plan: "pro",
        interval: "month",
        trial: "true",
      },
    });

  it("cancels a second trial by the same user at once, refunds its charge, and grants and records nothing on them", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await createUser({
      planStatus: "canceled",
      billingCustomerId: CUS,
      billingSubscriptionId: SUB,
    });
    await hadTrial(user.email);
    const body = event("subscription.active", trialOf(user));
    expect(await deliver(body, withId(body, "msg_again"))).toEqual(IGNORED);
    expect(await reload(user.id)).toEqual(user);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
    expect(await pendingCancels()).toMatchObject([
      { replacedSubscriptionId: SUB2, userId: user.id, cancelledAt: expect.any(Number) },
    ]);
    // A paid trial's charge goes back in full when the trial is refused.
    expect(payments).toHaveBeenCalledExactlyOnceWith(SUB2);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
    expect((await recordedEvents()).map((row) => row.id)).toContain(`refund:${PAY_TRIAL}`);
    const reused = logged("warn", "billing.trial_reused");
    for (const id of ["msg_again", user.id, SUB2]) expect(reused).toContain(id);
    expect(logged("warn")).not.toContain(user.email);

    for (const [type, dates] of [
      ["subscription.updated", ON_TRIAL],
      ["subscription.renewed", AFTER_TRIAL],
      ["subscription.cancelled", ON_TRIAL],
    ] as const) {
      expect(await deliver(event(type, trialOf(user, dates)))).toEqual(IGNORED);
    }
    expect(await reload(user.id)).toEqual(user);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels a trial by an email that already had one, even on a new account", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await createUser({ email: "maya@example.com" });
    await hadTrial(" Maya@Example.com");
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(await reload(user.id)).toEqual(user);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
  });

  it("cancels a second trial checkout by someone already paying, and keeps their plan", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await tracked();
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(await reload(user.id)).toEqual(user);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
    expect(error).not.toHaveBeenCalled();
  });

  it("still refuses a second trial when its refund fails, logs it, and lets a later payment.succeeded refund it", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    refund.mockRejectedValueOnce(new BillingError("refused", "Dodo refused the refund request"));
    const user = await createUser();
    await hadTrial(user.email);
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
    expect(error.mock.calls.flat().join(" ")).toContain("billing.reused_trial_refund_failed");
    expect(await deliver(trialCharge(null))).toEqual(IGNORED);
    expect(refund.mock.calls).toEqual([[PAY_TRIAL], [PAY_TRIAL]]);
  });

  it("refunds a refused trial's charge that succeeds after the cancel, once however often it's delivered", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    payments.mockResolvedValue([]);
    const user = await createUser();
    await hadTrial(user.email);
    await deliver(event("subscription.active", trialOf(user)));
    expect(refund).not.toHaveBeenCalled();
    const late = dodoId("pay", "late");
    expect(await deliver(trialCharge(user, late))).toEqual(IGNORED);
    expect(await deliver(trialCharge(user, late))).toEqual(IGNORED);
    expect(refund).toHaveBeenCalledExactlyOnceWith(late);
    expect(captured).not.toHaveBeenCalled();
  });

  it("refunds exactly once when payment.succeeded comes before the subscription", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await createUser();
    await hadTrial(user.email);
    expect(await deliver(trialCharge(user))).toEqual(APPLIED);
    expect(refund).not.toHaveBeenCalled();
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
    expect(await deliver(trialCharge(user))).toEqual(IGNORED);
    expect(refund).toHaveBeenCalledTimes(1);
  });

  it("keeps the claim when Dodo says the charge was already refunded", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    refund.mockResolvedValueOnce("already_refunded");
    const user = await createUser();
    await hadTrial(user.email);
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(await deliver(trialCharge(user))).toEqual(IGNORED);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
  });

  it("also refuses a trial that went past_due unpaid inside its window, or has a cancel scheduled", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await createUser();
    await hadTrial(user.email);
    expect(await deliver(event("subscription.past_due", trialOf(user)))).toEqual(IGNORED);
    const cancelling = trialOf(user, {
      subscription_id: sub(3),
      cancel_at_next_billing_date: true,
    });
    expect(await deliver(event("subscription.updated", cancelling))).toEqual(IGNORED);
    expect(await reload(user.id)).toEqual(user);
    expect(cancel.mock.calls.map(([id]) => id)).toEqual([SUB2, sub(3)]);
  });

  it("keeps a trial-product subscription that was paid for and only later fell past_due", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser({
      planStatus: "canceled",
      billingCustomerId: CUS,
      billingSubscriptionId: SUB,
    });
    await hadTrial(user.email);
    const renewalFailed = trialOf(user, AFTER_TRIAL);
    expect(await deliver(event("subscription.past_due", renewalFailed))).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "past_due",
      billingSubscriptionId: SUB2,
    });
    expect(cancel).not.toHaveBeenCalled();
    expect(await pendingCancels()).toEqual([]);
  });

  it("still lets a past_due paid product through for someone who once trialed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    await hadTrial(user.email);
    const overdue = trialOf(user, {
      product_id: PRO_MONTH,
      trial_period_days: 0,
      next_billing_date: dodoTime(TEST_DATES.monthEnd),
    });
    expect(await deliver(event("subscription.past_due", overdue))).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "pro", planStatus: "past_due" });
    expect(cancel).not.toHaveBeenCalled();
  });

  it("lets one first trial through when its events arrive together, and its failed first charge stays its own", async () => {
    const user = await createUser();
    const at = TEST_DATES.start;
    const trial = trialOf(user, { subscription_id: SUB, customer: { customer_id: CUS } });
    const results = await Promise.all([
      deliver(event("subscription.active", trial, at)),
      deliver(event("subscription.updated", trial, at)),
    ]);
    expect(results).toEqual([APPLIED, APPLIED]);
    expect(await reload(user.id)).toMatchObject({
      plan: "pro",
      planStatus: "trialing",
      billingSubscriptionId: SUB,
    });

    expect(await deliver(event("subscription.past_due", trial))).toEqual(APPLIED);
    expect((await reload(user.id))?.planStatus).toBe("past_due");
    expect(cancel).not.toHaveBeenCalled();
    expect(await pendingCancels()).toEqual([]);
  });

  it("answers 200 when the cancel fails, and leaves the cancel and refund to the daily retry", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const user = await createUser();
    await hadTrial(user.email);
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(await pendingCancels()).toMatchObject([{ attempts: 1, cancelledAt: null }]);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.replace_cancel_failed");
    expect(refund).not.toHaveBeenCalled();

    const now = Date.now();
    expect(await retryPendingReplacements({ now, deadline: now + 30_000, limit: 10 })).toBe(1);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(await pendingCancels()).toMatchObject([{ attempts: 2, cancelledAt: now }]);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
    expect((await reload(user.id))?.plan).toBe("free");
  });

  it("answers 200 even when the cancel throws something unexpected", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await createUser();
    await hadTrial(user.email);
    cancel.mockRejectedValueOnce(new Error("socket hang up"));
    expect(await deliver(event("subscription.active", trialOf(user)))).toEqual(IGNORED);
    expect(JSON.stringify(error.mock.calls)).toContain("billing.replace_cancel_failed");
    expect(await pendingCancels()).toMatchObject([{ cancelledAt: null }]);
  });
});

describe("a subscription signed for a deleted account", () => {
  const SUB2 = sub(2);
  const CUS2 = cus(2);
  const deleted = "6f1c2b9e-3d4a-4e5f-8a7b-9c0d1e2f3a4b";
  let current: SubscriptionFields = {};

  const orphan = (fields: SubscriptionFields = {}): SubscriptionFields => ({
    subscription_id: SUB2,
    customer: { customer_id: CUS2 },
    product_id: PRO_TRIAL,
    ...ON_TRIAL,
    metadata: { user_id: deleted },
    ...fields,
  });
  const charge = (paymentId: string) =>
    paymentEvent("payment.succeeded", {
      payment_id: paymentId,
      subscription_id: SUB2,
      customer: { customer_id: CUS2 },
      charge_type: "renewal",
      metadata: { user_id: deleted },
    });
  const marked = async () =>
    (await recordedEvents()).map((row) => row.id).filter((id) => id.startsWith("orphan:"));
  const queued = async () => replacementRows();

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DODO_API_KEY", "dodo_test_apikey");
    resetEnvForTests();
    current = {};
    lookup.mockReset();
    // Dodo's own state: active until a cancel goes through.
    lookup.mockImplementation(async () =>
      DodoSubscriptionSchema.parse(subscriptionPayload("subscription.active", orphan(current))),
    );
    cancel.mockImplementation(async () => {
      current = { status: "cancelled" };
      return "cancelled";
    });
    for (const level of ["info", "warn", "error"] as const) {
      vi.spyOn(console, level).mockImplementation(() => undefined);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvForTests();
  });

  it("is cancelled at once and its charge refunded, once however often its events come", async () => {
    const body = event("subscription.active", orphan());
    expect(await deliver(body, withId(body, "msg_orphan"))).toEqual(IGNORED);
    expect(lookup).toHaveBeenCalledExactlyOnceWith(SUB2);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
    expect(payments).toHaveBeenCalledExactlyOnceWith(SUB2);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
    expect(await marked()).toEqual([`orphan:${SUB2}`]);
    const flagged = logged("error", "billing.orphan_subscription_cancelled");
    for (const id of ["msg_orphan", deleted, SUB2]) expect(flagged).toContain(id);
    for (const level of ["info", "warn", "error"] as const) {
      expect(logged(level)).not.toContain("ada@example.com");
    }

    expect(await deliver(body, withId(body, "msg_orphan"))).toEqual(IGNORED);
    expect(await deliver(event("subscription.renewed", orphan(AFTER_TRIAL)))).toEqual(IGNORED);
    expect(await deliver(charge(PAY_TRIAL))).toEqual(IGNORED);
    const late = dodoId("pay", "late");
    expect(await deliver(charge(late))).toEqual(IGNORED);
    expect(await deliver(charge(late))).toEqual(IGNORED);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(refund.mock.calls).toEqual([[PAY_TRIAL], [late]]);
    expect(loggedCount("error", "billing.orphan_subscription_cancelled")).toBe(1);
    expect(await (await getDb()).select().from(users)).toEqual([]);
    expect(await queued()).toEqual([]);
  });

  it("is cancelled when it is on hold too, and Dodo's redelivery retries a cancel that failed", async () => {
    current = { status: "on_hold" };
    cancel.mockRejectedValueOnce(new BillingError("provider_error", "Dodo is down"));
    const body = event("subscription.on_hold", orphan());
    expect(await deliver(body, withId(body, "msg_hold"))).toEqual({
      status: 500,
      message: "retry",
    });
    expect(logged("error", "billing.orphan_cancel_failed")).toContain(SUB2);
    expect(refund).not.toHaveBeenCalled();

    expect(await deliver(body, withId(body, "msg_hold"))).toEqual(IGNORED);
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(refund).toHaveBeenCalledExactlyOnceWith(PAY_TRIAL);
  });

  it("keeps its charges when Dodo says it already ended or is set to end, as after the deletion's own cancel", async () => {
    for (const fields of [{ status: "cancelled" }, { cancel_at_next_billing_date: true }]) {
      current = fields;
      expect(await deliver(event("subscription.updated", orphan()))).toEqual(IGNORED);
    }
    expect(await deliver(charge(dodoId("pay", "earlier")))).toEqual(IGNORED);
    expect(cancel).not.toHaveBeenCalled();
    expect(payments).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
    expect(await marked()).toEqual([]);
    expect(loggedCount("error", "billing.orphan_subscription_cancelled")).toBe(0);
  });

  it("asks for a retry, writing nothing, when Dodo can't say whether it can still charge", async () => {
    lookup.mockRejectedValueOnce(new BillingError("provider_error", "Dodo lookup failed"));
    const body = event("subscription.active", orphan());
    expect(await deliver(body, withId(body, "msg_retry"))).toEqual({
      status: 500,
      message: "retry",
    });
    expect(await marked()).toEqual([]);
    expect(cancel).not.toHaveBeenCalled();
    expect(await deliver(body, withId(body, "msg_retry"))).toEqual(IGNORED);
    expect(cancel).toHaveBeenCalledExactlyOnceWith(SUB2, { immediately: true });
  });

  it("does nothing but log for an unsigned or forged user_id, or one that is pending, failed or ended", async () => {
    const ignored = [
      orphan({ metadata: { user_id: deleted, user_sig: undefined } }),
      orphan({ metadata: { user_id: deleted, user_sig: "0".repeat(64) } }),
      orphan({ metadata: { user_id: deleted, user_sig: signBillingId(deleted, OTHER_SECRET) } }),
      orphan({ status: "pending" }),
      orphan({ status: "failed" }),
      orphan({ status: "cancelled" }),
      orphan({ status: "expired" }),
    ];
    for (const fields of ignored) {
      expect(await deliver(event("subscription.updated", fields))).toEqual(IGNORED);
    }
    expect(lookup).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
    expect(await marked()).toEqual([]);
    expect(loggedCount("error", "billing.orphan_subscription_cancelled")).toBe(0);
    expect(logged("warn", "billing.unsigned_custom_data")).toContain("user_id");
  });

  it("is only logged outside production, where another database may share the signing secret", async () => {
    vi.stubEnv("NODE_ENV", "test");
    resetEnvForTests();
    expect(await deliver(event("subscription.active", orphan()))).toEqual(IGNORED);
    expect(await deliver(charge(PAY_TRIAL))).toEqual(IGNORED);
    expect(lookup).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
    expect(await marked()).toEqual([]);
    expect(loggedCount("error", "billing.orphan_subscription_cancelled")).toBe(0);
    expect(logged("warn", "billing.webhook_ignored")).toContain("no_user");
  });
});

describe("a second live subscription", () => {
  it("is logged as an error when a paid grant takes over from a live one, and still applies", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = await tracked();
    const second = event("subscription.active", {
      subscription_id: sub(2),
      product_id: MAX_YEAR,
      metadata: { user_id: user.id },
    });
    expect(await deliver(second)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "max", billingSubscriptionId: sub(2) });
    const entry = logged("error", "billing.second_live_subscription");
    for (const id of [user.id, SUB, sub(2)]) expect(entry).toContain(id);
    expect(logged("error")).not.toContain(user.email);
  });

  it("isn't logged for the tracked subscription itself, or after the tracked one ended", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await tracked();
    expect(await deliver(event("subscription.plan_changed", { product_id: MAX_YEAR }))).toEqual(
      APPLIED,
    );
    const ended = await tracked({
      email: "ended@example.com",
      plan: "free",
      planStatus: "canceled",
      billingCustomerId: cus("old"),
      billingSubscriptionId: sub("old"),
    });
    const fresh = event("subscription.active", {
      subscription_id: sub("new"),
      customer: { customer_id: cus("old") },
      metadata: { user_id: ended.id },
    });
    expect(await deliver(fresh)).toEqual(APPLIED);
    expect(error).not.toHaveBeenCalled();
  });
});

describe("refunds and disputes", () => {
  it("logs each refund and dispute with its ids once, and changes no plan", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await tracked();
    const refunded = refundEvent("refund.succeeded", { payment_id: dodoId("pay", 7) });
    expect(await deliver(refunded, withId(refunded, "msg_refund_1"))).toEqual(APPLIED);
    expect(await deliver(refunded, withId(refunded, "msg_refund_1"))).toEqual(DUPLICATE);
    const failed = refundEvent("refund.failed", {
      refund_id: dodoId("ref", 2),
      is_partial: true,
      amount: 50,
    });
    expect(await deliver(failed, withId(failed, "msg_refund_2"))).toEqual(APPLIED);
    const opened = disputeEvent("dispute.opened");
    expect(await deliver(opened, withId(opened, "msg_dispute_1"))).toEqual(APPLIED);
    const lost = disputeEvent("dispute.lost", { is_resolved_by_rdr: true });
    expect(await deliver(lost, withId(lost, "msg_dispute_2"))).toEqual(APPLIED);

    expect(await reload(user.id)).toEqual(user);
    expect((await recordedEvents()).map((row) => row.id).sort()).toEqual([
      `dispute_lost:${DODO_TEST_IDS.dispute}`,
      "msg_dispute_1",
      "msg_dispute_2",
      "msg_refund_1",
      "msg_refund_2",
    ]);
    expect(
      warn.mock.calls.filter(([line]) => String(line).includes("billing.adjustment")),
    ).toHaveLength(4);
    const text = logged("warn", "billing.adjustment");
    for (const value of [
      DODO_TEST_IDS.refund,
      dodoId("ref", 2),
      dodoId("pay", 7),
      DODO_TEST_IDS.dispute,
      DODO_TEST_IDS.payment,
      "dispute_opened",
      "dispute_lost",
      '"rdr":true',
      '"partial":true',
      "succeeded",
      "failed",
    ]) {
      expect(text).toContain(value);
    }
    expect(text).not.toContain("ada@example.com");
  });

  it("asks for a retry for a refund or dispute it can't read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await deliver(rawEvent("refund.succeeded", { refund_id: 7 }))).toEqual(MALFORMED);
    const noAmount = rawEvent("dispute.opened", {
      dispute_id: DODO_TEST_IDS.dispute,
      payment_id: PAY,
    });
    expect(await deliver(noAmount)).toEqual(MALFORMED);
    expect(await recordedEvents()).toEqual([]);
  });

  it("moves the user to Free when Dodo cancels the subscription after a dispute", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await tracked();
    expect(await deliver(disputeEvent("dispute.opened"))).toEqual(APPLIED);
    expect((await reload(user.id))?.plan).toBe("pro");
    const cancelled = event("subscription.cancelled", {
      cancelled_by: null,
      cancelled_at: dodoTime(Date.now()),
    });
    expect(await deliver(cancelled)).toEqual(APPLIED);
    expect(await reload(user.id)).toMatchObject({ plan: "free", planStatus: "canceled" });
  });
});
