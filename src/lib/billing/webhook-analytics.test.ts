import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { getDb } from "@/db/client";
import { billingLog, users } from "@/db/schema";
import { insertUserRow, resetDb } from "@/lib/auth/test-helpers";
import { DAY_MS } from "@/lib/time";
import { dodoId } from "./dodo-testing";
import {
  AFTER_TRIAL,
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_IDS,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  TEST_DATES,
  disputeEvent,
  dodoTime,
  paymentEvent,
  refundEvent,
  standardWebhookHeaders,
  subscriptionEvent,
  type PaymentFields,
  type SubscriptionFields,
} from "./dodo-webhook-testing";
import { processWebhook, type WebhookConfig } from "./webhook";

// The real captureServerEvent, with PostHog's SDK faked: these are the events as they'd be sent.
const sdk = vi.hoisted(() => ({
  constructed: vi.fn(),
  captureImmediate: vi.fn<(message: unknown) => Promise<void>>(async () => {}),
}));
const posthog = vi.hoisted(() => ({ key: "phc_test" as string | undefined }));
const scheduled = vi.hoisted(() => ({ tasks: [] as Array<() => Promise<void>> }));

vi.mock("posthog-node", () => ({
  PostHog: class {
    constructor(key: string) {
      sdk.constructed(key);
    }
    captureImmediate = sdk.captureImmediate;
  },
}));
vi.mock("@/lib/analytics/config", () => ({
  posthogKey: () => posthog.key,
  posthogServerHost: () => "https://us.i.posthog.com",
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => Promise<void>) => {
    scheduled.tasks.push(task);
  },
}));
vi.mock("@/lib/portfolio/cache", () => ({ refreshPortfolioPages: vi.fn() }));

const {
  proMonth: PRO_MONTH,
  proTrial: PRO_TRIAL,
  maxMonth: MAX_MONTH,
  maxYear: MAX_YEAR,
} = DODO_TEST_PRODUCTS;
const CUS = DODO_TEST_IDS.customer;
const SUB = DODO_TEST_IDS.subscription;
const PAY = DODO_TEST_IDS.payment;

const PRODUCTS: Record<string, { plan: PaidPlanId; interval: BillingInterval }> = {
  [PRO_MONTH]: { plan: "pro", interval: "month" },
  [PRO_TRIAL]: { plan: "pro", interval: "month" },
  [MAX_MONTH]: { plan: "max", interval: "month" },
  [MAX_YEAR]: { plan: "max", interval: "year" },
};

const CONFIG: WebhookConfig = {
  secret: DODO_WEBHOOK_TEST_SECRET,
  signingSecret: BILLING_TEST_SIGNING_SECRET,
  productIds: Object.keys(PRODUCTS),
  planForProduct: (id) => PRODUCTS[id] ?? null,
  trialProductId: PRO_TRIAL,
};

const APPLIED = { status: 200, message: "applied" };
const IGNORED = { status: 200, message: "ignored" };
const DUPLICATE = { status: 200, message: "duplicate" };

type Sent = { distinctId: string; event: string; properties: Record<string, unknown> };

let delivery = 0;

// Delivered twice under one webhook-id, as Dodo retries it: the second must change and send nothing.
async function deliverTwice(body: string) {
  const headers = standardWebhookHeaders(body, DODO_WEBHOOK_TEST_SECRET, {
    id: `msg_analytics_${++delivery}`,
  });
  const first = await processWebhook(body, headers, CONFIG);
  const retried = await processWebhook(body, headers, CONFIG);
  // An event recorded the first time is a duplicate; one ignored unrecorded is ignored again.
  expect(retried).toEqual(first.message === "applied" ? DUPLICATE : expect.anything());
  expect([DUPLICATE, first]).toContainEqual(retried);
  return first;
}

async function sent(): Promise<Sent[]> {
  const tasks = scheduled.tasks.splice(0);
  await Promise.all(tasks.map((task) => task()));
  return sdk.captureImmediate.mock.calls.map(([message]) => {
    const { distinctId, event, properties } = message as Sent;
    return { distinctId, event, properties };
  });
}

function event(type: string, fields: SubscriptionFields = {}, at?: number) {
  return subscriptionEvent(type, fields, at === undefined ? {} : { timestamp: at });
}

// The payment.succeeded Dodo sends for a plan change's charge.
function changeCharge(preTax: number, tax: number, fields: PaymentFields = {}) {
  return paymentEvent("payment.succeeded", {
    payment_id: dodoId("pay", "change"),
    charge_type: "plan_change",
    total_amount: preTax + tax,
    tax,
    ...fields,
  });
}

async function tracked(overrides: Partial<typeof users.$inferInsert> = {}): Promise<string> {
  const id = crypto.randomUUID();
  await insertUserRow({
    id,
    email: "ada@example.com",
    plan: "pro",
    planInterval: "month",
    planStatus: "active",
    billingCustomerId: CUS,
    billingSubscriptionId: SUB,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  });
  return id;
}

async function boughtCredit(userId: string, paymentId: string): Promise<void> {
  await (
    await getDb()
  )
    .insert(billingLog)
    .values({ kind: "topup", key: paymentId, userId, ref: "1088 USD", cents: 1000, at: 1 });
}

beforeEach(async () => {
  await resetDb();
  sdk.constructed.mockClear();
  sdk.captureImmediate.mockReset();
  sdk.captureImmediate.mockImplementation(async () => {});
  scheduled.tasks = [];
  posthog.key = "phc_test";
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subscription_renewed", () => {
  it("sends the plan, interval and the amount charged before tax, once however often Dodo retries", async () => {
    const userId = await tracked();
    const body = event("subscription.renewed", { recurring_pre_tax_amount: 1200 });
    expect(await deliverTwice(body)).toEqual(APPLIED);
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "subscription_renewed",
        properties: { plan: "pro", interval: "month", usd: 12, $set: { plan: "pro" } },
      },
    ]);
  });

  it("falls back to the plan's price when the payload has no amount in dollars", async () => {
    await tracked({ plan: "max", planInterval: "year" });
    const yearly = { product_id: MAX_YEAR, next_billing_date: dodoTime(TEST_DATES.yearEnd) };
    await deliverTwice(
      event("subscription.renewed", { ...yearly, recurring_pre_tax_amount: undefined }),
    );
    await deliverTwice(
      event("subscription.renewed", { ...yearly, currency: "EUR" } as SubscriptionFields),
    );
    expect((await sent()).map((call) => call.properties.usd)).toEqual([278, 278]);
  });

  it("counts the trial's first full charge as a renewal", async () => {
    const userId = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
    await deliverTwice(event("subscription.renewed", { product_id: PRO_TRIAL, ...AFTER_TRIAL }));
    expect(await sent()).toEqual([
      expect.objectContaining({
        distinctId: userId,
        event: "subscription_renewed",
        properties: expect.objectContaining({ plan: "pro", interval: "month", usd: 15 }),
      }),
    ]);
  });

  it("still counts when a newer event for the subscription came first, and leaves the plan to it", async () => {
    const userId = await tracked();
    expect(await deliverTwice(event("subscription.updated", {}, 2_000))).toEqual(APPLIED);
    expect(await deliverTwice(event("subscription.renewed", {}, 1_000))).toEqual(IGNORED);
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "subscription_renewed",
        properties: { plan: "pro", interval: "month", usd: 15 },
      },
    ]);
  });
});

describe("subscription_plan_changed", () => {
  const toMaxMonthly = { product_id: MAX_MONTH };
  const changed = (props: Record<string, unknown>, userId: string) => ({
    distinctId: userId,
    event: "subscription_plan_changed",
    properties: { ...props, $set: { plan: props.to_plan } },
  });

  it("sends an upgrade's prorated charge before tax with the change it paid for", async () => {
    const userId = await tracked();
    expect(await deliverTwice(changeCharge(700, 63))).toEqual(APPLIED);
    expect(await sent()).toEqual([]);
    expect(await deliverTwice(event("subscription.plan_changed", toMaxMonthly))).toEqual(APPLIED);
    expect(await sent()).toEqual([
      changed({ from_plan: "pro", to_plan: "max", interval: "month", usd: 7 }, userId),
    ]);
  });

  it("sets the plan at once when the change comes first, and sends it when its charge comes", async () => {
    const userId = await tracked();
    expect(await deliverTwice(event("subscription.plan_changed", toMaxMonthly))).toEqual(APPLIED);
    expect(await deliverTwice(changeCharge(700, 63))).toEqual(APPLIED);
    expect(await sent()).toEqual([
      { distinctId: userId, event: "$set", properties: { $set: { plan: "max" } } },
      changed({ from_plan: "pro", to_plan: "max", interval: "month", usd: 7 }, userId),
    ]);
  });

  it("sends the full price charged when a trial moves to Max", async () => {
    const userId = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
    const changedAt = TEST_DATES.start + DAY_MS;
    const maxYearly = event("subscription.plan_changed", {
      product_id: MAX_YEAR,
      trial_period_days: 0,
      previous_billing_date: dodoTime(changedAt),
      next_billing_date: dodoTime(changedAt + 365 * DAY_MS),
    });
    expect(await deliverTwice(maxYearly)).toEqual(APPLIED);
    expect(await deliverTwice(changeCharge(23_200, 2_088))).toEqual(APPLIED);
    expect(await sent()).toEqual([
      { distinctId: userId, event: "$set", properties: { $set: { plan: "max" } } },
      changed({ from_plan: "pro", to_plan: "max", interval: "year", usd: 232 }, userId),
    ]);
  });

  it("sends a downgrade with no charge at once, without dollars", async () => {
    const userId = await tracked({ plan: "max", planInterval: "year" });
    expect(await deliverTwice(event("subscription.plan_changed"))).toEqual(APPLIED);
    const events = await sent();
    expect(events).toEqual([
      changed({ from_plan: "max", to_plan: "pro", interval: "month" }, userId),
    ]);
    expect(events[0]?.properties).not.toHaveProperty("usd");
  });

  it("never pairs a change with a charge left unmatched days ago", async () => {
    const userId = await tracked();
    const then = Date.now() - 3 * DAY_MS;
    const stale = changeCharge(500, 0, { payment_id: dodoId("pay", "stale") });
    const headers = standardWebhookHeaders(stale, DODO_WEBHOOK_TEST_SECRET, {
      timestamp: Math.floor(then / 1000),
    });
    expect(await processWebhook(stale, headers, CONFIG, then)).toEqual(APPLIED);
    expect(await deliverTwice(event("subscription.plan_changed", toMaxMonthly))).toEqual(APPLIED);
    expect(await deliverTwice(changeCharge(700, 63))).toEqual(APPLIED);
    expect(await sent()).toEqual([
      { distinctId: userId, event: "$set", properties: { $set: { plan: "max" } } },
      changed({ from_plan: "pro", to_plan: "max", interval: "month", usd: 7 }, userId),
    ]);
  });

  it("counts a charge once however Dodo retries or replays it, and the change once out of order", async () => {
    const userId = await tracked();
    const max = { product_id: MAX_YEAR, next_billing_date: dodoTime(TEST_DATES.yearEnd) };
    expect(await deliverTwice(event("subscription.updated", max, 2_000))).toEqual(APPLIED);
    await deliverTwice(event("subscription.plan_changed", max, 1_000));
    const charge = changeCharge(10_000, 0);
    expect(await deliverTwice(charge)).toEqual(APPLIED);
    const replayed = standardWebhookHeaders(charge, DODO_WEBHOOK_TEST_SECRET, { id: "msg_replay" });
    expect(await processWebhook(charge, replayed, CONFIG)).toEqual(DUPLICATE);
    await deliverTwice(event("subscription.updated", max, 3_000));
    expect(await sent()).toEqual([
      { distinctId: userId, event: "$set", properties: { $set: { plan: "max" } } },
      changed({ from_plan: "pro", to_plan: "max", interval: "year", usd: 100 }, userId),
    ]);
  });
});

describe("subscription_cancelled and subscription_ended", () => {
  it("a cancel at the period end is sent when it's made, and the end when it comes", async () => {
    const userId = await tracked();
    const scheduled = { cancel_at_next_billing_date: true };
    expect(await deliverTwice(event("subscription.updated", scheduled, 1_000))).toEqual(APPLIED);
    await deliverTwice(event("subscription.update_payment_method", scheduled, 1_500));
    await deliverTwice(event("subscription.cancelled", {}, 2_000));
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "subscription_cancelled",
        properties: { plan: "pro", at_period_end: true, trial: false, $set: { plan: "pro" } },
      },
      {
        distinctId: userId,
        event: "subscription_ended",
        properties: { plan: "pro", status: "cancelled", trial: false, $set: { plan: "free" } },
      },
    ]);
  });

  it("a cancel that takes effect now sends both, for the trial too", async () => {
    const userId = await tracked({ planStatus: "trialing", trialEndsAt: TEST_DATES.trialEnd });
    expect(await deliverTwice(event("subscription.cancelled"))).toEqual(APPLIED);
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "subscription_cancelled",
        properties: { plan: "pro", at_period_end: false, trial: true, $set: { plan: "free" } },
      },
      {
        distinctId: userId,
        event: "subscription_ended",
        properties: { plan: "pro", status: "cancelled", trial: true, $set: { plan: "free" } },
      },
    ]);
  });

  it.each([
    ["subscription.expired", "expired"],
    ["subscription.on_hold", "on_hold"],
    ["subscription.paused", "paused"],
  ])("%s ends the plan with its status", async (type, status) => {
    const userId = await tracked({ plan: "max", planInterval: "year" });
    expect(await deliverTwice(event(type, { product_id: MAX_YEAR }))).toEqual(APPLIED);
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "subscription_ended",
        properties: { plan: "max", status, trial: false, $set: { plan: "free" } },
      },
    ]);
  });

  it("a plan back from on hold only sets the person's plan again", async () => {
    const userId = await tracked({ plan: "free", planInterval: null, planStatus: "on_hold" });
    expect(await deliverTwice(event("subscription.active"))).toEqual(APPLIED);
    await deliverTwice(event("subscription.updated"));
    expect(await sent()).toEqual([
      { distinctId: userId, event: "$set", properties: { $set: { plan: "pro" } } },
    ]);
  });
});

describe("payment_failed", () => {
  it("sends the plan, the charge, Dodo's code and the attempt, once", async () => {
    const userId = await tracked({ planStatus: "past_due" });
    const renewal = paymentEvent("payment.failed", {
      charge_type: "renewal",
      retry_attempt: 2,
      error_code: "INSUFFICIENT_FUNDS",
    });
    expect(await deliverTwice(renewal)).toEqual(APPLIED);
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "payment_failed",
        properties: {
          kind: "subscription",
          plan: "pro",
          charge: "renewal",
          reason: "INSUFFICIENT_FUNDS",
          attempt: 2,
        },
      },
    ]);
  });

  it("names the plan a declined checkout was for, and a top-up as credit", async () => {
    const userId = await tracked({ plan: "free", planStatus: null, billingSubscriptionId: null });
    const checkout = paymentEvent("payment.failed", {
      subscription_id: dodoId("sub", "new"),
      metadata: { user_id: userId, plan: "max", interval: "year", trial: "false" },
    });
    const topup = paymentEvent("payment.failed", {
      subscription_id: null,
      charge_type: null,
      error_code: "card 4242 of ada@example.com was declined",
      metadata: { user_id: userId, topup_id: crypto.randomUUID() },
    });
    expect(await deliverTwice(checkout)).toEqual(APPLIED);
    expect(await deliverTwice(topup)).toEqual(APPLIED);
    expect((await sent()).map((call) => call.properties)).toEqual([
      { kind: "subscription", plan: "max", charge: "new", reason: "CARD_DECLINED", attempt: 0 },
      { kind: "credit", attempt: 0 },
    ]);
  });

  it("sends nothing for a payment no account matches, or one that is neither a plan nor credit", async () => {
    const stranger = paymentEvent("payment.failed", {
      subscription_id: dodoId("sub", "stranger"),
      customer: { customer_id: dodoId("cus", "stranger") },
    });
    const other = paymentEvent("payment.failed", { subscription_id: null, charge_type: null });
    expect(await deliverTwice(stranger)).toEqual(IGNORED);
    expect(await deliverTwice(other)).toEqual(IGNORED);
    expect(await sent()).toEqual([]);
  });
});

describe("refunds and disputes", () => {
  it("refund_issued sends the amount, kind and whether it was partial, once", async () => {
    const userId = await tracked();
    const creditPayment = dodoId("pay", "credit");
    await boughtCredit(userId, creditPayment);
    expect(await deliverTwice(refundEvent("refund.succeeded", { amount: 1500 }))).toEqual(APPLIED);
    const partial = refundEvent("refund.succeeded", {
      refund_id: dodoId("ref", 2),
      payment_id: creditPayment,
      is_partial: true,
      amount: 544,
    });
    expect(await deliverTwice(partial)).toEqual(APPLIED);
    await deliverTwice(refundEvent("refund.failed", { refund_id: dodoId("ref", 3) }));
    expect(await sent()).toEqual([
      {
        distinctId: userId,
        event: "refund_issued",
        properties: { kind: "subscription", partial: false, usd: 15 },
      },
      {
        distinctId: userId,
        event: "refund_issued",
        properties: { kind: "credit", partial: true, usd: 5.44 },
      },
    ]);
  });

  it("dispute_opened sends the kind, and dispute_lost the amount, once per dispute", async () => {
    const userId = await tracked();
    const creditPayment = dodoId("pay", "credit");
    await boughtCredit(userId, creditPayment);
    expect(await deliverTwice(disputeEvent("dispute.opened"))).toEqual(APPLIED);
    await deliverTwice(disputeEvent("dispute.challenged"));
    expect(await deliverTwice(disputeEvent("dispute.lost"))).toEqual(APPLIED);
    await deliverTwice(disputeEvent("dispute.accepted"));
    const credit = { dispute_id: "dsp_CreditDispute00000001", payment_id: creditPayment };
    await deliverTwice(disputeEvent("dispute.accepted", { ...credit, amount: "1088" }));
    expect(await sent()).toEqual([
      {
        distinctId: "anonymous",
        event: "dispute_opened",
        properties: { kind: "subscription", $process_person_profile: false },
      },
      {
        distinctId: "anonymous",
        event: "dispute_lost",
        properties: { kind: "subscription", usd: 15, $process_person_profile: false },
      },
      { distinctId: userId, event: "dispute_lost", properties: { kind: "credit", usd: 10.88 } },
    ]);
  });
});

describe("privacy and PostHog", () => {
  async function deliverEverything(userId: string) {
    const bodies = [
      paymentEvent("payment.succeeded", {
        subscription_id: dodoId("sub", "next"),
        metadata: { user_id: userId, plan: "pro", interval: "month", trial: "true" },
      }),
      event("subscription.renewed", {}, 1_000),
      changeCharge(10_000, 0),
      event("subscription.plan_changed", { product_id: MAX_YEAR }, 2_000),
      event(
        "subscription.updated",
        { product_id: MAX_YEAR, cancel_at_next_billing_date: true },
        3_000,
      ),
      event("subscription.expired", { product_id: MAX_YEAR }, 4_000),
      paymentEvent("payment.failed", { charge_type: "renewal" }),
      refundEvent("refund.succeeded"),
      disputeEvent("dispute.opened"),
      disputeEvent("dispute.lost"),
    ];
    for (const body of bodies) expect(await deliverTwice(body)).toEqual(APPLIED);
  }

  it("sends only plans, amounts and statuses under the user id: no Dodo ids, emails, names or card data", async () => {
    const userId = await tracked();
    await deliverEverything(userId);
    const events = await sent();
    expect(events.map((call) => call.event)).toEqual([
      "checkout_completed",
      "subscription_renewed",
      "subscription_plan_changed",
      "subscription_cancelled",
      "subscription_ended",
      "payment_failed",
      "refund_issued",
      "dispute_opened",
      "dispute_lost",
    ]);
    const allowed = new Set([
      ...["plan", "interval", "usd", "trial", "from_plan", "to_plan", "at_period_end", "status"],
      ...["kind", "charge", "reason", "attempt", "partial", "$set", "$process_person_profile"],
    ]);
    for (const { distinctId, properties } of events) {
      expect([userId, "anonymous"]).toContain(distinctId);
      for (const key of Object.keys(properties)) expect(allowed).toContain(key);
    }
    const text = JSON.stringify(events);
    for (const secret of [
      "ada@example.com",
      "Ada Lovelace",
      CUS,
      SUB,
      PAY,
      DODO_TEST_IDS.refund,
      DODO_TEST_IDS.dispute,
      DODO_TEST_IDS.business,
      "cks_",
      "4242",
      "VISA",
      "The card was declined",
    ]) {
      expect(text).not.toContain(secret);
    }
  });

  it("with PostHog unset, every event is handled as before and nothing is sent", async () => {
    posthog.key = undefined;
    const userId = await tracked();
    await deliverEverything(userId);
    expect(scheduled.tasks).toEqual([]);
    expect(sdk.constructed).not.toHaveBeenCalled();
    expect(sdk.captureImmediate).not.toHaveBeenCalled();
  });

  it("a send PostHog refuses is logged and changes nothing", async () => {
    sdk.captureImmediate.mockRejectedValue(new Error("posthog down"));
    await tracked();
    expect(await deliverTwice(event("subscription.renewed"))).toEqual(APPLIED);
    expect(await sent()).toHaveLength(1);
    expect(vi.mocked(console.warn)).toHaveBeenCalledWith(
      expect.stringContaining("analytics.capture_failed"),
      expect.anything(),
    );
    const [row] = await (await getDb()).select({ plan: users.plan }).from(users);
    expect(row?.plan).toBe("pro");
  });
});
