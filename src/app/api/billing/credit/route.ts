import { fail, NO_STORE, ok } from "@/lib/api/respond";
import type { CreditActivityResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { creditActivity, creditState } from "@/lib/billing/credit";
import { creditOffered } from "@/lib/billing/intervals";
import { log } from "@/lib/log";
import { limitReads } from "../read-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see your credit.", 401, NO_STORE);
    if (!creditOffered()) return fail("not_found", "Credit isn't on sale.", 404, NO_STORE);
    const limited = await limitReads("credit", user.id);
    if (limited) return limited;
    const [credit, activity] = await Promise.all([creditState(user), creditActivity(user.id)]);
    return ok({ credit, activity } satisfies Omit<CreditActivityResponse, "ok">, {
      headers: NO_STORE,
    });
  } catch (error) {
    log.error("billing.credit_failed", error);
    return fail("server_error", "Couldn't load your credit. Please try again.", 500, NO_STORE);
  }
}
