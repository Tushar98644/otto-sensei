import { fail, ok } from "@/lib/api/respond";
import { JobRequestSchema, type JobResponse } from "@/lib/api/types";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { readJson } from "@/lib/http";
import { JobReadError, jobReadMessage, parseJobLink, readJob, type JobTarget } from "@/lib/jobs";
import { log } from "@/lib/log";
import { limitJobReads } from "./limits";

export const runtime = "nodejs";
// A read can chain three requests of up to 8 seconds each, inside a 20 second budget.
export const maxDuration = 30;

const INVALID_LINK = jobReadMessage(new JobReadError("invalid_url"));

// invalid_url is the person's typo; every other reason means "couldn't read it, paste the text".
function readFailure(error: JobReadError): Response {
  if (error.reason === "invalid_url") return fail("bad_request", INVALID_LINK, 400);
  return fail("parse_failed", jobReadMessage(error), 422);
}

// Job link → the post's title, company, location, dates and plain text. No account needed. Logs
// carry the host and the outcome only: paths and queries can identify a person's application.
export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) {
    log.warn("job.cross_site");
    return crossSite;
  }
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;

  let target: JobTarget | null = null;
  try {
    const body = await readJson(req, JobRequestSchema);
    if (!body.ok) return fail("bad_request", INVALID_LINK, 400);
    try {
      target = parseJobLink(body.data.url);
    } catch (error) {
      if (!(error instanceof JobReadError)) throw error;
      log.info("job.read_refused", { reason: error.reason });
      return readFailure(error);
    }

    const limited = await limitJobReads(req);
    if (limited) return limited;

    const startedAt = Date.now();
    const host = target.url.hostname;
    try {
      const posting = await readJob(target, startedAt);
      log.info("job.read", {
        host,
        source: posting.source,
        chars: posting.text.length,
        durationMs: Date.now() - startedAt,
      });
      const response: Omit<JobResponse, "ok"> = { posting };
      return ok(response);
    } catch (error) {
      if (!(error instanceof JobReadError)) throw error;
      log.info("job.read_failed", {
        host,
        reason: error.reason,
        detail: error.detail,
        durationMs: Date.now() - startedAt,
      });
      return readFailure(error);
    }
  } catch (error) {
    log.error("job.failed", error, { host: target?.url.hostname });
    return fail("server_error", "Something went wrong reading that link. Please try again.", 500);
  }
}
