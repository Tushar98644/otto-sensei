import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { jobById } from "@/lib/job-feed/records";
import type { JobPostResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const JobIdSchema = z.uuid();

// GET /api/jobs/:id: one job with the text we stored, for the tailor flow's backup when its link
// can't be read. Signed in only: the feeds' terms let us use their text in the app, not hand it
// out to anyone who asks.
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to tailor your resume to this job.", 401, NO_STORE);
    const id = JobIdSchema.safeParse((await context.params).id);
    const job = id.success ? await jobById(await getDb(), id.data) : null;
    if (!job) return fail("not_found", "That job isn't here any more.", 404, NO_STORE);
    const { description, ...rest } = job;
    const response: Omit<JobPostResponse, "ok"> = { job: rest, text: description };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.read_failed", error);
    return fail("server_error", "Couldn't open that job. Please try again.", 500, NO_STORE);
  }
}
