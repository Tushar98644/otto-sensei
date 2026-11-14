import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { readFullPost, readsLive } from "@/lib/job-feed/full-post";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { jobById } from "@/lib/job-feed/records";
import type { JobPostResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JobIdSchema = z.uuid();

type Post = Omit<JobPostResponse, "ok">;

// Thrown, not returned, so the day cache never keeps the empty answer of a failed board read.
class BoardMissed extends Error {
  readonly post: Post;

  constructor(post: Post) {
    super("The job's board couldn't be read.");
    this.name = "BoardMissed";
    this.post = post;
  }
}

// Signed in only: the feeds' terms allow their text in the app, not handing it to anyone.
const dailyPost = cachedForDay("jobs-full-post-v2", async (id: string) => {
  const job = await jobById(await getDb(), id);
  if (!job) return null;
  const { description, ...rest } = job;
  const { text, posting } = await readFullPost({ ...rest, description });
  const post = { job: rest, text, posting };
  if (!posting && readsLive(job)) throw new BoardMissed(post);
  return post;
});

async function readPost(id: string): Promise<Post | null> {
  try {
    return await dailyPost(id);
  } catch (error) {
    if (error instanceof BoardMissed) return error.post;
    throw error;
  }
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in to tailor your resume to this job.", 401, NO_STORE);
    const id = JobIdSchema.safeParse((await context.params).id);
    const post = id.success ? await readPost(id.data) : null;
    if (!post) return fail("not_found", "That job isn't here any more.", 404, NO_STORE);
    return ok(post, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.read_failed", error);
    return fail("server_error", "Couldn't open that job. Please try again.", 500, NO_STORE);
  }
}
