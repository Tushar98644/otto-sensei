import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { MeResponse } from "@/lib/api/types";
import { authMode, getCurrentUser } from "@/lib/auth/session";
import { billingMode, trialAvailableFor } from "@/lib/billing";
import { billingOffer, trialOffered } from "@/lib/billing/intervals";
import { log } from "@/lib/log";
import { getUsageState } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const [state, trial] = user
      ? await Promise.all([getUsageState(user), trialAvailableFor(user)])
      : [null, trialOffered()];
    const response: Omit<MeResponse, "ok"> = {
      user,
      usage: state?.usage ?? null,
      period: state?.period ?? null,
      aiBudget: state?.aiBudget ?? null,
      billing: { mode: billingMode(), offer: billingOffer(), trial },
      auth: { mode: authMode() },
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("me.failed", error);
    return fail("server_error", "Couldn't load your account. Please try again.", 500, NO_STORE);
  }
}
