import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { ensureRecap, markRecapSeen } from "@/lib/recap/records";
import type { RecapIndexResponse, RecapSeenResponse } from "@/lib/recap/types";
import { EnsureRecapSchema, RecapSeenSchema } from "@/lib/recap/validation";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to see your week with Otto.";
const PER_MINUTE = 20;

// Builds the week that ended last, once, and lists what's there to open.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const limit = await rateLimit(`recap:user:${user.id}`, PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return fail("rate_limited", "Too many at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const body = await readJson(req, EnsureRecapSchema);
    if (!body.ok) return fail("bad_request", "That didn't look right.", 400, NO_STORE);
    const index: Omit<RecapIndexResponse, "ok"> = await ensureRecap(user, body.data.timeZone);
    return ok(index, { headers: NO_STORE });
  } catch (error) {
    log.error("recap.ensure_failed", error);
    return fail("server_error", "Couldn't load your week. Please try again.", 500, NO_STORE);
  }
});

export const PATCH = withApiLocale(async function PATCH(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, RecapSeenSchema);
    if (!body.ok) return fail("bad_request", "That week couldn't be marked.", 400, NO_STORE);
    await markRecapSeen(user.id, body.data.week);
    const response: Omit<RecapSeenResponse, "ok"> = {};
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("recap.seen_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
});
