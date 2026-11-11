import type { JobPosting } from "@/lib/api/types";
import { JobReadError } from "@/lib/jobs/errors";
import { readJob } from "@/lib/jobs/read";
import type { JobTarget } from "@/lib/jobs/url";
import { log } from "@/lib/log";
import type { JobDetail } from "./records";
import { SOURCE_INFO } from "./sources";

// Server-only. The whole post of a stored job, read again from its source with the same reader
// as a pasted link. The jobs table keeps no text for these sources (SOURCE_INFO[source].liveText),
// only what was read from it at ingest, so the pages that show or use the post (/jobs/:id and its
// JobPosting data, the tailor flow's backup) read it here, cached a day by their callers. Any
// failure gives "" and the caller shows the job's facts and a link to the original instead.

// A page waits this long at most; the tailor flow reads the link itself as well.
export const FULL_POST_BUDGET_MS = 6_000;

type Stored = Pick<JobDetail, "source" | "board" | "externalId" | "url" | "description" | "closed">;

// What to read: the board's own API by token and id, which works whatever page the job's link
// points to; Jobicy through its job page, which carries JobPosting data.
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

// posting: everything the read gave besides the text (dates, the application form's questions),
// exactly what a pasted link of the same job reads; null when the text wasn't read just now.
export type FullPost = { text: string; posting: Omit<JobPosting, "text"> | null };

/** The full text of an open job, the stored text for the feeds that keep it, or "". */
export async function fullPostText(job: Stored, now = Date.now()): Promise<string> {
  return (await readFullPost(job, now)).text;
}

/** fullPostText, plus what the read said about the post, so the tailor flow needn't read it again. */
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
