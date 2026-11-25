import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { BillingError } from "@/lib/billing";
import { billingHistory } from "@/lib/billing/history";
import type { BillingHistoryResponse } from "@/lib/billing/history-types";
import { log } from "@/lib/log";
import { limitReads } from "../read-limit";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApiLocale(async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your billing.", 401, NO_STORE);
    const limited = await limitReads("history", user.id);
    if (limited) return limited;
    const history = await billingHistory(user);
    return ok({ history } satisfies Omit<BillingHistoryResponse, "ok">, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof BillingError) {
      return fail(
        "billing_unavailable",
        "We couldn't load your payments. Please try again in a minute.",
        503,
        NO_STORE,
      );
    }
    log.error("billing.history_failed", error);
    return fail("server_error", "Couldn't load your payments. Please try again.", 500, NO_STORE);
  }
});
