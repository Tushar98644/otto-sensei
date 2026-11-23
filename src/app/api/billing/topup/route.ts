import { upgradeReturnPath } from "@/components/account/upgrade-return";
import { TOPUP_LIMITS } from "@/config/topup";
import { captureServerEvent } from "@/lib/analytics/server";
import { fail, ok } from "@/lib/api/respond";
import { TopupRequestSchema, type UrlResponse } from "@/lib/api/types";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentAccount } from "@/lib/auth/session";
import { createTopupUrl } from "@/lib/billing";
import { readJson } from "@/lib/http";
import { billingFailure, limitBillingLinks } from "../shared";

export const runtime = "nodejs";

const BAD_AMOUNT = `Pick a whole-dollar amount from $${TOPUP_LIMITS.minUsd} to $${TOPUP_LIMITS.maxUsd}.`;

// The amount is read once, here; after this only our record of the checkout and Dodo's payment count.
export async function POST(req: Request) {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", "Sign in to add credit.", 401);
    const { user, billing } = account;
    const limited = await limitBillingLinks(user.id);
    if (limited) return limited;
    const body = await readJson(req, TopupRequestSchema);
    if (!body.ok) return fail("bad_request", BAD_AMOUNT, 400);
    const { usd, next } = body.data;
    const url = await createTopupUrl(
      user,
      usd,
      upgradeReturnPath(next ?? null),
      Date.now(),
      billing,
    );
    captureServerEvent(user.id, "credit_checkout_started", { usd });
    return ok({ url } satisfies Omit<UrlResponse, "ok">);
  } catch (error) {
    return billingFailure(error, "checkout");
  }
}
