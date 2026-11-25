import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Application } from "@/lib/applications/schema";
import { applicationForJob, copyForJob } from "@/lib/applications/thread";
import { SOURCE_INFO } from "@/lib/job-feed/sources";
import type { FeedJob, JobMatch } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import type { JobsMessages } from "../i18n";

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

export function postedLabel(
  postedAt: number,
  now: number,
  { card }: JobsMessages,
  format: Format,
): string {
  if (now === 0) return "";
  const day = (time: number) => {
    const date = new Date(time);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  const days = Math.round((day(now) - day(postedAt)) / DAY_MS);
  if (days <= 0) return card.postedToday;
  if (days === 1) return card.postedYesterday;
  if (days < 30) return format.plural(card.postedDaysAgo, days);
  const sameYear = new Date(postedAt).getFullYear() === new Date(now).getFullYear();
  const date = format.date(postedAt, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  return fmt(card.postedOn, { date });
}

type Placed = Pick<FeedJob, "location" | "remote" | "employmentType"> & {
  otherPlaces?: readonly string[];
  morePlaces?: number;
};

export function placeParts(job: Placed, { card }: JobsMessages): string[] {
  const places = [job.location.trim(), ...(job.otherPlaces ?? [])].filter(Boolean).join(", ");
  const parts = [places && job.morePlaces ? `${places} (+${job.morePlaces})` : places];
  if (job.remote && !/\bremote\b/i.test(places)) parts.unshift(card.remote);
  if (job.employmentType) parts.push(card.employment[job.employmentType]);
  return parts.filter(Boolean);
}

export function placeLine(job: Placed, t: JobsMessages): string {
  return placeParts(job, t).join(" · ");
}

export type SkillList = { shown: string[]; more: number };

export function skillList(items: readonly string[], max: number): SkillList {
  return { shown: items.slice(0, max), more: Math.max(0, items.length - max) };
}

// With no skills found, the reason opens with a sentence about the kind of work; the chips show the rest.
// The server's "Not found: …" sentence starts with the card's own label in every language (jobMatch.notFound).
export function matchLead(
  match: Pick<JobMatch, "found" | "missing" | "reason">,
  notFound = "Not found",
): string | null {
  if (match.found.length > 0) return null;
  const label = notFound.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return match.reason.replace(new RegExp(`\\s*${label}[^.]*?:.*$`, "s"), "").trim() || null;
}

// Otto's line: the first sentence leads, the rest follows quieter.
export function splitLead(message: string): { lead: string; rest: string } {
  const at = message.search(/[.!?]\s/);
  if (at === -1) return { lead: message, rest: "" };
  return { lead: message.slice(0, at + 1), rest: message.slice(at + 2).trim() };
}

export function checkedLabel(
  checkedAt: number | null,
  now: number,
  { page }: JobsMessages,
  format: Format,
): string | null {
  if (checkedAt === null || now === 0) return null;
  const hours = Math.floor((now - checkedAt) / (60 * 60 * 1_000));
  if (hours < 1) return page.underHour;
  if (hours < 24) return format.relativeTime(-hours, "hour");
  return format.relativeTime(-Math.floor(hours / 24), "day", { numeric: "auto" });
}

// "27,000+": a round figure that stays true as the count moves, like lib/job-feed/counts.
function countClaim(n: number, format: Format): string {
  if (!Number.isFinite(n) || n < 100) return format.number(n);
  const step = n >= 1_000 ? 1_000 : 100;
  return `${format.number(Math.floor(n / step) * step)}+`;
}

export function moreWithProCopy(
  shown: number,
  matching: number,
  openJobs: number,
  { page }: JobsMessages,
  format: Format,
): { title: string; body: string } {
  return {
    title:
      matching > shown
        ? fmt(page.moreTop, { shown: format.number(shown), matching: format.number(matching) })
        : shown === 1
          ? page.moreOne
          : fmt(page.moreSome, { count: format.number(shown) }),
    body: fmt(page.moreBody, { open: countClaim(openJobs, format) }),
  };
}
