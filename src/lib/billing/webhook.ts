import { verifyWebhookSignature } from "creem/webhooks";
import { z } from "zod";
import { captureServerEvent } from "@/lib/analytics/server";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioSlugsOf } from "@/lib/portfolio/records";
import {
  applySubscriptionState,
  planForStatus,
  type ApplyResult,
  type SubscriptionState,
} from "./entitlements";
import type { ProductPlan } from "./intervals";

// Server-only. Creem signs every webhook (creem-signature: HMAC-SHA256 of the raw body with the
// webhook secret, checked by the official SDK) and redelivers anything but a 2xx up to 5 times
// within a day: 401 for a bad signature, 5xx when a retry could succeed, 200 for everything else.
// https://docs.creem.io/code/webhooks

export type WebhookResult = { status: number; message: string };

export type WebhookConfig = {
  /** CREEM_WEBHOOK_SECRET, from Developers > Webhooks in the Creem dashboard. */
  secret: string | undefined;
  /** Every paid product: Pro's and Max's per interval, and Pro monthly with the trial. */
  productIds: readonly string[];
  /** Which plan a product sells and how often it bills; null for products that aren't ours. */
  planForProduct: (productId: string | null | undefined) => ProductPlan | null;
};

// Real payloads are a few KB. Checked before the HMAC so oversized junk costs nothing.
const MAX_BODY_CHARS = 256 * 1024;
const MAX_EVENT_ID_CHARS = 255;

// Every subscription event carries the whole subscription, so they're all handled the same way:
// the status decides the plan, not the event name. checkout.completed carries the new
// subscription too, so the plan lands even if it arrives first.
// https://docs.creem.io/code/webhooks#event-types
const SUBSCRIPTION_EVENTS: ReadonlySet<string> = new Set([
  "subscription.active",
  "subscription.paid",
  "subscription.trialing",
  "subscription.update",
  "subscription.canceled",
  "subscription.scheduled_cancel",
  "subscription.past_due",
  "subscription.unpaid",
  "subscription.expired",
  "subscription.paused",
]);
const CHECKOUT_COMPLETED = "checkout.completed";

const EnvelopeSchema = z.object({
  id: z.string().max(MAX_EVENT_ID_CHARS).nullish(),
  eventType: z.string().min(1).max(100),
  created_at: z.number().int().nonnegative().nullish(),
  object: z.unknown(),
});

const IdSchema = z.string().min(1).max(200);
const ProductRef = z.union([IdSchema, z.object({ id: IdSchema })]);
const CustomerRef = z.union([IdSchema, z.object({ id: IdSchema, email: z.string().max(320).nullish() })]);

// Only the fields we use, lenient where Creem leaves them out.
const SubscriptionSchema = z.object({
  id: IdSchema,
  status: z.string().min(1).max(50),
  product: ProductRef,
  customer: CustomerRef,
  current_period_start_date: z.string().max(64).nullish(),
  current_period_end_date: z.string().max(64).nullish(),
  next_transaction_date: z.string().max(64).nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

// The checkout embeds the subscription with bare ids, and the product and customer as objects.
const CheckoutSchema = z.object({
  product: ProductRef.nullish(),
  customer: CustomerRef.nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  subscription: z.union([IdSchema, z.record(z.string(), z.unknown())]).nullish(),
});

type SubscriptionData = z.infer<typeof SubscriptionSchema>;
// null: nothing to apply (a one-time purchase, or a checkout naming its subscription by id only,
// whose own subscription events follow).
type Parsed = { data: SubscriptionData } | { invalid: string } | null;
type Context = { eventId: string; eventType: string };

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
  try {
    await verifyWebhookSignature(rawBody, headers, { secret: config.secret });
  } catch (error) {
    log.warn("billing.webhook_invalid", { reason: error instanceof Error ? error.message : "unknown" });
    return { status: 401, message: "invalid_signature" };
  }

  // Signed by Creem from here on, so anything unreadable is a bug on one side. A 5xx keeps the event
  // in Creem's retry queue, and visible in its dashboard, until it's fixed.
  const envelope = EnvelopeSchema.safeParse(parseJson(rawBody));
  // Retries keep the event id; a manual resend from the dashboard gets a new one.
  const eventId = envelope.success ? (envelope.data.id ?? headers.get("webhook-id") ?? "") : "";
  if (!envelope.success || eventId.length === 0 || eventId.length > MAX_EVENT_ID_CHARS) {
    log.error("billing.webhook_malformed", "unreadable envelope", { eventId: eventId.slice(0, 64) });
    return { status: 500, message: "malformed" };
  }
  const context: Context = { eventId, eventType: envelope.data.eventType };
  const isCheckout = context.eventType === CHECKOUT_COMPLETED;
  if (!isCheckout && !SUBSCRIPTION_EVENTS.has(context.eventType)) {
    log.info("billing.webhook_ignored", { ...context, reason: "event_type" });
    return { status: 200, message: "ignored" };
  }
  const parsed = isCheckout
    ? subscriptionOfCheckout(envelope.data.object)
    : readSubscription(envelope.data.object);
  if (parsed === null) {
    log.info("billing.webhook_ignored", { ...context, reason: "no_subscription" });
    return { status: 200, message: "ignored" };
  }
  if ("invalid" in parsed) {
    log.error("billing.webhook_malformed", `invalid ${parsed.invalid}`, context);
    return { status: 500, message: "malformed" };
  }

  const state = toState(parsed.data, context, envelope.data.created_at ?? null, config);
  let result: ApplyResult;
  try {
    result = await applySubscriptionState(state, context, now);
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  await report(result, { ...context, status: state.status });
  return result.outcome === "applied"
    ? { status: 200, message: "applied" }
    : { status: 200, message: result.outcome === "duplicate" ? "duplicate" : "ignored" };
}

function readSubscription(object: unknown): Parsed {
  const result = SubscriptionSchema.safeParse(object);
  if (result.success) return { data: result.data };
  return { invalid: result.error.issues[0]?.path.map(String).join(".") || "object" };
}

function subscriptionOfCheckout(object: unknown): Parsed {
  const checkout = CheckoutSchema.safeParse(object);
  if (!checkout.success) {
    return { invalid: checkout.error.issues[0]?.path.map(String).join(".") || "object" };
  }
  const { subscription, product, customer, metadata } = checkout.data;
  if (subscription === null || subscription === undefined || typeof subscription === "string") {
    return null;
  }
  return readSubscription({
    ...subscription,
    // The checkout's own product and customer are the full objects (with the email).
    product: product ?? subscription.product,
    customer: customer ?? subscription.customer,
    metadata: subscription.metadata ?? metadata,
  });
}

function toState(
  data: SubscriptionData,
  context: Context,
  createdAt: number | null,
  config: WebhookConfig,
): SubscriptionState {
  const metadataUserId = data.metadata?.user_id;
  const productId = typeof data.product === "string" ? data.product : data.product.id;
  const product = config.productIds.includes(productId) ? config.planForProduct(productId) : null;
  const customer = typeof data.customer === "string" ? { id: data.customer, email: null } : data.customer;
  // subscription.expired keeps the subscription's last status in the payload ("active"), but Creem
  // sends it because the period ended unpaid: access ends until a retried payment makes it paid.
  const status = context.eventType === "subscription.expired" ? "expired" : data.status;
  const periodEndsAt = parseTimestamp(data.current_period_end_date);
  return {
    userId: typeof metadataUserId === "string" && metadataUserId.length <= 200 ? metadataUserId : undefined,
    email: customer.email ?? undefined,
    customerId: customer.id,
    subscriptionId: data.id,
    // Every event carries the current product, so a plan change (Pro to Max, or monthly to
    // weekly) updates both.
    productPlan: product?.plan ?? null,
    productInterval: product?.interval ?? null,
    status,
    // A scheduled cancellation keeps access until the period ends, but nothing renews.
    renewsAt:
      status === "scheduled_cancel" ? null : (parseTimestamp(data.next_transaction_date) ?? periodEndsAt),
    // The AI allowance counts in this period (src/lib/usage.ts), so a renewal starts it over.
    periodStartsAt: parseTimestamp(data.current_period_start_date),
    periodEndsAt,
    eventAt: createdAt,
  };
}

async function report(
  result: ApplyResult,
  context: Context & { status: string },
): Promise<void> {
  if (result.outcome === "applied") {
    log.info("billing.plan_updated", {
      ...context,
      userId: result.userId,
      plan: result.plan,
      trialing: result.trialing,
    });
    // One checkout.completed per checkout; a redelivery is "duplicate".
    if (result.plan !== "free" && context.eventType === CHECKOUT_COMPLETED) {
      captureServerEvent(
        result.userId,
        "checkout_completed",
        { plan: result.plan, trial: result.trialing },
        { set: { plan: result.plan } },
      );
    }
    await refreshPublishedPage(result);
    return;
  }
  if (result.outcome === "duplicate") {
    log.info("billing.webhook_duplicate", context);
    return;
  }
  const fields = { ...context, reason: result.reason };
  // Someone may have paid without getting their plan, or Creem added a status: both need a person.
  // An ending subscription with no user is expected after an account deletion cancelled it.
  const paidWithoutUser = result.reason === "no_user" && planForStatus(context.status) === "paid";
  if (paidWithoutUser || result.reason === "unknown_status") {
    log.warn("billing.webhook_ignored", fields);
  } else {
    log.info("billing.webhook_ignored", fields);
  }
}

// A published portfolio shows only while its owner is on a paid (not trial) plan, so when that
// changes the cached page has to go now rather than within the hour.
async function refreshPublishedPage(result: Extract<ApplyResult, { outcome: "applied" }>) {
  const before = canPublishPortfolio(result.before.plan, result.before.trialing);
  if (before === canPublishPortfolio(result.plan, result.trialing)) return;
  try {
    refreshPortfolioPages(await portfolioSlugsOf(result.userId));
  } catch (error) {
    // The hourly revalidation still catches it.
    log.warn("billing.portfolio_refresh_failed", { userId: result.userId }, error);
  }
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
