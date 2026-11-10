import { fail } from "@/lib/api/respond";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { PORTFOLIO_LIMITS } from "@/lib/portfolio/types";

// Per-user answers, so no browser or CDN may keep a copy.
export const NO_STORE = { "Cache-Control": "no-store" };

export const SIGN_IN = "Sign in to make your portfolio.";
export const NO_PORTFOLIO = "You don't have a portfolio yet. Make one from a resume first.";
export const NEEDS_PLAN =
  "Portfolios come with Pro and Max. Try Pro free for 3 days to build yours.";

const HOUR_MS = 60 * 60 * 1000;

/** Making and changing the portfolio share one hourly budget per account. A 429 when it's spent. */
export async function writeLimited(userId: string): Promise<Response | null> {
  const limit = await rateLimit(
    `portfolio:write:user:${userId}`,
    PORTFOLIO_LIMITS.writesPerHour,
    HOUR_MS,
  );
  if (limit.allowed) return null;
  return fail(
    "rate_limited",
    `That's a lot of portfolio changes in one hour. Try again in ${waitText(limit.retryAfterMs)}.`,
    429,
    retryAfterHeader(limit.retryAfterMs),
  );
}
