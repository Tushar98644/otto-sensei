import { normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { BOARD_SOURCES, EMPLOYMENT_LABELS, type FeedJob } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";

// Client-safe and pure. What the Jobs tab works out for its cards from the browser's own data:
// which resume to match, which version to send, and whether a job is already in the tracker.

const DAY_MS = 24 * 60 * 60 * 1_000;

/** The newest resume of the person's own, else the newest of all: what Jobs matches by default. */
export function defaultResumeId(resumes: readonly Resume[]): string | null {
  const newest = (list: readonly Resume[]) =>
    [...list].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null;
  return newest(resumes.filter((resume) => resume.tailor === null)) ?? newest(resumes);
}

function sameJob(a: string, b: string): boolean {
  const left = normalizeJobUrl(a);
  return left !== null && left !== "" && left === normalizeJobUrl(b);
}

/** A tailored copy already made for this job, if any. */
export function tailoredFor(resumes: readonly Resume[], job: Pick<FeedJob, "url">): Resume | null {
  return (
    resumes.find((resume) => resume.tailor?.jobUrl && sameJob(resume.tailor.jobUrl, job.url)) ??
    null
  );
}

/** The newest tracker entry for this job's link. */
export function appliedFor(
  applications: readonly Application[],
  job: Pick<FeedJob, "url">,
): Application | null {
  return applications.find((application) => sameJob(application.jobUrl, job.url)) ?? null;
}

/** The company boards' own pages can be read again for the full post; the feeds' pages can't. */
export function readsLink(job: Pick<FeedJob, "source">): boolean {
  return (BOARD_SOURCES as readonly string[]).includes(job.source);
}

/** "Posted today", "Posted 3 days ago", "Posted Oct 2". `now` is 0 before the clock is known. */
export function postedLabel(postedAt: number, now: number): string {
  if (now === 0) return "";
  const day = (time: number) => {
    const date = new Date(time);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const days = Math.round((day(now) - day(postedAt)) / DAY_MS);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  const sameYear = new Date(postedAt).getFullYear() === new Date(now).getFullYear();
  return `Posted ${new Date(postedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })}`;
}

type Placed = Pick<FeedJob, "location" | "remote" | "employmentType"> & {
  // Other places one opening is posted, when Matches shows its location copies as one card.
  otherPlaces?: readonly string[];
  morePlaces?: number;
};

/**
 * "Remote · Berlin · Full-time": the place as the post gives it, plus remote and job type. One
 * opening posted in several places lists them: "Remote UK, Remote Canada (+2) · Full-time".
 */
export function placeLine(job: Placed): string {
  const places = [job.location.trim(), ...(job.otherPlaces ?? [])].filter(Boolean).join(", ");
  const parts = [places && job.morePlaces ? `${places} (+${job.morePlaces})` : places];
  if (job.remote && !/\bremote\b/i.test(places)) parts.unshift("Remote");
  if (job.employmentType) parts.push(EMPLOYMENT_LABELS[job.employmentType]);
  return parts.filter(Boolean).join(" · ");
}

/** "3 hours ago" for the list's freshness line. */
export function checkedLabel(checkedAt: number | null, now: number): string | null {
  if (checkedAt === null || now === 0) return null;
  const hours = Math.floor((now - checkedAt) / (60 * 60 * 1_000));
  if (hours < 1) return "under an hour ago";
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}
