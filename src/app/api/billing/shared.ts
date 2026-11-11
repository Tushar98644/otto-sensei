import { BRAND } from "@/config/brand";
import { fail } from "@/lib/api/respond";
import type { ApiErrorCode } from "@/lib/api/types";
import { BillingError, type BillingErrorDetails } from "@/lib/billing";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";

// Server-only helpers for the checkout and portal routes.

type Failure = { code: ApiErrorCode; status: number; message: string };
type Action = "checkout" | "portal";

const OVERDUE_MESSAGE =
  "We couldn't change your plan: your last payment didn't go through. Update your card in Manage billing, then try again.";

function failureFor(error: BillingError, action: Action): Failure {
  switch (error.code) {
    case "unavailable":
      return {
        code: "billing_unavailable",
        status: 503,
        message: "Payments aren't available yet. Please try again later.",
      };
    // Only for a network problem, a timeout or a 5xx: Creem never got to say no.
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
      return { code: "bad_request", status: 400, message: "You're already on that plan." };
    case "payment_overdue":
      return { code: "plan_change_failed", status: 409, message: OVERDUE_MESSAGE };
    case "refused":
      return refusedFailure(error.details, action);
  }
}

// Creem answered and said no, so nothing changed. Its own wording is never shown: it can be
// technical, and only these cases are known well enough to explain.
function refusedFailure(details: BillingErrorDetails, action: Action): Failure {
  const changing = details.operation === "change_plan";
  const what = changing
    ? "change your plan"
    : action === "portal"
      ? "open billing"
      : "start checkout";
  const code: ApiErrorCode = changing ? "plan_change_failed" : "billing_unavailable";
  const [status, reason] = refusalReason(details, changing ? "change_plan" : action);
  return { code, status, message: `We couldn't ${what}: ${reason}` };
}

function refusalReason(
  { providerCode, providerStatus }: BillingErrorDetails,
  action: Action | "change_plan",
): [status: number, reason: string] {
  if (providerCode === "subscription_not_active") {
    return [409, "your subscription isn't active right now. Refresh the page and try again."];
  }
  // Our API key or account, not anything the person did.
  if (providerStatus === 401 || providerStatus === 403) {
    return [502, "payments aren't set up right on our side. Please try again later."];
  }
  if (providerStatus === 429) {
    return [503, "our payment provider is busy. Please try again in a minute."];
  }
  if (providerStatus === 404) {
    const missing =
      action === "change_plan"
        ? "we couldn't find your subscription"
        : action === "portal"
          ? "we couldn't find your billing account"
          : "that plan isn't on sale right now";
    return [409, `${missing}. Refresh the page and try again.`];
  }
  return [
    409,
    `our payment provider turned the request down. Email us at ${BRAND.supportEmail} and we'll sort it out.`,
  ];
}

export function billingFailure(error: unknown, action: Action): Response {
  if (error instanceof BillingError) {
    const { code, status, message } = failureFor(error, action);
    return fail(code, message, status);
  }
  log.error(`billing.${action}_failed`, error);
  return fail("server_error", "Something went wrong. Please try again.", 500);
}

// Each link costs a Creem API call on our key; a per-user cap stops one account from using up the
// API rate limit that every customer shares.
const LINKS_PER_HOUR = 20;
const HOUR_MS = 60 * 60 * 1000;

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
