import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { logAction } from "@/lib/job-feed/events";
import { MatchActionSchema } from "@/lib/job-feed/validation";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 120;

export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in first.", 401, NO_STORE);
    const limit = await rateLimit(`jobs-events:user:${user.id}`, PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return fail("rate_limited", "Too many at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const body = await readJson(req, MatchActionSchema);
    if (!body.ok) return fail("bad_request", "That didn't look right.", 400, NO_STORE);
    await logAction(await getDb(), user.id, body.data, Date.now());
    return ok({}, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.event_failed", error);
    return fail(
      "server_error",
      "Couldn't note that. It doesn't change anything else.",
      500,
      NO_STORE,
    );
  }
}
