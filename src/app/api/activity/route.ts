import { ActivitySchema, recordActivity } from "@/lib/analytics/activity";
import { posthogKey } from "@/lib/analytics/config";
import { trackingRefusedByHeaders } from "@/lib/analytics/privacy";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 60;
const NOTED = { noted: true };
const NOT_NOTED = { noted: false };

// An app page was opened: the section, and the email link that led here, if one did.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  if (!posthogKey() || trackingRefusedByHeaders(req.headers)) {
    return ok(NOT_NOTED, { headers: NO_STORE });
  }
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in first.", 401, NO_STORE);
    const limit = await rateLimit(`activity:user:${user.id}`, PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return fail("rate_limited", "Too many at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const body = await readJson(req, ActivitySchema);
    if (!body.ok) return fail("bad_request", "That didn't look right.", 400, NO_STORE);
    await recordActivity(user.id, body.data);
    return ok(NOTED, { headers: NO_STORE });
  } catch (error) {
    log.warn("analytics.activity_failed", {}, error);
    return ok(NOT_NOTED, { headers: NO_STORE });
  }
}
