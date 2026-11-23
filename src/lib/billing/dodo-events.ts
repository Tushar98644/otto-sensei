import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { log } from "@/lib/log";
import { verifyBillingId } from "./billing-sign";
import {
  inTrialWindow,
  internalStatus,
  periodOf,
  trialEndOf,
  type DodoSubscription,
} from "./dodo-status";
import type { SubscriptionState } from "./entitlements";

const MAX_EVENT_ID_CHARS = 255;
const MAX_SIGNATURE_CHARS = 2048;
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;
const TIMESTAMP = /^\d{1,12}$/;
const SIGNATURE = /^[A-Za-z0-9+/]{43}=?$/;
const BASE64 = /^[A-Za-z0-9+/]+$/;
const SECRET_PREFIX = "whsec_";

export type SignatureCheck = "valid" | "missing" | "malformed" | "mismatch" | "stale";

export type WebhookVerification =
  { check: "valid"; eventId: string } | { check: Exclude<SignatureCheck, "valid">; eventId: null };

// Standard Webhooks keys are the secret after "whsec_", base64-decoded; null when it can't be one.
export function webhookKey(secret: string): Buffer | null {
  const trimmed = secret.trim();
  const encoded = (
    trimmed.startsWith(SECRET_PREFIX) ? trimmed.slice(SECRET_PREFIX.length) : trimmed
  ).replace(/={1,2}$/, "");
  if (!BASE64.test(encoded) || encoded.length % 4 === 1) return null;
  return Buffer.from(encoded, "base64");
}

export function verifyWebhook(
  rawBody: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
): WebhookVerification {
  const refuse = (check: Exclude<SignatureCheck, "valid">): WebhookVerification => ({
    check,
    eventId: null,
  });
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signature = headers.get("webhook-signature");
  if (!id || !timestamp || !signature) return refuse("missing");
  if (
    id.length > MAX_EVENT_ID_CHARS ||
    !TIMESTAMP.test(timestamp) ||
    signature.length > MAX_SIGNATURE_CHARS
  ) {
    return refuse("malformed");
  }
  // A rotation can bring one entry per secret: any matching v1 entry counts, other versions are skipped.
  const candidates = signature.split(" ").flatMap((entry) => {
    const value = entry.startsWith("v1,") ? entry.slice(3) : "";
    return SIGNATURE.test(value) ? [Buffer.from(value, "base64")] : [];
  });
  const key = webhookKey(secret);
  if (candidates.length === 0 || !key) return refuse("malformed");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();
  if (!candidates.some((candidate) => timingSafeEqual(candidate, expected))) {
    return refuse("mismatch");
  }
  if (Math.abs(now - Number(timestamp) * 1000) > SIGNATURE_TOLERANCE_MS) return refuse("stale");
  return { check: "valid", eventId: id };
}

export type EventKind =
  "subscription" | "payment_succeeded" | "payment_failed" | "refund" | "dispute" | "other";

const SUBSCRIPTION_EVENTS = [
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.plan_changed",
  "subscription.past_due",
  "subscription.on_hold",
  "subscription.paused",
  "subscription.unpaused",
  "subscription.cancelled",
  "subscription.expired",
  "subscription.failed",
  "subscription.update_payment_method",
];
const DISPUTE_EVENTS = [
  "dispute.opened",
  "dispute.challenged",
  "dispute.accepted",
  "dispute.cancelled",
  "dispute.expired",
  "dispute.won",
  "dispute.lost",
];

const KIND_BY_TYPE: ReadonlyMap<string, EventKind> = new Map<string, EventKind>([
  ...SUBSCRIPTION_EVENTS.map((type): [string, EventKind] => [type, "subscription"]),
  ["payment.succeeded", "payment_succeeded"],
  ["payment.failed", "payment_failed"],
  ["refund.succeeded", "refund"],
  ["refund.failed", "refund"],
  ...DISPUTE_EVENTS.map((type): [string, EventKind] => [type, "dispute"]),
]);

// The endpoint's filter_types: an empty filter would deliver every event type.
export const HANDLED_EVENT_TYPES: readonly string[] = [...KIND_BY_TYPE.keys()];

export function classify(type: string): EventKind {
  return KIND_BY_TYPE.get(type) ?? "other";
}

const IdSchema = z.string().min(1).max(200);
const MetadataSchema = z.record(z.string(), z.unknown()).nullish();
const AmountSchema = z.union([z.number(), z.string().max(50)]);

export const EnvelopeSchema = z.object({
  business_id: z.string().max(200).nullish(),
  type: z.string().min(1).max(100),
  timestamp: z.string().max(64).nullish(),
  data: z.unknown(),
});

export type DodoEvent = { type: string; kind: EventKind; eventAt: number | null; data: unknown };

export type EnvelopeRead = { ok: true; event: DodoEvent } | { ok: false; problem: string };

export function readEnvelope(rawBody: string): EnvelopeRead {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, problem: "json" };
  }
  const parsed = EnvelopeSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, problem: parsed.error.issues[0]?.path.map(String).join(".") || "envelope" };
  }
  const { type, timestamp, data } = parsed.data;
  return { ok: true, event: { type, kind: classify(type), eventAt: toMs(timestamp), data } };
}

const NO_ZONE = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(NO_ZONE.test(value) ? `${value}Z` : value);
  return Number.isFinite(ms) ? ms : null;
}

export const DodoPaymentSchema = z.object({
  payment_id: IdSchema,
  subscription_id: IdSchema.nullish(),
  status: z.string().max(50).nullish(),
  charge_type: z.string().max(50).nullish(),
  metadata: MetadataSchema,
  customer: z.object({ customer_id: IdSchema }),
});

// Only the top-up path reads a one-time payment's products and amounts, so only it refuses odd ones.
export const TopupPaymentSchema = DodoPaymentSchema.extend({
  product_cart: z
    .array(z.object({ product_id: IdSchema, quantity: z.number().int().min(1) }))
    .min(1)
    .max(20),
  total_amount: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative().nullish(),
  currency: z.string().min(3).max(10),
  checkout_session_id: IdSchema.nullish(),
});

const CartProducts = z
  .object({
    product_cart: z
      .array(z.object({ product_id: z.string() }).catch({ product_id: "" }))
      .nullish()
      .catch(null),
  })
  .catch({ product_cart: null });

// The products a payment names, read leniently: any payment may carry an odd cart.
export function cartProducts(data: unknown): string[] {
  const cart = CartProducts.parse(data).product_cart ?? [];
  return cart.map((item) => item.product_id).filter(Boolean);
}

export const DodoRefundSchema = z.object({
  refund_id: IdSchema,
  payment_id: IdSchema,
  status: z.string().min(1).max(50),
  is_partial: z.boolean(),
  amount: AmountSchema.nullish(),
  currency: z.string().max(10).nullish(),
});

export const DodoDisputeSchema = z.object({
  dispute_id: IdSchema,
  payment_id: IdSchema,
  dispute_status: z.string().min(1).max(50),
  dispute_stage: z.string().min(1).max(50),
  amount: AmountSchema,
  currency: z.string().max(10),
  is_resolved_by_rdr: z.boolean().nullish(),
});

export type DodoPayment = z.infer<typeof DodoPaymentSchema>;
export type TopupPayment = z.infer<typeof TopupPaymentSchema>;
export type DodoRefund = z.infer<typeof DodoRefundSchema>;
export type DodoDispute = z.infer<typeof DodoDisputeSchema>;

type ProductPlan = { plan: PaidPlanId; interval: BillingInterval };

export type ProductCatalog = {
  productIds: readonly string[];
  planForProduct: (productId: string) => ProductPlan | null | undefined;
};

export type TrustedIds = { userId: string | undefined; replacesSubscriptionId: string | null };

export function toState(
  sub: DodoSubscription,
  eventAt: number | null,
  catalog: ProductCatalog,
  ids: TrustedIds,
): SubscriptionState {
  const ours = catalog.productIds.includes(sub.product_id)
    ? (catalog.planForProduct(sub.product_id) ?? null)
    : null;
  const mapped = internalStatus(sub);
  const { start, end } = periodOf(sub);
  return {
    userId: ids.userId,
    customerId: sub.customer.customer_id,
    subscriptionId: sub.subscription_id,
    pricePlan: ours?.plan ?? null,
    priceInterval: ours?.interval ?? null,
    // Pending, failed and unknown statuses get a word no plan maps to, so they change nothing.
    status: mapped ?? `dodo:${sub.status}`,
    renewsAt: mapped === "scheduled_cancel" || mapped === "canceled" ? null : end,
    periodStartsAt: start,
    periodEndsAt: end,
    trialEndsAt: trialEndOf(sub),
    eventAt,
    replacesSubscriptionId: ids.replacesSubscriptionId,
    // A failed first full charge leaves the dates on the trial window, so it is still unpaid.
    unpaidTrial: (sub.status === "active" || sub.status === "past_due") && inTrialWindow(sub),
  };
}

const SIGNED_KEYS = [
  { id: "user_id", sig: "user_sig" },
  { id: "replaces_subscription_id", sig: "replaces_sig" },
] as const;

// Anyone can put metadata on a Dodo payment link, so an id counts only with the signature our server added.
export function metadataIds(
  metadata: Record<string, unknown> | null | undefined,
  signingSecret: string,
  fields: Record<string, string>,
): TrustedIds {
  const unsigned: string[] = [];
  const [userId, replaces] = SIGNED_KEYS.map(({ id, sig }) => {
    const value = metadata?.[id];
    if (value === undefined || value === null) return null;
    const valid = IdSchema.safeParse(value);
    if (valid.success && verifyBillingId(valid.data, metadata?.[sig], signingSecret)) {
      return valid.data;
    }
    unsigned.push(id);
    return null;
  });
  if (unsigned.length > 0) {
    log.warn("billing.unsigned_custom_data", { ...fields, keys: unsigned.join(",") });
  }
  return { userId: userId ?? undefined, replacesSubscriptionId: replaces ?? null };
}
