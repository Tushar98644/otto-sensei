import type { JobPosting } from "@/lib/api/types";
import { JobReadError } from "@/lib/jobs/errors";
import { readJob } from "@/lib/jobs/read";
import type { JobTarget } from "@/lib/jobs/url";
import { log } from "@/lib/log";
import type { JobDetail } from "./records";
import { SOURCE_INFO } from "./sources";

// No text is stored for these sources, so it's re-read; any failure gives "" and a link out
// instead.

// A page waits this long at most; the tailor flow reads the link itself as well.
export const FULL_POST_BUDGET_MS = 6_000;

type Stored = Pick<JobDetail, "source" | "board" | "externalId" | "url" | "description" | "closed">;

// The board's API by token and id works whatever page the link points to; Jobicy pages carry
// JSON-LD.
function targetOf(job: Stored, url: URL): JobTarget | null {
  const { board, externalId: id } = job;
  switch (job.source) {
    case "greenhouse":
      return { kind: "greenhouse", url, token: board, id };
    case "lever":
      return { kind: "lever", url, company: board, id, eu: false };
    case "ashby":
      return { kind: "ashby", url, org: board, id };
    case "workable":
      return { kind: "workable", url, account: board, shortcode: id };
    case "recruitee":
      return { kind: "recruitee", url, company: board, slug: id };
    case "personio":
      return { kind: "personio", url, host: url.hostname, id };
    case "jobicy":
      return { kind: "page", url, greenhouseId: null, ashbyId: null };
    case "himalayas":
    case "remoteok":
      return null;
  }
}

// posting: what a pasted link of the same job reads besides the text; null when not read just now.
export type FullPost = { text: string; posting: Omit<JobPosting, "text"> | null };

export async function fullPostText(job: Stored, now = Date.now()): Promise<string> {
  return (await readFullPost(job, now)).text;
}

export async function readFullPost(job: Stored, now = Date.now()): Promise<FullPost> {
  const kept: FullPost = { text: job.description, posting: null };
  if (!SOURCE_INFO[job.source].liveText || job.closed) return kept;
  let target: JobTarget | null = null;
  try {
    target = targetOf(job, new URL(job.url));
  } catch {
    return kept;
  }
  if (!target || (job.source !== "jobicy" && !job.board)) return kept;
  const started = Date.now();
  try {
    const { text, ...posting } = await readJob(target, now, FULL_POST_BUDGET_MS);
    return { text, posting };
  } catch (error) {
    if (error instanceof JobReadError) {
      log.info("jobs.full_post_failed", {
        source: job.source,
        reason: error.reason,
        durationMs: Date.now() - started,
      });
    } else {
      log.error("jobs.full_post_error", error, { source: job.source });
    }
    return kept;
  }
}
