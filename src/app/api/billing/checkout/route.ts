import { upgradeReturnPath } from "@/components/account/upgrade-return";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { fail, ok } from "@/lib/api/respond";
import { CheckoutRequestSchema, type UrlResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { createCheckoutUrl } from "@/lib/billing";
import { readJson } from "@/lib/http";
import { billingFailure, limitBillingLinks } from "../shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to upgrade.", 401);
    const limited = await limitBillingLinks(user.id);
    if (limited) return limited;
    const choice = await requestedChoice(req);
    if (!choice) return fail("bad_request", "Pick a plan and how often you'd like to pay.", 400);
    const url = await createCheckoutUrl(user, choice.plan, choice.interval, choice.next);
    return ok({ url } satisfies Omit<UrlResponse, "ok">);
  } catch (error) {
    return billingFailure(error, "checkout");
  }
}

type Choice = { plan: PaidPlanId; interval: BillingInterval; next: string | null };

async function requestedChoice(req: Request): Promise<Choice | null> {
  if (!/^application\/json\b/i.test(req.headers.get("content-type") ?? "")) {
    return { plan: "pro", interval: "month", next: null };
  }
  const body = await readJson(req, CheckoutRequestSchema);
  if (!body.ok) return null;
  const { plan, interval, next } = body.data;
  return { plan, interval, next: upgradeReturnPath(next) };
}
