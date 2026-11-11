import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { readFullPost } from "@/lib/job-feed/full-post";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { jobById } from "@/lib/job-feed/records";
import type { JobPostResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JobIdSchema = z.uuid();

// Feed text, or the post re-read from its source (cached a day; "" on failure, and the tailor
// flow asks for the text) with its dates and questions, so the link isn't read twice.
// Signed in only: the feeds' terms allow their text in the app, not handing it to anyone.
// v2: older entries lack `posting` and would send every tailor back to the link for a day.
const dailyPost = cachedForDay("jobs-full-post-v2", async (id: string) => {
  const job = await jobById(await getDb(), id);
  if (!job) return null;
  const { description, ...rest } = job;
  const { text, posting } = await readFullPost({ ...rest, description });
  return { job: rest, text, posting };
});
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to tailor your resume to this job.", 401, NO_STORE);
    const id = JobIdSchema.safeParse((await context.params).id);
    const post = id.success ? await dailyPost(id.data) : null;
    if (!post) return fail("not_found", "That job isn't here any more.", 404, NO_STORE);
    const response: Omit<JobPostResponse, "ok"> = post;
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.read_failed", error);
    return fail("server_error", "Couldn't open that job. Please try again.", 500, NO_STORE);
  }
}
