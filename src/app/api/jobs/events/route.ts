import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { logAction, logImpressions } from "@/lib/job-feed/events";
import { ImpressionBatchSchema, MatchActionSchema } from "@/lib/job-feed/validation";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 120;
// A batch writes a page of rows, and a prefetched page is shown a few times a minute at most.
const IMPRESSION_BATCHES_PER_MINUTE = 20;
const EventSchema = z.union([ImpressionBatchSchema, MatchActionSchema]);

const tooMany = (retryAfterMs: number) =>
  fail("rate_limited", "Too many at once. Try again in a minute.", 429, {
    ...NO_STORE,
    ...retryAfterHeader(retryAfterMs),
  });

export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in first.", 401, NO_STORE);
    const limit = await rateLimit(`jobs-events:user:${user.id}`, PER_MINUTE, 60_000);
    if (!limit.allowed) return tooMany(limit.retryAfterMs);
    const body = await readJson(req, EventSchema);
    if (!body.ok) return fail("bad_request", "That didn't look right.", 400, NO_STORE);
    const db = await getDb();
    const now = Date.now();
    if (body.data.kind === "impressions") {
      const batches = await rateLimit(
        `jobs-impressions:user:${user.id}`,
        IMPRESSION_BATCHES_PER_MINUTE,
        60_000,
      );
      if (!batches.allowed) return tooMany(batches.retryAfterMs);
      const { requestId, variant, resumeHash, jobs } = body.data;
      await logImpressions(db, { userId: user.id, requestId, variant, resumeHash, now }, jobs);
    } else {
      await logAction(db, user.id, body.data, now);
    }
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
});
