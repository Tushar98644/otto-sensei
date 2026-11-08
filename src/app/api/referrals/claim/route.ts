import { fail, ok } from "@/lib/api/respond";
import type { ReferralClaimResponse } from "@/lib/api/types";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { claimFromCookie } from "@/lib/referrals/cookie";

export const runtime = "nodejs";

const CLAIMS_PER_HOUR = 10;
const HOUR_MS = 60 * 60 * 1000;

// POST /api/referrals/claim (body {}): sent by the browser after sign-in while it holds an invite
// cookie. The code comes from the cookie, never the body.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in first.", 401);
    const limit = await rateLimit(`referral:claim:${user.id}`, CLAIMS_PER_HOUR, HOUR_MS);
    if (!limit.allowed) {
      return fail(
        "rate_limited",
        `Too many tries. Try again in ${waitText(limit.retryAfterMs)}.`,
        429,
        retryAfterHeader(limit.retryAfterMs),
      );
    }
    const outcome = await claimFromCookie(user, { checked: false });
    return ok({ outcome } satisfies Omit<ReferralClaimResponse, "ok">);
  } catch (error) {
    log.error("referral.claim_failed", error);
    return fail("server_error", "Something went wrong. Please try again.", 500);
  }
}
