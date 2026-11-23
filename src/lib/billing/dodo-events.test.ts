import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { DAY_MS } from "@/lib/time";
import { signBillingId } from "./billing-sign";
import {
  classify,
  DodoDisputeSchema,
  DodoPaymentSchema,
  DodoRefundSchema,
  HANDLED_EVENT_TYPES,
  metadataIds,
  readEnvelope,
  toState,
  verifyWebhook,
  webhookKey,
  type ProductCatalog,
  type TrustedIds,
} from "./dodo-events";
import { DodoSubscriptionSchema } from "./dodo-status";
import { planForStatus } from "./entitlements";
import {
  AFTER_TRIAL,
  BILLING_TEST_SIGNING_SECRET,
  DODO_TEST_IDS,
  DODO_TEST_PRODUCTS,
  DODO_WEBHOOK_TEST_SECRET,
  disputeEvent,
  dodoTime,
  ON_TRIAL,
  paymentEvent,
  refundEvent,
  standardWebhookHeaders,
  standardWebhookSignature,
  subscriptionEvent,
  TEST_DATES,
  type SubscriptionFields,
} from "./dodo-webhook-testing";

afterEach(() => {
  vi.restoreAllMocks();
});

// Svix's published Standard Webhooks example; Dodo signs the same way.
const VECTOR = {
  secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
  id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
  timestamp: 1614265330,
  body: '{"test": 2432232314}',
  signature: "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=",
};
const AT_VECTOR = VECTOR.timestamp * 1000;
const VALID = { check: "valid", eventId: VECTOR.id };
const refused = (check: string) => ({ check, eventId: null });
const secretOf = (text: string) => `whsec_${Buffer.from(text).toString("base64")}`;

function vectorHeaders(overrides: Record<string, string | null> = {}): Headers {
  const headers = new Headers({
    "webhook-id": VECTOR.id,
    "webhook-timestamp": String(VECTOR.timestamp),
    "webhook-signature": VECTOR.signature,
  });
  for (const [name, value] of Object.entries(overrides)) {
    if (value === null) headers.delete(name);
    else headers.set(name, value);
  }
  return headers;
}

function verify(headers: Headers, body = VECTOR.body, secret = VECTOR.secret, now = AT_VECTOR) {
  return verifyWebhook(body, headers, secret, now);
}

const PLANS: Record<string, { plan: PaidPlanId; interval: BillingInterval }> = {
  [DODO_TEST_PRODUCTS.proMonth]: { plan: "pro", interval: "month" },
  [DODO_TEST_PRODUCTS.proYear]: { plan: "pro", interval: "year" },
  [DODO_TEST_PRODUCTS.maxMonth]: { plan: "max", interval: "month" },
  [DODO_TEST_PRODUCTS.maxYear]: { plan: "max", interval: "year" },
  [DODO_TEST_PRODUCTS.proTrial]: { plan: "pro", interval: "month" },
};

const CATALOG: ProductCatalog = {
  productIds: Object.keys(PLANS),
  planForProduct: (id) => PLANS[id] ?? null,
};

const NO_IDS: TrustedIds = { userId: undefined, replacesSubscriptionId: null };

describe("verifyWebhook", () => {
  it("accepts the published example and returns its webhook-id", () => {
    expect(verify(vectorHeaders())).toEqual(VALID);
  });

  it("matches an HMAC-SHA256 of id.timestamp.body under the decoded key, as the test builders sign", () => {
    const key = Buffer.from(VECTOR.secret.slice("whsec_".length), "base64");
    const mac = createHmac("sha256", key)
      .update(`${VECTOR.id}.${VECTOR.timestamp}.${VECTOR.body}`)
      .digest("base64");
    expect(`v1,${mac}`).toBe(VECTOR.signature);
    expect(webhookKey(VECTOR.secret)).toEqual(key);
    expect(standardWebhookSignature(VECTOR.body, VECTOR.secret, VECTOR.id, VECTOR.timestamp)).toBe(
      VECTOR.signature,
    );
    const body = subscriptionEvent();
    const headers = standardWebhookHeaders(body, DODO_WEBHOOK_TEST_SECRET, {
      id: "msg_built",
      timestamp: 1_800_000_000,
    });
    expect(verifyWebhook(body, headers, DODO_WEBHOOK_TEST_SECRET, 1_800_000_000_000)).toEqual({
      check: "valid",
      eventId: "msg_built",
    });
  });

  it("takes the secret with or without whsec_, and with stray whitespace from the env", () => {
    for (const secret of [
      VECTOR.secret,
      VECTOR.secret.slice("whsec_".length),
      ` ${VECTOR.secret}\n`,
    ]) {
      expect(verify(vectorHeaders(), VECTOR.body, secret)).toEqual(VALID);
    }
  });

  it("treats an empty or undecodable secret as malformed", () => {
    for (const secret of [
      "",
      "   ",
      "whsec_",
      "whsec_not base64!",
      "whsec_MfKQ-9r8GKYq",
      "whsec_A",
      "whsec_AAAA===",
    ]) {
      expect(verify(vectorHeaders(), VECTOR.body, secret)).toEqual(refused("malformed"));
      expect(webhookKey(secret)).toBeNull();
    }
  });

  it("accepts any matching v1 entry among several, skipping other versions", () => {
    const other = standardWebhookSignature(
      VECTOR.body,
      secretOf("someone else's key"),
      VECTOR.id,
      VECTOR.timestamp,
    );
    for (const header of [
      `${other} ${VECTOR.signature}`,
      `${VECTOR.signature} ${other}`,
      `v1a,${"A".repeat(86)}== ${VECTOR.signature}`,
      `v2,${VECTOR.signature.slice(3)} ${VECTOR.signature}`,
      `${VECTOR.signature}  ${other}`,
    ]) {
      expect(verify(vectorHeaders({ "webhook-signature": header }))).toEqual(VALID);
    }
  });

  it("verifies with either secret while a rotated secret is signed with both", () => {
    const oldSecret = secretOf("the secret before the rotation");
    const newSecret = secretOf("the secret after the rotation");
    const body = subscriptionEvent("subscription.renewed");
    const signature = [oldSecret, newSecret]
      .map((secret) => standardWebhookSignature(body, secret, "msg_rotated", VECTOR.timestamp))
      .join(" ");
    const headers = vectorHeaders({ "webhook-id": "msg_rotated", "webhook-signature": signature });
    for (const secret of [oldSecret, newSecret]) {
      expect(verify(headers, body, secret)).toEqual({ check: "valid", eventId: "msg_rotated" });
    }
    expect(verify(headers, body, secretOf("a third secret"))).toEqual(refused("mismatch"));
  });

  it("refuses a wrong key, a changed body, id or timestamp as a mismatch", () => {
    const mismatch = refused("mismatch");
    expect(verify(vectorHeaders(), VECTOR.body, secretOf("someone else's key"))).toEqual(mismatch);
    expect(verify(vectorHeaders(), '{"test": 2432232315}')).toEqual(mismatch);
    expect(verify(vectorHeaders(), `${VECTOR.body} `)).toEqual(mismatch);
    expect(verify(vectorHeaders({ "webhook-id": `${VECTOR.id}x` }))).toEqual(mismatch);
    expect(verify(vectorHeaders({ "webhook-timestamp": String(VECTOR.timestamp + 1) }))).toEqual(
      mismatch,
    );
  });

  it("refuses the same JSON encoded differently, so only the raw body verifies", () => {
    const body = subscriptionEvent("subscription.active", { metadata: { plan: "pro" } });
    const headers = standardWebhookHeaders(body, DODO_WEBHOOK_TEST_SECRET, {
      id: "msg_raw",
      timestamp: VECTOR.timestamp,
    });
    expect(verify(headers, body, DODO_WEBHOOK_TEST_SECRET)).toMatchObject({ check: "valid" });
    const { data, ...envelope } = JSON.parse(body);
    for (const reencoded of [
      JSON.stringify(JSON.parse(body), null, 2),
      JSON.stringify({ data, ...envelope }),
      body.replace('"type"', '"\\u0074ype"'),
    ]) {
      expect(reencoded).not.toBe(body);
      expect(JSON.parse(reencoded)).toEqual(JSON.parse(body));
      expect(verify(headers, reencoded, DODO_WEBHOOK_TEST_SECRET)).toEqual(refused("mismatch"));
    }
    expect(verify(vectorHeaders(), '{"test":2432232314}')).toEqual(refused("mismatch"));
  });

  it("answers missing for each absent or empty header", () => {
    for (const name of ["webhook-id", "webhook-timestamp", "webhook-signature"]) {
      for (const value of [null, ""]) {
        expect(verify(vectorHeaders({ [name]: value }))).toEqual(refused("missing"));
      }
    }
    expect(verify(new Headers())).toEqual(refused("missing"));
  });

  it("answers malformed for a garbled signature, timestamp or id", () => {
    const value = VECTOR.signature.slice(3);
    const malformed = refused("malformed");
    for (const header of [
      value,
      "v1,",
      "v1,abc",
      `v1,${"%".repeat(43)}=`,
      `v2,${value}`,
      `v1a,${value}`,
      `V1,${value}`,
      `v1=${value}`,
      `v1, ${value}`,
      `v1,${Buffer.alloc(31, 7).toString("base64")}`,
      `v1,${Buffer.alloc(33, 7).toString("base64")}`,
      `v1,${value.replace("=", "")}==`,
    ]) {
      expect(verify(vectorHeaders({ "webhook-signature": header }))).toEqual(malformed);
    }
    for (const timestamp of ["abc", "-1614265330", "1614265330.5", "1e9", "1".repeat(13)]) {
      expect(verify(vectorHeaders({ "webhook-timestamp": timestamp }))).toEqual(malformed);
    }
    expect(verify(vectorHeaders({ "webhook-id": "m".repeat(256) }))).toEqual(malformed);
    expect(verify(vectorHeaders({ "webhook-id": "m".repeat(255) }))).toEqual(refused("mismatch"));
  });

  it("refuses a signature header over 2048 characters, even with a matching entry", () => {
    const filler = (length: number) => `${VECTOR.signature} ${"x".repeat(length)}`;
    const fits = filler(2048 - VECTOR.signature.length - 1);
    expect(fits).toHaveLength(2048);
    expect(verify(vectorHeaders({ "webhook-signature": fits }))).toEqual(VALID);
    expect(verify(vectorHeaders({ "webhook-signature": `${fits}x` }))).toEqual(
      refused("malformed"),
    );
  });

  it("refuses a delivery more than five minutes from now either way, once its signature matches", () => {
    for (const now of [AT_VECTOR - 300_000, AT_VECTOR + 300_000]) {
      expect(verify(vectorHeaders(), VECTOR.body, VECTOR.secret, now)).toEqual(VALID);
    }
    for (const now of [AT_VECTOR - 300_001, AT_VECTOR + 300_001, AT_VECTOR + 30 * DAY_MS]) {
      expect(verify(vectorHeaders(), VECTOR.body, VECTOR.secret, now)).toEqual(refused("stale"));
    }
    expect(
      verify(vectorHeaders(), VECTOR.body, secretOf("someone else's key"), AT_VECTOR + DAY_MS),
    ).toEqual(refused("mismatch"));
  });
});

describe("readEnvelope", () => {
  it("reads the type, its kind, the event time to the millisecond and the data", () => {
    const body = subscriptionEvent(
      "subscription.renewed",
      {},
      { timestamp: "2025-08-04T05:36:41.609359Z" },
    );
    const read = readEnvelope(body);
    expect(read).toMatchObject({
      ok: true,
      event: {
        type: "subscription.renewed",
        kind: "subscription",
        eventAt: Date.UTC(2025, 7, 4, 5, 36, 41, 609),
        data: { subscription_id: DODO_TEST_IDS.subscription, status: "active" },
      },
    });
  });

  it("keeps envelopes with fields it doesn't know, and reads a time without a zone as UTC", () => {
    const read = readEnvelope(
      JSON.stringify({
        business_id: DODO_TEST_IDS.business,
        brand_id: DODO_TEST_IDS.business,
        type: "invoice.paid",
        timestamp: "2026-11-20T09:30:15.123456",
        data: { payload_type: "Invoice" },
      }),
    );
    expect(read).toMatchObject({
      ok: true,
      event: { kind: "other", eventAt: Date.UTC(2026, 10, 20, 9, 30, 15, 123) },
    });
  });

  it("leaves the event time empty when it is missing or unreadable", () => {
    for (const timestamp of [undefined, null, "", "yesterday"]) {
      const read = readEnvelope(
        JSON.stringify({ type: "subscription.updated", timestamp, data: {} }),
      );
      expect(read).toMatchObject({ ok: true, event: { eventAt: null } });
    }
  });

  it("refuses a body that isn't a Dodo envelope", () => {
    expect(readEnvelope("not json")).toEqual({ ok: false, problem: "json" });
    expect(readEnvelope(JSON.stringify({ timestamp: dodoTime(0), data: {} }))).toEqual({
      ok: false,
      problem: "type",
    });
    for (const body of [
      "[]",
      "null",
      '"subscription.active"',
      JSON.stringify({ type: "", data: {} }),
      JSON.stringify({ type: "x".repeat(101), data: {} }),
      JSON.stringify({ type: "subscription.active", timestamp: "x".repeat(65), data: {} }),
      JSON.stringify({ type: "subscription.active", timestamp: 1_800_000_000, data: {} }),
      JSON.stringify({ type: "subscription.active", business_id: 7, data: {} }),
    ]) {
      expect(readEnvelope(body)).toMatchObject({ ok: false });
    }
  });
});

describe("classify", () => {
  it("sorts the events the webhook handles and leaves the rest as other", () => {
    const expected: Record<string, string> = {
      "subscription.active": "subscription",
      "subscription.renewed": "subscription",
      "subscription.updated": "subscription",
      "subscription.plan_changed": "subscription",
      "subscription.past_due": "subscription",
      "subscription.on_hold": "subscription",
      "subscription.paused": "subscription",
      "subscription.unpaused": "subscription",
      "subscription.cancelled": "subscription",
      "subscription.expired": "subscription",
      "subscription.failed": "subscription",
      "subscription.update_payment_method": "subscription",
      "payment.succeeded": "payment_succeeded",
      "payment.failed": "payment_failed",
      "refund.succeeded": "refund",
      "refund.failed": "refund",
      "dispute.opened": "dispute",
      "dispute.challenged": "dispute",
      "dispute.accepted": "dispute",
      "dispute.cancelled": "dispute",
      "dispute.expired": "dispute",
      "dispute.won": "dispute",
      "dispute.lost": "dispute",
      "payment.processing": "other",
      "payment.cancelled": "other",
      "invoice.paid": "other",
      "license_key.created": "other",
      "dunning.started": "other",
      "subscription.trialing": "other",
      "subscription.created": "other",
      "Subscription.Active": "other",
      "": "other",
    };
    for (const [type, kind] of Object.entries(expected))
      expect([type, classify(type)]).toEqual([type, kind]);
  });

  it("lists the 23 event types the endpoint subscribes to, each handled", () => {
    expect(HANDLED_EVENT_TYPES).toHaveLength(23);
    expect(new Set(HANDLED_EVENT_TYPES).size).toBe(23);
    expect(HANDLED_EVENT_TYPES.filter((type) => classify(type) === "other")).toEqual([]);
    expect(HANDLED_EVENT_TYPES.filter((type) => type.startsWith("subscription."))).toHaveLength(12);
  });
});

describe("payload schemas", () => {
  const dataOf = (body: string): Record<string, unknown> => JSON.parse(body).data;

  it("reads a payment, dropping the fields it doesn't use", () => {
    const data = dataOf(paymentEvent("payment.succeeded", { metadata: { plan: "pro" } }));
    expect(DodoPaymentSchema.parse(data)).toEqual({
      payment_id: DODO_TEST_IDS.payment,
      subscription_id: DODO_TEST_IDS.subscription,
      status: "succeeded",
      charge_type: "new",
      metadata: { plan: "pro" },
      customer: { customer_id: DODO_TEST_IDS.customer },
      product_cart: null,
      total_amount: 100,
      tax: 0,
      currency: "USD",
      checkout_session_id: "cks_TestCheckout00000001",
    });
  });

  it("accepts a payment without a subscription, charge type or metadata, and charge types it doesn't know", () => {
    for (const fields of [
      { subscription_id: null, charge_type: null, metadata: null, status: null },
      { charge_type: "something_new" },
    ]) {
      expect(
        DodoPaymentSchema.safeParse(dataOf(paymentEvent("payment.failed", fields))).success,
      ).toBe(true);
    }
  });

  it("refuses a payment without its id or customer", () => {
    const data = dataOf(paymentEvent());
    expect(DodoPaymentSchema.safeParse({ ...data, payment_id: undefined }).success).toBe(false);
    expect(DodoPaymentSchema.safeParse({ ...data, customer: {} }).success).toBe(false);
    expect(DodoPaymentSchema.safeParse({ ...data, customer: null }).success).toBe(false);
  });

  it("reads refunds, with or without an amount", () => {
    const data = dataOf(
      refundEvent("refund.failed", { amount: null, currency: null, is_partial: true }),
    );
    expect(DodoRefundSchema.parse(data)).toEqual({
      refund_id: DODO_TEST_IDS.refund,
      payment_id: DODO_TEST_IDS.payment,
      status: "failed",
      is_partial: true,
      amount: null,
      currency: null,
    });
    expect(DodoRefundSchema.parse(dataOf(refundEvent()))).toMatchObject({
      status: "succeeded",
      amount: 100,
      currency: "USD",
    });
    expect(DodoRefundSchema.safeParse({ ...data, refund_id: undefined }).success).toBe(false);
    expect(DodoRefundSchema.safeParse({ ...data, payment_id: "" }).success).toBe(false);
  });

  it("reads disputes, whose amount is a string, with or without the RDR flag", () => {
    expect(
      DodoDisputeSchema.parse(dataOf(disputeEvent("dispute.lost", { is_resolved_by_rdr: true }))),
    ).toEqual({
      dispute_id: DODO_TEST_IDS.dispute,
      payment_id: DODO_TEST_IDS.payment,
      dispute_status: "dispute_lost",
      dispute_stage: "dispute",
      amount: "1500",
      currency: "USD",
      is_resolved_by_rdr: true,
    });
    const data = dataOf(disputeEvent());
    expect(DodoDisputeSchema.safeParse({ ...data, is_resolved_by_rdr: undefined }).success).toBe(
      true,
    );
    expect(DodoDisputeSchema.safeParse({ ...data, amount: 1500 }).success).toBe(true);
    expect(DodoDisputeSchema.safeParse({ ...data, dispute_id: undefined }).success).toBe(false);
  });
});

describe("toState", () => {
  const EVENT_AT = TEST_DATES.start + 60_000;
  const trial: SubscriptionFields = { product_id: DODO_TEST_PRODUCTS.proTrial, ...ON_TRIAL };
  const converted: SubscriptionFields = { product_id: DODO_TEST_PRODUCTS.proTrial, ...AFTER_TRIAL };

  function stateOf(
    type: string,
    fields: SubscriptionFields = {},
    ids = NO_IDS,
    catalog = CATALOG,
    eventAt: number | null = EVENT_AT,
  ) {
    const data = JSON.parse(subscriptionEvent(type, fields)).data;
    return toState(DodoSubscriptionSchema.parse(data), eventAt, catalog, ids);
  }

  it("makes a paid trial's first event an unpaid Pro trial that ends at the next billing date", () => {
    expect(stateOf("subscription.active", trial)).toEqual({
      userId: undefined,
      customerId: DODO_TEST_IDS.customer,
      subscriptionId: DODO_TEST_IDS.subscription,
      pricePlan: "pro",
      priceInterval: "month",
      status: "trialing",
      renewsAt: TEST_DATES.trialEnd,
      periodStartsAt: TEST_DATES.start,
      periodEndsAt: TEST_DATES.trialEnd,
      trialEndsAt: TEST_DATES.trialEnd,
      eventAt: EVENT_AT,
      replacesSubscriptionId: null,
      unpaidTrial: true,
    });
  });

  it("ends the trial once the first full month is billed", () => {
    expect(stateOf("subscription.renewed", converted)).toMatchObject({
      pricePlan: "pro",
      priceInterval: "month",
      status: "active",
      renewsAt: TEST_DATES.monthAfterTrial,
      periodStartsAt: TEST_DATES.trialEnd,
      periodEndsAt: TEST_DATES.monthAfterTrial,
      trialEndsAt: null,
      unpaidTrial: false,
    });
  });

  it("keeps the trial end on a trial set to cancel, with nothing renewing", () => {
    const state = stateOf("subscription.updated", { ...trial, cancel_at_next_billing_date: true });
    expect(state).toMatchObject({
      status: "scheduled_cancel",
      renewsAt: null,
      periodEndsAt: TEST_DATES.trialEnd,
      trialEndsAt: TEST_DATES.trialEnd,
      unpaidTrial: true,
    });
    expect(planForStatus(state.status)).toBe("paid");
  });

  it("keeps a paid subscription set to cancel paid to the period end, with no trial", () => {
    const state = stateOf("subscription.updated", {
      ...converted,
      cancel_at_next_billing_date: true,
    });
    expect(state).toMatchObject({
      status: "scheduled_cancel",
      renewsAt: null,
      periodEndsAt: TEST_DATES.monthAfterTrial,
      trialEndsAt: null,
      unpaidTrial: false,
    });
    expect(planForStatus(state.status)).toBe("paid");
  });

  it("counts a failed first full charge in the grace period as an unpaid trial that stays paid", () => {
    const state = stateOf("subscription.past_due", {
      ...trial,
      past_due_ends_at: dodoTime(TEST_DATES.trialEnd + 3 * DAY_MS),
    });
    expect(state).toMatchObject({
      status: "past_due",
      renewsAt: TEST_DATES.trialEnd,
      trialEndsAt: TEST_DATES.trialEnd,
      unpaidTrial: true,
    });
    expect(planForStatus(state.status)).toBe("paid");
  });

  it("keeps a failed renewal paid in the grace period, outside any trial", () => {
    for (const fields of [converted, {}]) {
      const state = stateOf("subscription.past_due", fields);
      expect(state).toMatchObject({ status: "past_due", trialEndsAt: null, unpaidTrial: false });
      expect(planForStatus(state.status)).toBe("paid");
    }
  });

  it("moves on_hold to Free after the grace period, inside the trial window or not", () => {
    for (const fields of [trial, converted]) {
      const state = stateOf("subscription.on_hold", fields);
      expect(state).toMatchObject({ status: "on_hold", unpaidTrial: false });
      expect(planForStatus(state.status)).toBe("free");
    }
  });

  it("moves paused to Free, and unpaused back to the paid plan", () => {
    const paused = stateOf("subscription.paused", converted);
    expect(paused.status).toBe("paused");
    expect(planForStatus(paused.status)).toBe("free");
    const unpaused = stateOf("subscription.unpaused", converted);
    expect(unpaused.status).toBe("active");
    expect(planForStatus(unpaused.status)).toBe("paid");
  });

  it("ends cancelled and expired subscriptions with nothing renewing", () => {
    for (const type of ["subscription.cancelled", "subscription.expired"]) {
      for (const fields of [trial, converted]) {
        const state = stateOf(type, { ...fields, cancelled_at: dodoTime(TEST_DATES.trialEnd) });
        expect(state).toMatchObject({ status: "canceled", renewsAt: null, unpaidTrial: false });
        expect(planForStatus(state.status)).toBe("free");
      }
    }
  });

  it("gives pending, failed and unknown statuses a status no plan maps to", () => {
    for (const status of ["pending", "failed", "trialing", "scheduled_cancel", "something_new"]) {
      const state = stateOf("subscription.updated", { ...trial, status });
      expect(state.status).toBe(`dodo:${status}`);
      expect(planForStatus(state.status)).toBeNull();
      expect(state.unpaidTrial).toBe(false);
    }
  });

  it("names a plan only for our own products", () => {
    expect(stateOf("subscription.active", { product_id: "pdt_SomeoneElsesProduct" })).toMatchObject(
      {
        status: "active",
        pricePlan: null,
        priceInterval: null,
      },
    );
    const proMonthOnly: ProductCatalog = {
      ...CATALOG,
      productIds: [DODO_TEST_PRODUCTS.proMonth],
    };
    expect(
      stateOf(
        "subscription.active",
        { product_id: DODO_TEST_PRODUCTS.maxYear },
        NO_IDS,
        proMonthOnly,
      ),
    ).toMatchObject({ pricePlan: null, priceInterval: null });
    expect(
      stateOf("subscription.active", { product_id: DODO_TEST_PRODUCTS.maxYear }, NO_IDS, {
        ...CATALOG,
        planForProduct: () => undefined,
      }),
    ).toMatchObject({ pricePlan: null, priceInterval: null });
  });

  it("reads Max yearly", () => {
    expect(
      stateOf("subscription.active", {
        product_id: DODO_TEST_PRODUCTS.maxYear,
        next_billing_date: dodoTime(TEST_DATES.yearEnd),
      }),
    ).toMatchObject({
      pricePlan: "max",
      priceInterval: "year",
      status: "active",
      renewsAt: TEST_DATES.yearEnd,
      trialEndsAt: null,
      unpaidTrial: false,
    });
  });

  it("ends the trial at once when it changes to Max with a full charge", () => {
    const changedAt = TEST_DATES.start + DAY_MS;
    for (const trialDays of [0, 3]) {
      expect(
        stateOf("subscription.plan_changed", {
          ...trial,
          product_id: DODO_TEST_PRODUCTS.maxMonth,
          trial_period_days: trialDays,
          previous_billing_date: dodoTime(changedAt),
          next_billing_date: dodoTime(changedAt + 30 * DAY_MS),
        }),
      ).toMatchObject({
        pricePlan: "max",
        priceInterval: "month",
        status: "active",
        trialEndsAt: null,
        unpaidTrial: false,
      });
    }
  });

  it("keeps a converted trial paid when an in-place change leaves a 2-day period before renewal", () => {
    const renews = TEST_DATES.monthAfterTrial;
    expect(
      stateOf("subscription.plan_changed", {
        ...converted,
        product_id: DODO_TEST_PRODUCTS.maxMonth,
        previous_billing_date: dodoTime(renews - 2 * DAY_MS),
        next_billing_date: dodoTime(renews),
      }),
    ).toMatchObject({
      pricePlan: "max",
      status: "active",
      renewsAt: renews,
      trialEndsAt: null,
      unpaidTrial: false,
    });
  });

  it("starts the period at created_at when there is no previous billing date", () => {
    expect(stateOf("subscription.active", { ...trial, previous_billing_date: null })).toMatchObject(
      { status: "trialing", periodStartsAt: TEST_DATES.start, unpaidTrial: true },
    );
  });

  it("carries the trusted ids and the event time as given", () => {
    const userId = crypto.randomUUID();
    const replaced = "sub_TheTrialItReplaces01";
    expect(
      stateOf(
        "subscription.active",
        {},
        { userId, replacesSubscriptionId: replaced },
        CATALOG,
        null,
      ),
    ).toMatchObject({ userId, replacesSubscriptionId: replaced, eventAt: null });
  });
});

describe("metadataIds", () => {
  const FIELDS = {
    eventId: "msg_metadata",
    eventType: "subscription.active",
    subscriptionId: DODO_TEST_IDS.subscription,
  };
  const SECRET = BILLING_TEST_SIGNING_SECRET;
  const REPLACED = "sub_TheTrialItReplaces01";
  const signed = (id: string) => signBillingId(id, SECRET);
  const warnings = () => JSON.stringify(vi.mocked(console.warn).mock.calls);

  it("trusts the ids our server signed, and logs nothing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const userId = crypto.randomUUID();
    expect(
      metadataIds(
        {
          user_id: userId,
          user_sig: signed(userId),
          replaces_subscription_id: REPLACED,
          replaces_sig: signed(REPLACED),
          plan: "pro",
        },
        SECRET,
        FIELDS,
      ),
    ).toEqual({ userId, replacesSubscriptionId: REPLACED });
    expect(warn).not.toHaveBeenCalled();
  });

  it("drops forged or unsigned ids and logs which keys, never the values", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const userId = crypto.randomUUID();
    for (const user_sig of [
      undefined,
      "0".repeat(64),
      signBillingId(userId, "someone_else's_secret"),
      signed(crypto.randomUUID()),
      signed(userId).toUpperCase(),
      42,
    ]) {
      expect(metadataIds({ user_id: userId, user_sig }, SECRET, FIELDS)).toEqual(NO_IDS);
    }
    expect(
      metadataIds({ replaces_subscription_id: REPLACED, replaces_sig: signed(userId) }, SECRET, {
        ...FIELDS,
        eventId: "msg_replaces",
      }),
    ).toEqual(NO_IDS);
    const logged = warnings();
    expect(logged).toContain("billing.unsigned_custom_data");
    expect(logged).toContain("msg_metadata");
    expect(logged).toContain('"keys":"user_id"');
    expect(logged).toContain('"keys":"replaces_subscription_id"');
    expect(logged).not.toContain(userId);
    expect(logged).not.toContain(REPLACED);
  });

  it("names both keys in one line when both are forged, keeping neither", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(
      metadataIds(
        { user_id: crypto.randomUUID(), replaces_subscription_id: REPLACED },
        SECRET,
        FIELDS,
      ),
    ).toEqual(NO_IDS);
    expect(vi.mocked(console.warn)).toHaveBeenCalledTimes(1);
    expect(warnings()).toContain('"keys":"user_id,replaces_subscription_id"');
  });

  it("trusts only string ids: a number, boolean, object or empty string never counts", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const value of [42, true, { id: "x" }, ["x"], ""]) {
      expect(
        metadataIds({ user_id: value, user_sig: signed(String(value)) }, SECRET, FIELDS),
      ).toEqual(NO_IDS);
    }
    expect(vi.mocked(console.warn)).toHaveBeenCalledTimes(5);
  });

  it("logs nothing for metadata without ids", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    for (const metadata of [
      undefined,
      null,
      {},
      { plan: "pro", interval: "month", trial: "1" },
      { user_id: null, replaces_subscription_id: null },
    ]) {
      expect(metadataIds(metadata, SECRET, FIELDS)).toEqual(NO_IDS);
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it("trusts nothing without a signing secret", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const userId = crypto.randomUUID();
    expect(
      metadataIds({ user_id: userId, user_sig: signBillingId(userId, "") }, "", FIELDS),
    ).toEqual(NO_IDS);
  });

  it("maps a delivered subscription or payment to the user only when the builders signed it", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const userId = crypto.randomUUID();
    const subscriptionOf = (metadata: Record<string, unknown>) =>
      DodoSubscriptionSchema.parse(
        JSON.parse(subscriptionEvent("subscription.active", { metadata })).data,
      );
    const signedSub = subscriptionOf({ user_id: userId });
    const forgedSub = subscriptionOf({ user_id: userId, user_sig: undefined });
    for (const [sub, expected] of [
      [signedSub, userId],
      [forgedSub, undefined],
    ] as const) {
      const ids = metadataIds(sub.metadata, SECRET, FIELDS);
      expect(toState(sub, null, CATALOG, ids).userId).toBe(expected);
    }
    const payment = DodoPaymentSchema.parse(
      JSON.parse(paymentEvent("payment.succeeded", { metadata: { user_id: userId } })).data,
    );
    expect(metadataIds(payment.metadata, SECRET, FIELDS).userId).toBe(userId);
    expect(
      metadataIds(signedSub.metadata, "another_signing_secret", FIELDS).userId,
    ).toBeUndefined();
  });
});
