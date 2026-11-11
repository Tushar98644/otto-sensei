import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { readFullPost } from "@/lib/job-feed/full-post";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { jobById } from "@/lib/job-feed/records";
import type { JobPostResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const JobIdSchema = z.uuid();

// GET /api/jobs/:id: one job with its post, for the tailor flow: the text a feed's job keeps, or
// the post read again from its source (cached a day; "" when that fails, and the tailor flow asks
// for the text). A post read just now comes with what the read said (dates, form questions), so
// the tailor flow uses it as is instead of reading the job's link a second time. Signed in only:
// the feeds' terms let us use their text in the app, not hand it out to anyone who asks.
// v2: entries from before `posting` was kept would send every tailor back to the link for a day.
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
