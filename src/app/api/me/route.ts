import { fail, ok } from "@/lib/api/respond";
import type { MeResponse } from "@/lib/api/types";
import { authMode, getCurrentUser } from "@/lib/auth/session";
import { billingMode } from "@/lib/billing";
import { billingOffer } from "@/lib/billing/intervals";
import { log } from "@/lib/log";
import { getUsageState } from "@/lib/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-user and changes after every AI call, so no browser or CDN may keep a copy.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    const state = user ? await getUsageState(user) : null;
    const response: Omit<MeResponse, "ok"> = {
      user,
      usage: state?.usage ?? null,
      period: state?.period ?? null,
      billing: { mode: billingMode(), offer: billingOffer() },
      auth: { mode: authMode() },
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("me.failed", error);
    return fail("server_error", "Couldn't load your account. Please try again.", 500, NO_STORE);
  }
}
