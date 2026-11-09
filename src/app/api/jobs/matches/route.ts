import { FREE_JOB_MATCHES, hasProTools } from "@/config/plans";
import { getDb } from "@/db/client";
import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readWorkProfile } from "@/lib/eligibility/records";
import { readJson } from "@/lib/http";
import { logImpressions } from "@/lib/job-feed/events";
import { profileHash, rankJobs } from "@/lib/job-feed/rank";
import {
  DEFAULT_FILTERS,
  JobMatchesRequestSchema,
  type JobMatchesResponse,
} from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
// Only against scripts: a person paging and filtering stays far under it.
const PER_MINUTE = 60;

// POST /api/jobs/matches: open jobs ranked for one resume (or the saved ones), by rules only.
// The body holds skills, titles and years read from the resume in the browser, never the resume.
// Free gets the closest FREE_JOB_MATCHES from the same ranking and the count of the rest;
// filters, more pages, saved jobs and the work-rights rules are Pro.
export async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user)
      return fail("unauthorized", "Sign in to see jobs that match your resume.", 401, NO_STORE);
    const limit = await rateLimit(`jobs:user:${user.id}`, PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return fail("rate_limited", "That's a lot of searches at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const body = await readJson(req, JobMatchesRequestSchema);
    if (!body.ok) {
      log.info("jobs.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "Those filters didn't work. Reset them and try again.",
        400,
        NO_STORE,
      );
    }
    const db = await getDb();
    const now = Date.now();
    // Free sees the closest few from the same ranking, unfiltered, first page only, without the
    // work-rights rules; the rest of the list comes with Pro.
    const free = !hasProTools(user.plan);
    const ranked = await rankJobs(db, {
      userId: user.id,
      view: free ? "matches" : body.data.view,
      profile: body.data.profile,
      filters: free ? DEFAULT_FILTERS : body.data.filters,
      page: free ? 1 : body.data.page,
      workProfile: free ? null : (await readWorkProfile(user.id)).profile,
      deviceTimeZone: body.data.deviceTimeZone,
      now,
    });
    const shown = free ? ranked.jobs.slice(0, FREE_JOB_MATCHES) : ranked.jobs;
    let logged: { requestId: string; resumeHash: string } | null = null;
    if (free || body.data.view === "matches") {
      const ids = { requestId: crypto.randomUUID(), resumeHash: profileHash(body.data.profile) };
      // Measuring must never cost the person their list.
      try {
        await logImpressions(db, { userId: user.id, variant: ranked.variant, now, ...ids }, shown);
        logged = ids;
      } catch (error) {
        log.error("jobs.impressions_failed", error);
      }
    }
    const result: Omit<JobMatchesResponse, "ok"> = {
      ...ranked,
      jobs: shown,
      ...(free ? { locked: true } : {}),
      requestId: logged?.requestId ?? null,
      resumeHash: logged?.resumeHash ?? null,
    };
    return ok(result, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.match_failed", error);
    return fail("server_error", "Couldn't load jobs right now. Please try again.", 500, NO_STORE);
  }
}
