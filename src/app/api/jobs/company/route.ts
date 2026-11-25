import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { withApiLocale } from "@/lib/api/localize";
import { getCurrentUser } from "@/lib/auth/session";
import { companyJobs } from "@/lib/job-feed/map";
import type { CompanyJobsResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { requireProTool } from "../../pro-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PER_MINUTE = 60;
const MAX_NAME_CHARS = 200;

export const GET = withApiLocale(async function GET(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to see this company.", 401, NO_STORE);
    const locked = requireProTool(user, "jobs");
    if (locked) return locked;
    const name = (new URL(req.url).searchParams.get("name") ?? "").trim();
    if (!name || name.length > MAX_NAME_CHARS)
      return fail("bad_request", "That company name didn't work.", 400, NO_STORE);
    const limit = await rateLimit(`jobs-company:user:${user.id}`, PER_MINUTE, 60_000);
    if (!limit.allowed) {
      return fail("rate_limited", "That's a lot of searches at once. Try again in a minute.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limit.retryAfterMs),
      });
    }
    const found = await companyJobs(await getDb(), name, Date.now());
    if (!found) return fail("not_found", "This company has no open jobs here now.", 404, NO_STORE);
    const response: Omit<CompanyJobsResponse, "ok"> = found;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.company_failed", error);
    return fail("server_error", "Couldn't load this company. Please try again.", 500, NO_STORE);
  }
});
