import type { Application } from "@/lib/applications/schema";
import { applicationForJob, copyForJob } from "@/lib/applications/thread";
import { countClaim } from "@/lib/job-feed/counts";
import { SOURCE_INFO } from "@/lib/job-feed/sources";
import { EMPLOYMENT_LABELS, type FeedJob, type JobMatch } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";

export function defaultResumeId(resumes: readonly Resume[]): string | null {
  const newest = (list: readonly Resume[]) =>
    [...list].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null;
  return newest(resumes.filter((resume) => resume.tailor === null)) ?? newest(resumes);
}

export function matchingResumeId(resumes: readonly Resume[], picked: string | null): string | null {
  return picked && resumes.some((resume) => resume.id === picked)
    ? picked
    : defaultResumeId(resumes);
}

const JOB_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TAILOR_PARAM = "tailor";

// The weekly email links to /dashboard/jobs?tailor=<job id>; `rest` is the address without it.
export function tailorLink(href: string): { jobId: string | null; rest: string } | null {
  const url = new URL(href);
  if (!url.searchParams.has(TAILOR_PARAM)) return null;
  const value = url.searchParams.get(TAILOR_PARAM) ?? "";
  url.searchParams.delete(TAILOR_PARAM);
  return {
    jobId: JOB_ID.test(value) ? value.toLowerCase() : null,
    rest: `${url.pathname}${url.search}${url.hash}`,
  };
}

type JobKey = { id?: string; url: string };

export function tailoredFor(resumes: readonly Resume[], job: JobKey): Resume | null {
  return copyForJob(resumes, { id: job.id ?? "", url: job.url });
}

export function appliedFor(applications: readonly Application[], job: JobKey): Application | null {
  return applicationForJob(applications, { id: job.id ?? "", url: job.url });
}

export function readsLink(job: Pick<FeedJob, "source">): boolean {
  return SOURCE_INFO[job.source].liveText;
}

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
  otherPlaces?: readonly string[];
  morePlaces?: number;
};

export function placeParts(job: Placed): string[] {
  const places = [job.location.trim(), ...(job.otherPlaces ?? [])].filter(Boolean).join(", ");
  const parts = [places && job.morePlaces ? `${places} (+${job.morePlaces})` : places];
  if (job.remote && !/\bremote\b/i.test(places)) parts.unshift("Remote");
  if (job.employmentType) parts.push(EMPLOYMENT_LABELS[job.employmentType]);
  return parts.filter(Boolean);
}

export function placeLine(job: Placed): string {
  return placeParts(job).join(" · ");
}

export type SkillList = { shown: string[]; more: number };

export function skillList(items: readonly string[], max: number): SkillList {
  return { shown: items.slice(0, max), more: Math.max(0, items.length - max) };
}

// With no skills found, the reason opens with a sentence about the kind of work; the chips show the rest.
export function matchLead(match: Pick<JobMatch, "found" | "missing" | "reason">): string | null {
  if (match.found.length > 0) return null;
  return match.reason.replace(/\s*Not found:.*$/s, "").trim() || null;
}

// Otto's line: the first sentence leads, the rest follows quieter.
export function splitLead(message: string): { lead: string; rest: string } {
  const at = message.search(/[.!?]\s/);
  if (at === -1) return { lead: message, rest: "" };
  return { lead: message.slice(0, at + 1), rest: message.slice(at + 2).trim() };
}

export function checkedLabel(checkedAt: number | null, now: number): string | null {
  if (checkedAt === null || now === 0) return null;
  const hours = Math.floor((now - checkedAt) / (60 * 60 * 1_000));
  if (hours < 1) return "under an hour ago";
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

const count = new Intl.NumberFormat("en-US");

export function moreWithProCopy(
  shown: number,
  matching: number,
  openJobs: number,
): { title: string; body: string } {
  const open = countClaim(openJobs) ?? count.format(openJobs);
  return {
    title:
      matching > shown
        ? `Your top ${shown} of ${count.format(matching)} matches`
        : `Your ${shown === 1 ? "match" : `${shown} matches`} so far`,
    body: `Pro shows every match from ${open} open jobs, and narrows them by remote, level, posting date and where each job can hire.`,
  };
}
