import { sameJobUrl } from "@/lib/applications/thread";
import { SOURCE_INFO } from "@/lib/job-feed/sources";
import type { JobPostResponse, SavedJob } from "@/lib/job-feed/types";
import type { TailorMeta } from "@/lib/resume/schema";
import type { QueuedJob } from "./session";

const RECENT_JOBS_SHOWN = 5;

export type RecentJob =
  | { kind: "tailored"; key: string; label: string; at: number; link: string; job: QueuedJob }
  | { kind: "saved"; key: string; label: string; at: number; link: string; saved: SavedJob };

export function jobChipLabel(title: string, company: string): string {
  const parts = [title.trim(), company.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Untitled job";
}

function tailoredJob(meta: TailorMeta): RecentJob | null {
  const text = meta.jobText?.trim() ?? "";
  const link = meta.jobUrl?.trim() ?? "";
  if (!text && !link) return null;
  return {
    kind: "tailored",
    key: `tailored:${meta.baseResumeId}:${meta.createdAt}`,
    label: jobChipLabel(meta.jobTitle, meta.company),
    at: meta.createdAt,
    link,
    job: {
      link,
      title: meta.jobTitle,
      company: meta.company,
      location: "",
      text,
      postedAt: null,
      readLink: text === "" && link !== "",
      ...(meta.jobId ? { jobId: meta.jobId } : {}),
    },
  };
}

function savedJob(job: SavedJob): RecentJob | null {
  if (job.closed) return null;
  return {
    kind: "saved",
    key: `saved:${job.id}`,
    label: jobChipLabel(job.title, job.company),
    at: job.savedAt,
    link: job.url,
    saved: job,
  };
}

function sameJob(a: RecentJob, b: RecentJob): boolean {
  if (sameJobUrl(a.link, b.link)) return true;
  return a.label !== "Untitled job" && a.label.toLowerCase() === b.label.toLowerCase();
}

export function recentJobs(
  tailored: readonly TailorMeta[],
  saved: readonly SavedJob[],
  limit = RECENT_JOBS_SHOWN,
): RecentJob[] {
  const all = [...tailored.map(tailoredJob), ...saved.map(savedJob)]
    .filter((job): job is RecentJob => job !== null)
    .sort((a, b) => b.at - a.at);
  const seen: RecentJob[] = [];
  const shown: RecentJob[] = [];
  for (const job of all) {
    if (shown.length >= limit) break;
    if (!seen.some((other) => sameJob(other, job))) shown.push(job);
    seen.push(job);
  }
  return shown;
}

// The same hand-off as Tailor on a Jobs card: the saved post's text, else a live read of its link.
export function savedJobQueued(
  job: SavedJob,
  post: Pick<JobPostResponse, "text" | "posting"> | null,
): QueuedJob {
  return {
    link: job.url,
    title: job.title,
    company: job.company,
    location: job.location,
    text: post?.text ?? "",
    postedAt: job.postedAt,
    readLink: SOURCE_INFO[job.source].liveText,
    jobId: job.id,
    ...(post?.posting ? { posting: post.posting } : {}),
  };
}
