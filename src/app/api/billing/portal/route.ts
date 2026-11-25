import { fail, ok } from "@/lib/api/respond";
import type { UrlResponse } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { createPortalUrl } from "@/lib/billing";
import { billingFailure, limitBillingLinks } from "../shared";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";

export const POST = withApiLocale(async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to manage your plan.", 401);
    const limited = await limitBillingLinks(user.id);
    if (limited) return limited;
    const url = await createPortalUrl(user);
    return ok({ url } satisfies Omit<UrlResponse, "ok">);
  } catch (error) {
    return billingFailure(error, "portal");
  }
});
