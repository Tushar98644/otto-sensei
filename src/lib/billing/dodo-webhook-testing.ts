import { createHmac, randomUUID } from "node:crypto";
import { DAY_MS } from "@/lib/time";
import { signBillingId } from "./billing-sign";
import type { DodoDispute, DodoPayment, DodoRefund } from "./dodo-events";
import type { DodoSubscription } from "./dodo-status";

// Until real test-mode payloads are captured, these follow the shapes in Dodo's docs and SDK.

export const DODO_WEBHOOK_TEST_SECRET = `whsec_${Buffer.from("otto-sensei-dodo-webhook-test-key").toString("base64")}`;

// Builders sign metadata ids with this, as checkout does with BILLING_SIGNING_SECRET.
export const BILLING_TEST_SIGNING_SECRET = "otto_billing_signing_test_secret";

export const DODO_TEST_IDS = {
  business: "bus_TestBusiness00000001",
  customer: "cus_TestCustomer00000001",
  subscription: "sub_TestSubscription0001",
  payment: "pay_TestPayment000000001",
  refund: "ref_TestRefund0000000001",
  dispute: "dsp_TestDispute000000001",
} as const;

export const DODO_TEST_PRODUCTS = {
  proMonth: "pdt_TestProMonth00000001",
  proYear: "pdt_TestProYear000000001",
  maxMonth: "pdt_TestMaxMonth00000001",
  maxYear: "pdt_TestMaxYear000000001",
  proTrial: "pdt_TestProTrial00000001",
} as const;

// Dodo writes microseconds, like 2026-11-08T10:00:00.000000Z.
export function dodoTime(ms: number): string {
  return new Date(ms).toISOString().replace("Z", "000Z");
}

const START = Date.UTC(2026, 10, 8, 10);

export const TEST_DATES = {
  start: START,
  trialEnd: START + 3 * DAY_MS,
  monthEnd: Date.UTC(2026, 11, 8, 10),
  monthAfterTrial: Date.UTC(2026, 11, 11, 10),
  yearEnd: Date.UTC(2027, 10, 8, 10),
} as const;

// A $1 trial's first period, then the first paid month after it converts.
export const ON_TRIAL = {
  trial_period_days: 3,
  created_at: dodoTime(START),
  previous_billing_date: dodoTime(START),
  next_billing_date: dodoTime(TEST_DATES.trialEnd),
};

export const AFTER_TRIAL = {
  trial_period_days: 3,
  created_at: dodoTime(START),
  previous_billing_date: dodoTime(TEST_DATES.trialEnd),
  next_billing_date: dodoTime(TEST_DATES.monthAfterTrial),
};

type Metadata = Record<string, unknown> | null;

// A sig key that is already present, even as undefined, is left alone so tests can forge or drop it.
function signedMetadata(metadata: Metadata, secret = BILLING_TEST_SIGNING_SECRET): Metadata {
  if (!metadata) return metadata;
  const signed = { ...metadata };
  for (const [idKey, sigKey] of [
    ["user_id", "user_sig"],
    ["replaces_subscription_id", "replaces_sig"],
  ] as const) {
    const id = signed[idKey];
    if (typeof id === "string" && !(sigKey in signed)) signed[sigKey] = signBillingId(id, secret);
  }
  return signed;
}

export function standardWebhookSignature(
  body: string,
  secret: string,
  id: string,
  timestamp: number,
): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

export type Delivery = { id?: string; timestamp?: number };

export function standardWebhookHeaders(
  body: string,
  secret = DODO_WEBHOOK_TEST_SECRET,
  delivery: Delivery = {},
): Headers {
  const id = delivery.id ?? `msg_${randomUUID().replaceAll("-", "")}`;
  const timestamp = delivery.timestamp ?? Math.floor(Date.now() / 1000);
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": standardWebhookSignature(body, secret, id, timestamp),
  });
}

export type EnvelopeOptions = { timestamp?: number | string; businessId?: string };

function envelope(type: string, data: Record<string, unknown>, options: EnvelopeOptions): string {
  const at = options.timestamp ?? Date.now();
  return JSON.stringify({
    business_id: options.businessId ?? DODO_TEST_IDS.business,
    type,
    timestamp: typeof at === "number" ? dodoTime(at) : at,
    data,
  });
}

const customer = (fields: Record<string, unknown> | undefined) => ({
  customer_id: DODO_TEST_IDS.customer,
  email: "ada@example.com",
  name: "Ada Lovelace",
  ...fields,
});

const STATUS_BY_EVENT: Record<string, string> = {
  "subscription.past_due": "past_due",
  "subscription.on_hold": "on_hold",
  "subscription.paused": "paused",
  "subscription.cancelled": "cancelled",
  "subscription.expired": "expired",
  "subscription.failed": "failed",
};

export type SubscriptionFields = Partial<Omit<DodoSubscription, "customer">> & {
  customer?: Partial<DodoSubscription["customer"]>;
  payment_id?: string | null;
  past_due_ends_at?: string | null;
  scheduled_change?: Record<string, unknown> | null;
  cancelled_by?: Record<string, unknown> | null;
  trial_amount?: number | null;
  recurring_pre_tax_amount?: number;
};

// Pro monthly, paid and active by default; the status follows the event name unless given.
export function subscriptionPayload(
  type = "subscription.active",
  fields: SubscriptionFields = {},
): Record<string, unknown> {
  const { customer: customerFields, metadata, ...rest } = fields;
  return {
    payload_type: "Subscription",
    subscription_id: DODO_TEST_IDS.subscription,
    business_id: DODO_TEST_IDS.business,
    brand_id: DODO_TEST_IDS.business,
    status: STATUS_BY_EVENT[type] ?? "active",
    product_id: DODO_TEST_PRODUCTS.proMonth,
    quantity: 1,
    currency: "USD",
    recurring_pre_tax_amount: 1500,
    tax_inclusive: false,
    trial_amount: null,
    trial_period_days: 0,
    payment_frequency_count: 1,
    payment_frequency_interval: "Month",
    subscription_period_count: 20,
    subscription_period_interval: "Year",
    created_at: dodoTime(START),
    previous_billing_date: dodoTime(START),
    next_billing_date: dodoTime(TEST_DATES.monthEnd),
    cancel_at_next_billing_date: false,
    cancelled_at: null,
    cancelled_by: null,
    scheduled_change: null,
    past_due_ends_at: null,
    payment_id: null,
    on_demand: false,
    has_payment_method: true,
    billing_mode: "normal",
    addons: [],
    meters: [],
    billing: { country: "US", state: null, city: null, street: null, zipcode: null },
    customer: customer(customerFields),
    metadata: signedMetadata(metadata === undefined ? {} : metadata),
    ...rest,
  };
}

export function subscriptionEvent(
  type = "subscription.active",
  fields: SubscriptionFields = {},
  options: EnvelopeOptions = {},
): string {
  return envelope(type, subscriptionPayload(type, fields), options);
}

export type PaymentFields = Partial<Omit<DodoPayment, "customer">> & {
  customer?: Partial<DodoPayment["customer"]>;
  total_amount?: number;
  currency?: string;
  retry_attempt?: number;
  error_code?: string | null;
  checkout_session_id?: string | null;
};

// The $1 trial charge of a new subscription by default; the status follows the event name.
export function paymentEvent(
  type = "payment.succeeded",
  fields: PaymentFields = {},
  options: EnvelopeOptions = {},
): string {
  const { customer: customerFields, metadata, ...rest } = fields;
  const failed = type === "payment.failed";
  return envelope(
    type,
    {
      payload_type: "Payment",
      payment_id: DODO_TEST_IDS.payment,
      business_id: DODO_TEST_IDS.business,
      brand_id: DODO_TEST_IDS.business,
      subscription_id: DODO_TEST_IDS.subscription,
      subscription_ids: [DODO_TEST_IDS.subscription],
      status: type.split(".")[1] ?? "succeeded",
      charge_type: "new",
      total_amount: 100,
      tax: 0,
      currency: "USD",
      settlement_amount: 100,
      settlement_currency: "USD",
      retry_attempt: 0,
      is_multi_subscription: false,
      is_update_payment_method: false,
      includes_usage: false,
      product_cart: null,
      refunds: [],
      disputes: [],
      digital_products_delivered: false,
      payment_provider: "stripe",
      payment_method: "card",
      card_network: "VISA",
      card_last_four: "4242",
      error_code: failed ? "CARD_DECLINED" : null,
      error_message: failed ? "The card was declined" : null,
      checkout_session_id: "cks_TestCheckout00000001",
      created_at: dodoTime(START),
      customer: customer(customerFields),
      metadata: signedMetadata(metadata === undefined ? {} : metadata),
      ...rest,
    },
    options,
  );
}

export type RefundFields = Partial<DodoRefund> & { reason?: string | null };

export function refundEvent(
  type = "refund.succeeded",
  fields: RefundFields = {},
  options: EnvelopeOptions = {},
): string {
  return envelope(
    type,
    {
      payload_type: "Refund",
      refund_id: DODO_TEST_IDS.refund,
      payment_id: DODO_TEST_IDS.payment,
      business_id: DODO_TEST_IDS.business,
      brand_id: DODO_TEST_IDS.business,
      status: type.split(".")[1] ?? "succeeded",
      is_partial: false,
      amount: 100,
      currency: "USD",
      reason: "Second trial on the same email",
      metadata: {},
      network_reference: null,
      created_at: dodoTime(START),
      customer: customer(undefined),
      ...fields,
    },
    options,
  );
}

export type DisputeFields = Partial<DodoDispute> & { remarks?: string | null };

// The dispute_status follows the event name, as dispute.lost carries dispute_lost.
export function disputeEvent(
  type = "dispute.opened",
  fields: DisputeFields = {},
  options: EnvelopeOptions = {},
): string {
  return envelope(
    type,
    {
      payload_type: "Dispute",
      dispute_id: DODO_TEST_IDS.dispute,
      payment_id: DODO_TEST_IDS.payment,
      business_id: DODO_TEST_IDS.business,
      amount: "1500",
      currency: "USD",
      dispute_stage: "dispute",
      dispute_status: `dispute_${type.split(".")[1] ?? "opened"}`,
      is_resolved_by_rdr: false,
      remarks: null,
      created_at: dodoTime(START),
      ...fields,
    },
    options,
  );
}
