import type { MeResponse } from "@/lib/api/types";
import { authMode } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { billingMode, trialAvailableFor } from "@/lib/billing";
import { billingOffer, trialOffered } from "@/lib/billing/intervals";
import { getUsageState } from "@/lib/usage";

export type MePayload = Omit<MeResponse, "ok">;

// GET /api/me's answer; the dashboard layout hands the same one to the browser with the page.
export async function mePayload(user: SessionUser | null): Promise<MePayload> {
  const [state, trial] = user
    ? await Promise.all([getUsageState(user), trialAvailableFor(user)])
    : [null, trialOffered()];
  return {
    user,
    usage: state?.usage ?? null,
    period: state?.period ?? null,
    aiBudget: state?.aiBudget ?? null,
    billing: { mode: billingMode(), offer: billingOffer(), trial },
    auth: { mode: authMode() },
  };
}
