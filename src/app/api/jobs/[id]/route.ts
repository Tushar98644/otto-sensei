import { z } from "zod";
import { getDb } from "@/db/client";
import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { readFullPost, readsLive } from "@/lib/job-feed/full-post";
import { cachedForDay } from "@/lib/job-feed/public-cache";
import { jobById } from "@/lib/job-feed/records";
import type { JobPostResponse } from "@/lib/job-feed/types";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { HOUR_MS, MINUTE_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JobIdSchema = z.uuid();
const OPENS_PER_HOUR = 120;
const MISS_KEPT_MS = 15 * MINUTE_MS;
const MAX_MISSES = 1_000;

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

// In memory: an unstable_cache called inside the day cache's load never reads its own entries.
const misses = new Map<string, number>();

function missedLately(id: string, now: number): boolean {
  const at = misses.get(id);
  if (at === undefined) return false;
  if (now - at < MISS_KEPT_MS) return true;
  misses.delete(id);
  return false;
}

function noteMiss(id: string, now: number): void {
  misses.delete(id);
  misses.set(id, now);
  if (misses.size <= MAX_MISSES) return;
  const oldest = misses.keys().next().value;
  if (oldest !== undefined) misses.delete(oldest);
}

// Signed in only: the feeds' terms allow their text in the app, not handing it to anyone.
const dailyPost = cachedForDay("jobs-full-post-v2", async (id: string) => {
  const job = await jobById(await getDb(), id);
  if (!job) return null;
  const { description, ...rest } = job;
  const live = readsLive(job);
  const now = Date.now();
  if (live && missedLately(id, now)) {
    throw new BoardMissed({ job: rest, text: description, posting: null });
  }
  const { text, posting } = await readFullPost({ ...rest, description });
  const post = { job: rest, text, posting };
  if (!posting && live) {
    noteMiss(id, now);
    throw new BoardMissed(post);
  }
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
    const limit = await rateLimit(`jobs-post:user:${user.id}`, OPENS_PER_HOUR, HOUR_MS);
    if (!limit.allowed) {
      return fail(
        "rate_limited",
        `You've opened a lot of jobs this hour. Try again in ${waitText(limit.retryAfterMs)}.`,
        429,
        { ...NO_STORE, ...retryAfterHeader(limit.retryAfterMs) },
      );
    }
    const id = JobIdSchema.safeParse((await context.params).id);
    const post = id.success ? await readPost(id.data) : null;
    if (!post) return fail("not_found", "That job isn't here any more.", 404, NO_STORE);
    return ok(post, { headers: NO_STORE });
  } catch (error) {
    log.error("jobs.read_failed", error);
    return fail("server_error", "Couldn't open that job. Please try again.", 500, NO_STORE);
  }
}
