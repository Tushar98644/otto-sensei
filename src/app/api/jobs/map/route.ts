import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { withApiLocale } from "@/lib/api/localize";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readWorkProfile } from "@/lib/eligibility/records";
import { readJson } from "@/lib/http";
import { uiLocaleOf } from "@/lib/i18n/request";
import { jobLangsFor } from "@/lib/job-feed/job-langs";
import { mapCompanies } from "@/lib/job-feed/map";
import type { JobMapResponse } from "@/lib/job-feed/types";
import { JobMapRequestSchema } from "@/lib/job-feed/validation";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { requireProTool } from "../../pro-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 20;

// The body holds skills, titles and years read in the browser, and at most a point rounded to about 1 km; none is stored.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user)
      return fail("unauthorized", "Sign in to see jobs that match your resume.", 401, NO_STORE);
    const locked = requireProTool(user, "jobs");
    if (locked) return locked;
    const [limit, work] = await Promise.all([
      rateLimit(`jobs-map:user:${user.id}`, PER_MINUTE, 60_000),
      readWorkProfile(user.id),
    ]);
    if (!limit.allowed) {
      return fail("rate_limited", "That's a lot of searches at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const body = await readJson(req, JobMapRequestSchema);
    if (!body.ok) {
      log.info("jobs.map_bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "Those filters didn't work. Reset them and try again.",
        400,
        NO_STORE,
      );
    }
    const result: Omit<JobMapResponse, "ok"> = await mapCompanies(await getDb(), {
      profile: body.data.profile,
      filters: body.data.filters,
      lookingFor: body.data.lookingFor,
      workProfile: work?.profile ?? null,
      langs: jobLangsFor(body.data.lookingFor?.langs, uiLocaleOf(req)),
      now: Date.now(),
    });
    return ok(result, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.map_failed", error);
    return fail(
      "server_error",
      "Couldn't load the map right now. Please try again.",
      500,
      NO_STORE,
    );
  }
});
