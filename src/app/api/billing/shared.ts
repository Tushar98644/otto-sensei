import { BRAND } from "@/config/brand";
import { centsText, TOPUP_LIMITS } from "@/config/topup";
import { fail } from "@/lib/api/respond";
import type { ApiErrorCode } from "@/lib/api/types";
import { BillingError, type BillingErrorDetails, type BillingRefusalReason } from "@/lib/billing";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

type Failure = { code: ApiErrorCode; status: number; message: string };
type Action = "checkout" | "portal";
type Step = Action | "change_plan";

const OVERDUE_MESSAGE =
  "We couldn't change your plan: your last payment didn't go through. Update your card in Manage billing, then try again.";

export const CHANGE_NOT_OFFERED_MESSAGE =
  "In the app a plan only moves up from Pro to Max, on the billing period you already have. To move to Pro, or between monthly and yearly, cancel from your account page and pick the new plan once your current period ends.";

const CREDIT_PLAN_MESSAGE =
  "Credit works on a paid Pro or Max plan, once any trial has ended. Your plan's allowance comes first.";

function creditFullMessage({ roomCents = 0 }: BillingErrorDetails): string {
  const cap = `Your balance holds up to $${TOPUP_LIMITS.maxBalanceUsd}`;
  const room = Math.floor(roomCents / 100);
  return room >= TOPUP_LIMITS.minUsd
    ? `${cap}, so you can add up to $${room} right now.`
    : `${cap}, and yours has ${centsText(Math.max(0, roomCents))} of room left. Use some, then add more.`;
}

const ALREADY_SUBSCRIBED: Failure = {
  code: "bad_request",
  status: 400,
  message: "You're already on that plan.",
};

const MISSING: Record<Step, string> = {
  change_plan: "we couldn't find your subscription",
  portal: "we couldn't find your billing account",
  checkout: "that plan isn't on sale right now",
};

function failureFor(error: BillingError, action: Action): Failure {
  switch (error.code) {
    case "unavailable":
      return {
        code: "billing_unavailable",
        status: 503,
        message: "Payments aren't available yet. Please try again later.",
      };
    case "provider_error":
      return {
        code: "billing_unavailable",
        status: 503,
        message: "We couldn't reach our payment provider. Please try again in a minute.",
      };
    case "no_subscription":
      return {
        code: "bad_request",
        status: 400,
        message: "You don't have a subscription to manage yet.",
      };
    case "already_subscribed":
      return ALREADY_SUBSCRIBED;
    case "change_not_offered":
      return { code: "plan_change_failed", status: 409, message: CHANGE_NOT_OFFERED_MESSAGE };
    case "payment_overdue":
      return { code: "plan_change_failed", status: 409, message: OVERDUE_MESSAGE };
    case "credit_not_on_plan":
      return { code: "upgrade_required", status: 402, message: CREDIT_PLAN_MESSAGE };
    case "credit_full":
      return { code: "bad_request", status: 409, message: creditFullMessage(error.details) };
    case "refused":
      return refusedFailure(error.details, action);
  }
}

function refusedFailure({ operation, reason }: BillingErrorDetails, action: Action): Failure {
  // The provider found a subscription our own check missed: the same answer as that check.
  if (reason === "has_subscription") return ALREADY_SUBSCRIBED;
  const changing = operation === "change_plan";
  const what = changing
    ? "change your plan"
    : action === "portal"
      ? "open billing"
      : "start checkout";
  const code: ApiErrorCode = changing ? "plan_change_failed" : "billing_unavailable";
  // An upgrade can end in a billing link, so the call that failed names what is missing.
  const step: Step = changing ? "change_plan" : operation === "portal" ? "portal" : action;
  const [status, explanation] = refusalCopy(reason, step);
  return { code, status, message: `We couldn't ${what}: ${explanation}` };
}

function refusalCopy(
  reason: Exclude<BillingRefusalReason, "has_subscription"> | undefined,
  step: Step,
): [status: number, explanation: string] {
  switch (reason) {
    case "busy":
      return [
        409,
        "your subscription is busy with a renewal or another change. Try again in a little while.",
      ];
    case "inactive":
      return [409, "your subscription isn't active right now. Refresh the page and try again."];
    case "declined":
      return [409, "your card was declined. Update your card in Manage billing, then try again."];
    case "misconfigured":
      return [502, "payments aren't set up right on our side. Please try again later."];
    case "rate_limited":
      return [503, "our payment provider is busy. Please try again in a minute."];
    case "not_found":
      return [409, `${MISSING[step]}. Refresh the page and try again.`];
    case undefined:
      return [
        409,
        `our payment provider turned the request down. Email us at ${BRAND.supportEmail} and we'll sort it out.`,
      ];
  }
}

export function billingFailure(error: unknown, action: Action): Response {
  if (error instanceof BillingError) {
    const { code, status, message } = failureFor(error, action);
    return fail(code, message, status);
  }
  log.error(`billing.${action}_failed`, error);
  return fail("server_error", "Something went wrong. Please try again.", 500);
}

// Each link is a call to the payment provider: one account mustn't use up the rate limit all customers share.
const LINKS_PER_HOUR = 20;

export async function limitBillingLinks(userId: string): Promise<Response | null> {
  const result = await rateLimit(`billing:user:${userId}`, LINKS_PER_HOUR, HOUR_MS);
  if (result.allowed) return null;
  return fail(
    "rate_limited",
    `Too many tries. Try again in ${waitText(result.retryAfterMs)}.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}
