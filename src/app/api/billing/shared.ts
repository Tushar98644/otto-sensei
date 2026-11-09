import { fail } from "@/lib/api/respond";
import type { ApiErrorCode } from "@/lib/api/types";
import { BillingError, type BillingErrorCode } from "@/lib/billing";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";

// Server-only helpers for the checkout and portal routes.

const ERRORS: Record<BillingErrorCode, { code: ApiErrorCode; status: number; message: string }> = {
  unavailable: {
    code: "billing_unavailable",
    status: 503,
    message: "Payments aren't available yet. Please try again later.",
  },
  provider_error: {
    code: "billing_unavailable",
    status: 503,
    message: "We couldn't reach our payment provider. Please try again in a minute.",
  },
  no_subscription: {
    code: "bad_request",
    status: 400,
    message: "You don't have a subscription to manage yet.",
  },
  already_subscribed: { code: "bad_request", status: 400, message: "You're already on that plan." },
};

export function billingFailure(error: unknown, action: "checkout" | "portal"): Response {
  if (error instanceof BillingError) {
    const { code, status, message } = ERRORS[error.code];
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
