import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { ReferralSummaryResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { referralSummary } from "@/lib/referrals/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to get your invite link.";

// Remembers this browser as the owner's, so a sign-up from it can't count as a friend.
export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const summary = await referralSummary(user.id, await getDeviceId());
    if (!summary) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    return ok({ referrals: summary } satisfies Omit<ReferralSummaryResponse, "ok">, {
      headers: NO_STORE,
    });
  } catch (error) {
    log.error("referral.summary_failed", error);
    return fail("server_error", "Couldn't load your invite link. Please try again.", 500, NO_STORE);
  }
}
