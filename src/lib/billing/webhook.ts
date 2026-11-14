import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { captureServerEvent } from "@/lib/analytics/server";
import { log } from "@/lib/log";
import { refreshPortfolioPages } from "@/lib/portfolio/cache";
import { canPublishPortfolio } from "@/lib/portfolio/plan";
import { portfolioSlugsOf } from "@/lib/portfolio/records";
import {
  applySubscriptionState,
  claimBillingEvent,
  findBillingUserId,
  planForStatus,
  type ApplyResult,
  type SubscriptionState,
} from "./entitlements";
import { verifyBillingId } from "./paddle-sign";
import { settleReplacement } from "./replacements";

// Paddle redelivers any non-2xx for about two days on live, so only retryable failures get a 5xx.

export type WebhookResult = { status: number; message: string };

type PricePlan = { plan: PaidPlanId; interval: BillingInterval };

export type WebhookConfig = {
  secret: string | undefined;
  priceIds: readonly string[];
  planForPrice: (priceId: string) => PricePlan | null | undefined;
  trialPriceId?: string | null;
  customerEmail?: (customerId: string) => Promise<string | null>;
};

const MAX_BODY_CHARS = 256 * 1024;
const MAX_EVENT_ID_CHARS = 255;
const MAX_SIGNATURE_CHARS = 2048;
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const SIGNED_KEYS = [
  { id: "user_id", sig: "user_sig" },
  { id: "replaces_subscription_id", sig: "replaces_sig" },
] as const;

// Status decides the plan, not the event name; Paddle doesn't deliver in order.
const SUBSCRIPTION_EVENTS: ReadonlySet<string> = new Set([
  "subscription.created",
  "subscription.trialing",
  "subscription.activated",
  "subscription.updated",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "subscription.canceled",
]);
const TRANSACTION_COMPLETED = "transaction.completed";
// Refunds, credits and chargebacks change no plan; they're logged for the owner to act on.
const ADJUSTMENT_EVENTS: ReadonlySet<string> = new Set([
  "adjustment.created",
  "adjustment.updated",
]);
// A subscription's first transaction is its checkout; renewals and plan changes have other origins.
const CHECKOUT_ORIGINS: ReadonlySet<string> = new Set(["web", "api"]);

const EnvelopeSchema = z.object({
  event_id: z.string().min(1).max(MAX_EVENT_ID_CHARS),
  event_type: z.string().min(1).max(100),
  occurred_at: z.string().max(64).nullish(),
  data: z.unknown(),
});

const IdSchema = z.string().min(1).max(200);
const TimestampSchema = z.string().max(64).nullish();
const CustomDataSchema = z.record(z.string(), z.unknown()).nullish();

const SubscriptionSchema = z.object({
  id: IdSchema,
  status: z.string().min(1).max(50),
  customer_id: IdSchema,
  items: z
    .array(
      z.object({
        price: z.object({ id: IdSchema, trial_period: z.unknown().nullish() }),
        trial_dates: z.object({ ends_at: TimestampSchema }).nullish(),
      }),
    )
    .max(100),
  scheduled_change: z.object({ action: z.string().max(50) }).nullish(),
  first_billed_at: TimestampSchema,
  next_billed_at: TimestampSchema,
  current_billing_period: z
    .object({ starts_at: TimestampSchema, ends_at: TimestampSchema })
    .nullish(),
  custom_data: CustomDataSchema,
});

const TransactionSchema = z.object({
  id: IdSchema,
  origin: z.string().max(100).nullish(),
  customer_id: IdSchema.nullish(),
  subscription_id: IdSchema.nullish(),
  custom_data: CustomDataSchema,
  items: z
    .array(z.object({ price: z.object({ id: IdSchema, trial_period: z.unknown().nullish() }) }))
    .max(100),
});

const AdjustmentSchema = z.object({
  id: IdSchema,
  action: z.string().min(1).max(50),
  status: z.string().min(1).max(50),
  transaction_id: IdSchema.nullish(),
  subscription_id: IdSchema.nullish(),
});

type SubscriptionData = z.infer<typeof SubscriptionSchema>;
type CustomData = z.infer<typeof CustomDataSchema>;
type Context = { eventId: string; eventType: string };
type TrustedIds = { userId: string | undefined; replacesSubscriptionId: string | null };
type SignatureCheck = "valid" | "missing" | "malformed" | "mismatch" | "stale";

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
  const signature = checkSignature(rawBody, headers.get("paddle-signature"), config.secret, now);
  if (signature !== "valid") {
    log.warn("billing.webhook_invalid", { reason: signature });
    return { status: 401, message: "invalid_signature" };
  }

  const json = parseJson(rawBody);
  const envelope = EnvelopeSchema.safeParse(json);
  if (!envelope.success) {
    log.error("billing.webhook_malformed", "unreadable envelope", { eventId: eventIdOf(json) });
    return { status: 500, message: "malformed" };
  }
  // event_id stays the same across retries; notification_id changes on every delivery.
  const context: Context = {
    eventId: envelope.data.event_id,
    eventType: envelope.data.event_type,
  };
  if (context.eventType === TRANSACTION_COMPLETED) {
    return recordCheckout(envelope.data.data, context, { ...config, secret: config.secret }, now);
  }
  if (ADJUSTMENT_EVENTS.has(context.eventType)) {
    return recordAdjustment(envelope.data.data, context, now);
  }
  if (!SUBSCRIPTION_EVENTS.has(context.eventType)) {
    log.info("billing.webhook_ignored", { ...context, reason: "event_type" });
    return { status: 200, message: "ignored" };
  }
  const parsed = SubscriptionSchema.safeParse(envelope.data.data);
  if (!parsed.success) return malformed(parsed.error, context);

  const ids = trustedIds(parsed.data.custom_data, config.secret, {
    ...context,
    subscriptionId: parsed.data.id,
  });
  const state = toState(parsed.data, parseTimestamp(envelope.data.occurred_at), config, ids);
  let result: ApplyResult;
  try {
    result = await applySubscriptionState(state, context, now, {
      resolveEmail: config.customerEmail,
    });
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  if (result.outcome === "rejected") {
    log.warn("billing.trial_reused", {
      ...context,
      userId: result.userId,
      subscriptionId: state.subscriptionId,
    });
    await cancelReusedTrial(state.subscriptionId, context, now);
    return { status: 200, message: "ignored" };
  }
  await report(result, { ...context, status: state.status, subscriptionId: state.subscriptionId });
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

function checkSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now: number,
): SignatureCheck {
  if (!header) return "missing";
  if (header.length > MAX_SIGNATURE_CHARS) return "malformed";
  let ts: string | undefined;
  const signatures: Buffer[] = [];
  for (const part of header.split(";")) {
    const [key, value = ""] = part.split("=", 2).map((piece) => piece.trim());
    if (key === "ts") ts = value;
    // Paddle sends one h1 per secret while a secret is being rotated.
    if (key === "h1" && /^[0-9a-f]{64}$/i.test(value)) signatures.push(Buffer.from(value, "hex"));
  }
  if (!ts || !/^\d{1,12}$/.test(ts) || signatures.length === 0) return "malformed";
  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  if (!signatures.some((candidate) => timingSafeEqual(candidate, expected))) return "mismatch";
  return Math.abs(now - Number(ts) * 1000) > SIGNATURE_TOLERANCE_MS ? "stale" : "valid";
}

// Paddle.js lets anyone set custom_data, so an id counts only with the signature our server added.
function trustedIds(
  customData: CustomData,
  secret: string,
  fields: Context & Record<string, string>,
): TrustedIds {
  const unsigned: string[] = [];
  const [userId, replaces] = SIGNED_KEYS.map(({ id, sig }) => {
    const value = customData?.[id];
    if (value === undefined || value === null) return null;
    const valid = IdSchema.safeParse(value);
    if (valid.success && verifyBillingId(valid.data, customData?.[sig], secret)) return valid.data;
    unsigned.push(id);
    return null;
  });
  if (unsigned.length > 0) {
    log.warn("billing.unsigned_custom_data", { ...fields, keys: unsigned.join(",") });
  }
  return { userId: userId ?? undefined, replacesSubscriptionId: replaces ?? null };
}

function toState(
  data: SubscriptionData,
  eventAt: number | null,
  config: WebhookConfig,
  ids: TrustedIds,
): SubscriptionState {
  const ours = data.items.find((item) => config.priceIds.includes(item.price.id));
  const price = ours ? (config.planForPrice(ours.price.id) ?? null) : null;
  const cancelling = data.scheduled_change?.action === "cancel";
  // Paddle has no such status: a cancel is pending on an active or trialing subscription.
  const status =
    cancelling && (data.status === "active" || data.status === "trialing")
      ? "scheduled_cancel"
      : data.status;
  const onTrialPrice =
    ours !== undefined &&
    ((config.trialPriceId && ours.price.id === config.trialPriceId) ||
      hasTrialPeriod(ours.price.trial_period));
  return {
    userId: ids.userId,
    customerId: data.customer_id,
    subscriptionId: data.id,
    pricePlan: price?.plan ?? null,
    priceInterval: price?.interval ?? null,
    status,
    renewsAt: status === "scheduled_cancel" ? null : parseTimestamp(data.next_billed_at),
    periodStartsAt: parseTimestamp(data.current_billing_period?.starts_at),
    periodEndsAt: parseTimestamp(data.current_billing_period?.ends_at),
    trialEndsAt: trialEndOf(data, ours),
    eventAt,
    replacesSubscriptionId: ids.replacesSubscriptionId,
    unpaidTrial:
      data.status === "trialing" || (data.status === "past_due" && onTrialPrice && neverPaid(data)),
  };
}

// A trial whose first charge failed is past_due in its first billed period; a renewal moves the period on.
function neverPaid(data: SubscriptionData): boolean {
  const firstBilled = parseTimestamp(data.first_billed_at);
  const periodStart = parseTimestamp(data.current_billing_period?.starts_at);
  return firstBilled === null || periodStart === null || periodStart <= firstBilled;
}

function hasTrialPeriod(trialPeriod: unknown): boolean {
  return trialPeriod !== null && trialPeriod !== undefined;
}

function trialEndOf(
  data: SubscriptionData,
  item: SubscriptionData["items"][number] | undefined,
): number | null | undefined {
  if (data.status === "active") return null;
  if (data.status !== "trialing") return undefined;
  const dated =
    item?.trial_dates ?? data.items.find((candidate) => candidate.trial_dates)?.trial_dates;
  return (
    parseTimestamp(dated?.ends_at) ??
    parseTimestamp(data.next_billed_at) ??
    parseTimestamp(data.current_billing_period?.ends_at) ??
    undefined
  );
}

async function recordCheckout(
  object: unknown,
  context: Context,
  config: WebhookConfig & { secret: string },
  now: number,
): Promise<WebhookResult> {
  const parsed = TransactionSchema.safeParse(object);
  if (!parsed.success) return malformed(parsed.error, context);
  const transaction = parsed.data;
  const ignore = (reason: string): WebhookResult => {
    log.info("billing.webhook_ignored", { ...context, reason });
    return { status: 200, message: "ignored" };
  };
  const { subscription_id: subscriptionId, customer_id: customerId } = transaction;
  if (!subscriptionId || !customerId) return ignore("no_subscription");
  if (!CHECKOUT_ORIGINS.has(transaction.origin ?? "")) return ignore("not_checkout");
  const item = transaction.items.find((candidate) => config.priceIds.includes(candidate.price.id));
  const price = item ? config.planForPrice(item.price.id) : null;
  if (!item || !price) return ignore("other_product");
  const ids = trustedIds(transaction.custom_data, config.secret, {
    ...context,
    transactionId: transaction.id,
  });
  try {
    const userId = await findBillingUserId({ userId: ids.userId, customerId, subscriptionId });
    if (!userId) return ignore("no_user");
    // Keyed by subscription, so a replay with a new event id still counts once.
    if (!(await claimBillingEvent(`checkout:${subscriptionId}`, context.eventType, now))) {
      log.info("billing.webhook_duplicate", context);
      return { status: 200, message: "duplicate" };
    }
    const trial = hasTrialPeriod(item.price.trial_period);
    captureServerEvent(
      userId,
      "checkout_completed",
      { plan: price.plan, trial },
      { set: { plan: price.plan } },
    );
    log.info("billing.checkout_completed", { ...context, userId, plan: price.plan, trial });
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  return { status: 200, message: "applied" };
}

async function recordAdjustment(
  object: unknown,
  context: Context,
  now: number,
): Promise<WebhookResult> {
  const parsed = AdjustmentSchema.safeParse(object);
  if (!parsed.success) return malformed(parsed.error, context);
  const adjustment = parsed.data;
  try {
    if (!(await claimBillingEvent(context.eventId, context.eventType, now))) {
      log.info("billing.webhook_duplicate", context);
      return { status: 200, message: "duplicate" };
    }
  } catch (error) {
    log.error("billing.webhook_failed", error, context);
    return { status: 500, message: "retry" };
  }
  log.warn("billing.adjustment", {
    ...context,
    action: adjustment.action,
    status: adjustment.status,
    adjustmentId: adjustment.id,
    transactionId: adjustment.transaction_id ?? null,
    subscriptionId: adjustment.subscription_id ?? null,
  });
  return { status: 200, message: "applied" };
}

// A failed cancel keeps its trial_replacements row for the daily cron, so Paddle needn't redeliver.
async function cancelReusedTrial(
  subscriptionId: string,
  context: Context,
  now: number,
): Promise<void> {
  try {
    await settleReplacement(subscriptionId, now);
  } catch (error) {
    log.error("billing.replace_cancel_failed", error, { ...context, subscriptionId });
  }
}

function malformed(error: z.ZodError, context: Context): WebhookResult {
  const path = error.issues[0]?.path.map(String).join(".") || "object";
  log.error("billing.webhook_malformed", `invalid ${path}`, context);
  return { status: 500, message: "malformed" };
}

async function report(
  result: Exclude<ApplyResult, { outcome: "rejected" }>,
  context: Context & { status: string; subscriptionId: string },
): Promise<void> {
  if (result.outcome === "applied") {
    log.info("billing.plan_updated", {
      ...context,
      userId: result.userId,
      plan: result.plan,
      trialing: result.trialing,
    });
    if (result.otherLiveSubscriptionId) {
      log.error("billing.second_live_subscription", "a second live subscription took over", {
        ...context,
        userId: result.userId,
        otherSubscriptionId: result.otherLiveSubscriptionId,
      });
    }
    await refreshPublishedPage(result);
    return;
  }
  if (result.outcome === "duplicate") {
    log.info("billing.webhook_duplicate", context);
    return;
  }
  const fields = { ...context, reason: result.reason };
  if (result.reason === "unsigned") {
    log.error(
      "billing.unsigned_subscription",
      "a subscription without our signed id was not applied",
      fields,
    );
    return;
  }
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

function eventIdOf(json: unknown): string {
  if (typeof json !== "object" || json === null || !("event_id" in json)) return "";
  return typeof json.event_id === "string" ? json.event_id.slice(0, 64) : "";
}

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
