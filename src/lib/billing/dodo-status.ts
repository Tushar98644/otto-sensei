import { z } from "zod";
import { DAY_MS, HOUR_MS } from "@/lib/time";

const IdSchema = z.string().min(1).max(200);
const TimestampSchema = z.string().max(64).nullish();

// Only the fields we read; anything else Dodo adds is dropped, not refused.
export const DodoSubscriptionSchema = z.object({
  subscription_id: IdSchema,
  status: z.string().min(1).max(50),
  product_id: IdSchema,
  customer: z.object({
    customer_id: IdSchema,
    email: z.string().max(320).nullish(),
  }),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  created_at: TimestampSchema,
  previous_billing_date: TimestampSchema,
  next_billing_date: TimestampSchema,
  trial_period_days: z.number().nullish(),
  cancel_at_next_billing_date: z.boolean().nullish(),
  cancelled_at: TimestampSchema,
});

export type DodoSubscription = z.infer<typeof DodoSubscriptionSchema>;

type SubscriptionDates = Pick<
  DodoSubscription,
  "created_at" | "previous_billing_date" | "next_billing_date" | "trial_period_days"
>;

type SubscriptionStatus = SubscriptionDates &
  Pick<DodoSubscription, "status" | "cancel_at_next_billing_date">;

export type InternalStatus =
  "trialing" | "active" | "scheduled_cancel" | "past_due" | "on_hold" | "paused" | "canceled";

export type DodoIdKind = "cus" | "sub" | "pay" | "pdt" | "ref";

const DODO_ID = /^(cus|sub|pay|pdt|ref)_[A-Za-z0-9]{8,64}$/;
const PADDLE_ID = /^(sub|ctm|txn|pri)_[a-z0-9]{26}$/;

// Dodo reuses sub_, so a Paddle-shaped leftover must never pass as a Dodo id.
export function isDodoId(kind: DodoIdKind, id: string | null | undefined): id is string {
  return (
    typeof id === "string" && id.startsWith(`${kind}_`) && DODO_ID.test(id) && !PADDLE_ID.test(id)
  );
}

const NO_ZONE = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

function toMs(value: string | null | undefined): number | null {
  if (!value) return null;
  // A time without an offset is UTC here, never the server's local time.
  const ms = Date.parse(NO_ZONE.test(value) ? `${value}Z` : value);
  return Number.isFinite(ms) ? ms : null;
}

export function periodOf(sub: SubscriptionDates): { start: number | null; end: number | null } {
  return {
    start: toMs(sub.previous_billing_date) ?? toMs(sub.created_at),
    end: toMs(sub.next_billing_date),
  };
}

// Dodo has no trialing status: a trial is a first period no longer than the trial, an hour of slack.
export function inTrialWindow(sub: SubscriptionDates): boolean {
  const days = sub.trial_period_days ?? 0;
  if (days <= 0) return false;
  const { start, end } = periodOf(sub);
  if (start === null || end === null || end <= start) return false;
  const limit = days * DAY_MS + HOUR_MS;
  const created = toMs(sub.created_at);
  // A later period can be as short (keep_cycle change, on_hold recovery), so it must start near creation.
  if (created !== null && start - created > limit) return false;
  return end - start <= limit;
}

export function trialEndOf(sub: SubscriptionDates): number | null {
  return inTrialWindow(sub) ? periodOf(sub).end : null;
}

// Null for pending (not started), failed (never activated) and anything unknown: those change nothing.
export function internalStatus(sub: SubscriptionStatus): InternalStatus | null {
  switch (sub.status) {
    case "active":
      if (sub.cancel_at_next_billing_date === true) return "scheduled_cancel";
      return inTrialWindow(sub) ? "trialing" : "active";
    case "past_due":
      return "past_due";
    case "on_hold":
      return "on_hold";
    case "paused":
      return "paused";
    case "cancelled":
    case "canceled":
    case "expired":
      return "canceled";
    default:
      return null;
  }
}
