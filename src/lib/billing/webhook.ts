import { verifyWebhookSignature } from "creem/webhooks";
import { z } from "zod";
import { captureServerEvent } from "@/lib/analytics/server";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioSlugsOf } from "@/lib/portfolio/records";
import { REPLACES_METADATA_KEY } from "./creem";
import {
  applySubscriptionState,
  planForStatus,
  type ApplyResult,
  type SubscriptionState,
} from "./entitlements";
import type { ProductPlan } from "./intervals";
import { settleReplacement } from "./replacements";

// Creem redelivers any non-2xx up to 5 times in a day, so only retryable failures get a 5xx.

export type WebhookResult = { status: number; message: string };

export type WebhookConfig = {
  secret: string | undefined;
  productIds: readonly string[];
  planForProduct: (productId: string | null | undefined) => ProductPlan | null;
};

const MAX_BODY_CHARS = 256 * 1024;
const MAX_EVENT_ID_CHARS = 255;

// Status decides the plan, not the event name; checkout.completed may arrive first.
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
const CustomerRef = z.union([
  IdSchema,
  z.object({ id: IdSchema, email: z.string().max(320).nullish() }),
]);

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

const CheckoutSchema = z.object({
  product: ProductRef.nullish(),
  customer: CustomerRef.nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  subscription: z.union([IdSchema, z.record(z.string(), z.unknown())]).nullish(),
});

type SubscriptionData = z.infer<typeof SubscriptionSchema>;
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
    log.warn("billing.webhook_invalid", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { status: 401, message: "invalid_signature" };
  }

  const envelope = EnvelopeSchema.safeParse(parseJson(rawBody));
  // Retries keep the event id; a manual resend from the dashboard gets a new one.
  const eventId = envelope.success ? (envelope.data.id ?? headers.get("webhook-id") ?? "") : "";
  if (!envelope.success || eventId.length === 0 || eventId.length > MAX_EVENT_ID_CHARS) {
    log.error("billing.webhook_malformed", "unreadable envelope", {
      eventId: eventId.slice(0, 64),
    });
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
  const replaced = state.replacesSubscriptionId;
  if (replaced) {
    let settled: boolean;
    try {
      settled = await settleReplacement(replaced, now);
    } catch (error) {
      log.error("billing.replace_cancel_failed", error, { ...context, subscriptionId: replaced });
      settled = false;
    }
    if (!settled) return { status: 500, message: "retry" };
  }
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
  const replaces = IdSchema.safeParse(data.metadata?.[REPLACES_METADATA_KEY]);
  const productId = typeof data.product === "string" ? data.product : data.product.id;
  const product = config.productIds.includes(productId) ? config.planForProduct(productId) : null;
  const customer =
    typeof data.customer === "string" ? { id: data.customer, email: null } : data.customer;
  // subscription.expired still carries the last status ("active"), but it means access ended.
  const status = context.eventType === "subscription.expired" ? "expired" : data.status;
  const periodEndsAt = parseTimestamp(data.current_period_end_date);
  return {
    userId:
      typeof metadataUserId === "string" && metadataUserId.length <= 200
        ? metadataUserId
        : undefined,
    email: customer.email ?? undefined,
    customerId: customer.id,
    subscriptionId: data.id,
    productPlan: product?.plan ?? null,
    productInterval: product?.interval ?? null,
    status,
    renewsAt:
      status === "scheduled_cancel"
        ? null
        : (parseTimestamp(data.next_transaction_date) ?? periodEndsAt),
    periodStartsAt: parseTimestamp(data.current_period_start_date),
    periodEndsAt,
    eventAt: createdAt,
    replacesSubscriptionId: replaces.success ? replaces.data : null,
  };
}

async function report(result: ApplyResult, context: Context & { status: string }): Promise<void> {
  if (result.outcome === "applied") {
    log.info("billing.plan_updated", {
      ...context,
      userId: result.userId,
      plan: result.plan,
      trialing: result.trialing,
    });
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
  const paidWithoutUser = result.reason === "no_user" && planForStatus(context.status) === "paid";
  if (paidWithoutUser || result.reason === "unknown_status") {
    log.warn("billing.webhook_ignored", fields);
  } else {
    log.info("billing.webhook_ignored", fields);
  }
}

async function refreshPublishedPage(result: Extract<ApplyResult, { outcome: "applied" }>) {
  if (canPublishPortfolio(result.before.plan) === canPublishPortfolio(result.plan)) return;
  try {
    refreshPortfolioPages(await portfolioSlugsOf(result.userId));
  } catch (error) {
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
