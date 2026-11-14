import { createHmac } from "node:crypto";
import { signBillingId } from "./paddle-sign";

const PERIOD_START = "2026-11-08T10:00:00.000Z";
const PERIOD_END = "2026-12-08T10:00:00.000Z";
const TRIAL_PERIOD = { interval: "day", frequency: 3 };

// Builders sign custom_data's ids with this, as createPaddleCheckout does with the real secret.
export const WEBHOOK_TEST_SECRET = "pdl_ntfset_webhook_test_secret";

// A sig key that is already present, even as undefined, is left alone so tests can forge or drop it.
function signedCustomData(
  customData: Record<string, unknown> | null,
  secret = WEBHOOK_TEST_SECRET,
): Record<string, unknown> | null {
  if (!customData) return customData;
  const signed = { ...customData };
  for (const [idKey, sigKey] of [
    ["user_id", "user_sig"],
    ["replaces_subscription_id", "replaces_sig"],
  ] as const) {
    const id = signed[idKey];
    if (typeof id === "string" && !(sigKey in signed)) signed[sigKey] = signBillingId(id, secret);
  }
  return signed;
}

export function paddleSignature(
  rawBody: string,
  secret: string,
  ts = Math.floor(Date.now() / 1000),
): string {
  const h1 = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

export function paddleHeaders(rawBody: string, secret: string, ts?: number): Headers {
  return new Headers({ "paddle-signature": paddleSignature(rawBody, secret, ts) });
}

type Envelope = { id?: string; occurredAt?: number | string };

export type WebhookSubscription = {
  id?: string;
  status?: string;
  customer_id?: string;
  price_id?: string | string[];
  custom_data?: Record<string, unknown> | null;
  scheduled_change?: { action: string; effective_at?: string | null } | null;
  first_billed_at?: string | null;
  next_billed_at?: string | null;
  current_billing_period?: { starts_at: string; ends_at: string } | null;
  trial_ends_at?: string | null;
  trial_period?: boolean;
};

function envelope(eventType: string, data: unknown, event: Envelope): string {
  const at = event.occurredAt ?? Date.now();
  return JSON.stringify({
    event_id: event.id ?? `evt_${crypto.randomUUID()}`,
    event_type: eventType,
    occurred_at: typeof at === "number" ? new Date(at).toISOString() : at,
    notification_id: `ntf_${crypto.randomUUID()}`,
    data,
  });
}

export function subscriptionEvent(
  eventType: string,
  subscription: WebhookSubscription = {},
  event: Envelope = {},
): string {
  const prices = [subscription.price_id ?? "pri_pro_month"].flat();
  const trialEndsAt = subscription.trial_ends_at ?? null;
  const period =
    subscription.current_billing_period === undefined
      ? { starts_at: PERIOD_START, ends_at: PERIOD_END }
      : subscription.current_billing_period;
  // By default the subscription is in its first billed period, as Paddle reports it.
  const firstBilledAt =
    subscription.first_billed_at !== undefined
      ? subscription.first_billed_at
      : subscription.status === "trialing"
        ? null
        : (period?.starts_at ?? PERIOD_START);
  return envelope(
    eventType,
    {
      id: subscription.id ?? "sub_1",
      status: subscription.status ?? "active",
      customer_id: subscription.customer_id ?? "ctm_1",
      address_id: "add_1",
      currency_code: "USD",
      collection_mode: "automatic",
      billing_cycle: { interval: "month", frequency: 1 },
      items: prices.map((id) => ({
        status: subscription.status === "trialing" ? "trialing" : "active",
        quantity: 1,
        price: {
          id,
          product_id: "pro_1",
          trial_period: subscription.trial_period ? TRIAL_PERIOD : null,
        },
        trial_dates: trialEndsAt ? { starts_at: PERIOD_START, ends_at: trialEndsAt } : null,
      })),
      scheduled_change: subscription.scheduled_change ?? null,
      first_billed_at: firstBilledAt,
      next_billed_at:
        subscription.next_billed_at === undefined ? PERIOD_END : subscription.next_billed_at,
      current_billing_period: period,
      custom_data:
        subscription.custom_data === undefined ? {} : signedCustomData(subscription.custom_data),
    },
    event,
  );
}

export type WebhookTransaction = {
  id?: string;
  origin?: string;
  customer_id?: string | null;
  subscription_id?: string | null;
  price_id?: string;
  trial?: boolean;
  custom_data?: Record<string, unknown> | null;
};

export function transactionEvent(
  eventType: string,
  transaction: WebhookTransaction = {},
  event: Envelope = {},
): string {
  const trialPeriod = transaction.trial ? TRIAL_PERIOD : null;
  return envelope(
    eventType,
    {
      id: transaction.id ?? "txn_1",
      status: "completed",
      origin: transaction.origin ?? "api",
      customer_id: transaction.customer_id === undefined ? "ctm_1" : transaction.customer_id,
      subscription_id:
        transaction.subscription_id === undefined ? "sub_1" : transaction.subscription_id,
      currency_code: "USD",
      items: [
        {
          price_id: transaction.price_id ?? "pri_pro_month",
          quantity: 1,
          price: { id: transaction.price_id ?? "pri_pro_month", trial_period: trialPeriod },
        },
      ],
      custom_data:
        transaction.custom_data === undefined ? {} : signedCustomData(transaction.custom_data),
    },
    event,
  );
}

type WebhookAdjustment = {
  id?: string;
  action?: string;
  status?: string;
  transaction_id?: string;
  subscription_id?: string | null;
};

export function adjustmentEvent(
  eventType: string,
  adjustment: WebhookAdjustment = {},
  event: Envelope = {},
): string {
  return envelope(
    eventType,
    {
      id: adjustment.id ?? "adj_1",
      action: adjustment.action ?? "refund",
      status: adjustment.status ?? "pending_approval",
      transaction_id: adjustment.transaction_id ?? "txn_1",
      subscription_id:
        adjustment.subscription_id === undefined ? "sub_1" : adjustment.subscription_id,
      customer_id: "ctm_1",
      reason: "Customer asked for a refund",
      currency_code: "USD",
      items: [{ item_id: "txnitm_1", type: "full", amount: "1500" }],
    },
    event,
  );
}
