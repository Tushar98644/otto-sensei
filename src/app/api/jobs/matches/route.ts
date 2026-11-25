import { after } from "next/server";
import { FREE_JOB_MATCHES, hasProTools } from "@/config/plans";
import { getDb } from "@/db/client";
import { loadMessages } from "@/i18n/messages";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readWorkProfile } from "@/lib/eligibility/records";
import { readJson } from "@/lib/http";
import { uiLocaleOf } from "@/lib/i18n/request";
import { logImpressions, shownJobs } from "@/lib/job-feed/events";
import { jobLangsFor } from "@/lib/job-feed/job-langs";
import { readStoredCounts } from "@/lib/job-feed/match-index";
import { JOBS_PREFETCH_HEADER } from "@/lib/job-feed/prefetch-header";
import { profileHash, rankJobs } from "@/lib/job-feed/rank";
import { DEFAULT_FILTERS, type JobMatchesResponse } from "@/lib/job-feed/types";
import { JobMatchesRequestSchema } from "@/lib/job-feed/validation";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 60;

type Write = () => Promise<void>;

// Outside a request (tests, scripts) there is no after(), so the writes run before answering.
async function afterResponse(writes: readonly Write[]): Promise<void> {
  if (writes.length === 0) return;
  const run = async () => {
    for (const write of writes) await write();
  };
  try {
    after(run);
  } catch {
    await run();
  }
}

// The body holds skills, titles and years read in the browser, never the resume.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user)
      return fail("unauthorized", "Sign in to see jobs that match your resume.", 401, NO_STORE);
    const db = await getDb();
    const free = !hasProTools(user.plan);
    // Three at once at most: each holds one of the pool's five connections.
    const [limit, work, counts] = await Promise.all([
      rateLimit(`jobs:user:${user.id}`, PER_MINUTE, 60_000),
      free ? null : readWorkProfile(user.id),
      readStoredCounts(db),
    ]);
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
    const now = Date.now();
    const lookingFor = body.data.lookingFor;
    const locale = uiLocaleOf(req);
    const copy = { words: await loadMessages(locale, "matchReasons"), locale };
    const writes: Write[] = [];
    const ranked = await rankJobs(db, {
      userId: user.id,
      view: free ? "matches" : body.data.view,
      profile: body.data.profile,
      filters: free
        ? { ...DEFAULT_FILTERS, remote: lookingFor?.remote ?? false }
        : body.data.filters,
      page: free ? 1 : body.data.page,
      workProfile: work?.profile ?? null,
      lookingFor,
      deviceTimeZone: body.data.deviceTimeZone,
      now,
      free,
      cache: true,
      counts,
      defer: (write) => writes.push(write),
      langs: jobLangsFor(lookingFor?.langs, locale),
      copy,
    });
    const shown = free ? ranked.jobs.slice(0, FREE_JOB_MATCHES) : ranked.jobs;
    const ids =
      free || body.data.view === "matches"
        ? { requestId: crypto.randomUUID(), resumeHash: profileHash(body.data.profile) }
        : null;
    // A hover prefetch may never be shown: the Jobs tab logs it when it is (/api/jobs/events).
    if (ids && req.headers.get(JOBS_PREFETCH_HEADER) !== "1") {
      const context = { userId: user.id, variant: ranked.variant, now, ...ids };
      writes.push(() =>
        logImpressions(db, context, shownJobs(shown)).catch((error: unknown) =>
          log.error("jobs.impressions_failed", error),
        ),
      );
    }
    const result: Omit<JobMatchesResponse, "ok"> = {
      ...ranked,
      jobs: shown,
      ...(free ? { locked: true } : {}),
      requestId: ids?.requestId ?? null,
      resumeHash: ids?.resumeHash ?? null,
    };
    await afterResponse(writes);
    return ok(result, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.match_failed", error);
    return fail("server_error", "Couldn't load jobs right now. Please try again.", 500, NO_STORE);
  }
});
