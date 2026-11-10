import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { fullPostText } from "@/lib/job-feed/full-post";
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
// for the text). Signed in only: the feeds' terms let us use their text in the app, not hand it
// out to anyone who asks.
const dailyPost = cachedForDay("jobs-full-post", async (id: string) => {
  const job = await jobById(await getDb(), id);
  if (!job) return null;
  const { description, ...rest } = job;
  return { job: rest, text: await fullPostText({ ...rest, description }) };
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
