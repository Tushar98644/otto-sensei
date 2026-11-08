import type { DodoPayments } from "dodopayments";
import { Webhook } from "standardwebhooks";
import { z } from "zod";
import { captureServerEvent } from "@/lib/analytics/server";
import { log } from "@/lib/log";
import {
  applySubscriptionState,
  planForStatus,
  type ApplyResult,
  type SubscriptionState,
} from "./entitlements";
import type { ProductPlan } from "./intervals";

// Server-only. Dodo signs webhooks with Standard Webhooks and keeps redelivering anything but a 2xx,
// up to 8 attempts over about a day: 401 for a bad signature, 5xx when a retry could succeed, 200 for
// everything else. https://docs.dodopayments.com/developer-resources/webhooks

export type WebhookResult = { status: number; message: string };

export type WebhookConfig = {
  /** DODO_PAYMENTS_WEBHOOK_KEY ("whsec_..."). */
  secret: string | undefined;
  /** Every paid product: Pro's and Max's, monthly plus the optional yearly and weekly. */
  productIds: readonly string[];
  /** Which plan a product sells and how often it bills; null for products that aren't ours. */
  planForProduct: (productId: string | null | undefined) => ProductPlan | null;
};

// Real payloads are a few KB. Checked before the HMAC so oversized junk costs nothing.
const MAX_BODY_CHARS = 256 * 1024;
const MAX_EVENT_ID_CHARS = 255;

// Every subscription event carries the whole subscription as it is at delivery time, so they're all
// handled the same way: the status decides the plan, not the event name. A late retry therefore
// can't roll the plan back to an old status.
// https://docs.dodopayments.com/developer-resources/webhooks/intents/subscription
const SUBSCRIPTION_EVENTS: ReadonlySet<string> = new Set<string>([
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.plan_changed",
  "subscription.past_due",
  "subscription.on_hold",
  "subscription.paused",
  "subscription.unpaused",
  "subscription.cancelled",
  "subscription.failed",
  "subscription.expired",
  "subscription.update_payment_method",
] satisfies DodoPayments.WebhookEventType[]);

const EnvelopeSchema = z.object({ type: z.string().min(1).max(100), data: z.unknown() });

// Only the fields we use, lenient where the SDK marks them optional.
const SubscriptionSchema = z.object({
  subscription_id: z.string().min(1).max(200),
  product_id: z.string().max(200).nullish(),
  status: z.string().min(1).max(50),
  next_billing_date: z.string().max(64).nullish(),
  cancel_at_next_billing_date: z.boolean().nullish(),
  customer: z.object({
    customer_id: z.string().min(1).max(200),
    email: z.string().max(320).nullish(),
  }),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

type SubscriptionData = z.infer<typeof SubscriptionSchema>;

export async function processWebhook(
  rawBody: string,
  headers: Headers,
  config: WebhookConfig,
  now = Date.now(),
): Promise<WebhookResult> {
  if (!config.secret) {
    log.warn("billing.webhook_not_configured");
    return { status: 503, message: "not_configured" };
  }
  if (rawBody.length > MAX_BODY_CHARS) {
    log.warn("billing.webhook_too_large", { chars: rawBody.length });
    return { status: 413, message: "too_large" };
  }
  const rejected = verifySignature(rawBody, headers, config.secret);
  if (rejected) return rejected;

  // Signed by Dodo from here on, so anything unreadable is a bug on one side. A 5xx keeps the event
  // in Dodo's retry queue, and visible in its dashboard, until it's fixed.
  const eventId = headers.get("webhook-id") ?? "";
  const envelope = EnvelopeSchema.safeParse(parseJson(rawBody));
  if (!envelope.success || eventId.length > MAX_EVENT_ID_CHARS) {
    log.error("billing.webhook_malformed", "unreadable envelope", { eventId: eventId.slice(0, 64) });
    return { status: 500, message: "malformed" };
  }
  const context = { eventId, eventType: envelope.data.type };
  if (!SUBSCRIPTION_EVENTS.has(context.eventType)) {
    log.info("billing.webhook_ignored", { ...context, reason: "event_type" });
    return { status: 200, message: "ignored" };
  }
  const subscription = SubscriptionSchema.safeParse(envelope.data.data);
  if (!subscription.success) {
    const field = subscription.error.issues[0]?.path.map(String).join(".") || "data";
    log.error("billing.webhook_malformed", `invalid ${field}`, context);
    return { status: 500, message: "malformed" };
  }

  let result: ApplyResult;
  try {
    result = await applySubscriptionState(toState(subscription.data, config), context, now);
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  return report(result, { ...context, status: subscription.data.status });
}

function verifySignature(rawBody: string, headers: Headers, secret: string): WebhookResult | null {
  let webhook: Webhook;
  try {
    webhook = new Webhook(secret);
  } catch (error) {
    log.error("billing.webhook_bad_secret", error);
    return { status: 500, message: "not_configured" };
  }
  try {
    // Also rejects timestamps more than 5 minutes off, so a captured request can't be replayed later.
    webhook.verify(
      rawBody,
      {
        "webhook-id": headers.get("webhook-id") ?? "",
        "webhook-signature": headers.get("webhook-signature") ?? "",
        "webhook-timestamp": headers.get("webhook-timestamp") ?? "",
      },
      { jsonParse: false },
    );
    return null;
  } catch (error) {
    log.warn("billing.webhook_invalid", { reason: error instanceof Error ? error.message : "unknown" });
    return { status: 401, message: "invalid_signature" };
  }
}

function toState(data: SubscriptionData, config: WebhookConfig): SubscriptionState {
  const metadataUserId = data.metadata?.user_id;
  const product =
    typeof data.product_id === "string" && config.productIds.includes(data.product_id)
      ? config.planForProduct(data.product_id)
      : null;
  return {
    userId: typeof metadataUserId === "string" && metadataUserId.length <= 200 ? metadataUserId : undefined,
    email: data.customer.email ?? undefined,
    customerId: data.customer.customer_id,
    subscriptionId: data.subscription_id,
    // Every event carries the current product, so a plan change (Pro to Max, or monthly to
    // weekly) updates both.
    productPlan: product?.plan ?? null,
    productInterval: product?.interval ?? null,
    status: data.status,
    // A scheduled cancellation keeps access until the period ends, but nothing renews.
    renewsAt: data.cancel_at_next_billing_date ? null : parseTimestamp(data.next_billing_date),
  };
}

function report(
  result: ApplyResult,
  context: { eventId: string; eventType: string; status: string },
): WebhookResult {
  if (result.outcome === "applied") {
    log.info("billing.plan_updated", { ...context, userId: result.userId, plan: result.plan });
    // Activation, not renewal: renewals arrive as subscription.renewed. A redelivery is "duplicate".
    if (result.plan !== "free" && context.eventType === "subscription.active") {
      captureServerEvent(
        result.userId,
        "checkout_completed",
        { plan: result.plan },
        { set: { plan: result.plan } },
      );
    }
    return { status: 200, message: "applied" };
  }
  if (result.outcome === "duplicate") {
    log.info("billing.webhook_duplicate", context);
    return { status: 200, message: "duplicate" };
  }
  const fields = { ...context, reason: result.reason };
  // Someone may have paid without getting their plan, or Dodo added a status: both need a person.
  // An ending subscription with no user is expected after an account deletion cancelled it.
  const paidWithoutUser = result.reason === "no_user" && planForStatus(context.status) === "paid";
  if (paidWithoutUser || result.reason === "unknown_status") {
    log.warn("billing.webhook_ignored", fields);
  } else {
    log.info("billing.webhook_ignored", fields);
  }
  return { status: 200, message: "ignored" };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
