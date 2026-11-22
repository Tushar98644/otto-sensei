import type { JobPosting } from "@/lib/api/types";
import { JobReadError } from "@/lib/jobs/errors";
import { readJob } from "@/lib/jobs/read";
import type { JobTarget } from "@/lib/jobs/url";
import { log } from "@/lib/log";
import type { JobDetail } from "./records";
import { SOURCE_INFO } from "./sources";

export const FULL_POST_BUDGET_MS = 6_000;

type Stored = Pick<JobDetail, "source" | "board" | "externalId" | "url" | "description" | "closed">;

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
    case "workday":
    case "jobicy":
      return { kind: "page", url, greenhouseId: null, ashbyId: null };
    case "himalayas":
    case "remoteok":
      return null;
  }
}

export type FullPost = { text: string; posting: Omit<JobPosting, "text"> | null };

function liveTarget(job: Stored): JobTarget | null {
  if (!SOURCE_INFO[job.source].liveText || job.closed) return null;
  if (job.source !== "jobicy" && !job.board) return null;
  try {
    return targetOf(job, new URL(job.url));
  } catch {
    return null;
  }
}

// Whether readFullPost asks the board, so a null posting means that read failed.
export function readsLive(job: Stored): boolean {
  return liveTarget(job) !== null;
}

export async function fullPostText(job: Stored, now = Date.now()): Promise<string> {
  return (await readFullPost(job, now)).text;
}

export async function readFullPost(job: Stored, now = Date.now()): Promise<FullPost> {
  const kept: FullPost = { text: job.description, posting: null };
  const target = liveTarget(job);
  if (!target) return kept;
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
