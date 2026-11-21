import type { Application } from "@/lib/applications/schema";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/applications/status";
import { DAY_MS } from "@/lib/time";

export type ApplicationFilter = "all" | ApplicationStatus;
export const APPLICATION_FILTERS: readonly ApplicationFilter[] = ["all", ...APPLICATION_STATUSES];

export const FILTER_NAMES: Record<ApplicationFilter, string> = {
  all: "All",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  no_reply: "No reply",
};

export function sortApplications(list: readonly Application[]): Application[] {
  return [...list].sort(
    (a, b) => b.appliedAt - a.appliedAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
}

// Older copies are ignored so a slow response can't undo a later click; a tie wins (rollback).
export function upsertApplication(list: readonly Application[], next: Application): Application[] {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) return sortApplications([...list, next]);
  const current = list[index];
  if (current && current.updatedAt > next.updatedAt) return [...list];
  const copy = [...list];
  copy[index] = next;
  return current?.appliedAt === next.appliedAt ? copy : sortApplications(copy);
}

export function withoutApplication(list: readonly Application[], id: string): Application[] {
  return list.filter((item) => item.id !== id);
}

export function filterCounts(list: readonly Application[]): Record<ApplicationFilter, number> {
  const counts: Record<ApplicationFilter, number> = {
    all: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
    no_reply: 0,
  };
  for (const application of list) {
    counts.all += 1;
    counts[application.status] += 1;
  }
  return counts;
}

export function filterApplications(
  list: readonly Application[],
  filter: ApplicationFilter,
): Application[] {
  return filter === "all" ? [...list] : list.filter((application) => application.status === filter);
}

export function latestFor(list: readonly Application[], resumeId: string): Application | null {
  let latest: Application | null = null;
  for (const application of list) {
    if (application.resumeId !== resumeId) continue;
    if (!latest || application.appliedAt > latest.appliedAt) latest = application;
  }
  return latest;
}

const sameYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const otherYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDay(timestamp: number, now: number): string {
  const format =
    new Date(timestamp).getFullYear() === new Date(now).getFullYear() ? sameYear : otherYear;
  return format.format(timestamp);
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Calendar days in the browser's own time zone; rounding absorbs a daylight-saving hour.
export function daysUntil(timestamp: number, now: number): number {
  return Math.round((startOfDay(timestamp) - startOfDay(now)) / DAY_MS);
}

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });

// The weekday within a week either way, so "Mon" never means a Monday months off.
export function interviewDay(at: number, now: number): string {
  return Math.abs(daysUntil(at, now)) < 7 ? weekday.format(at) : formatDay(at, now);
}

export function interviewWhen(at: number, now: number): string {
  const days = daysUntil(at, now);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  const day = interviewDay(at, now);
  return days > 0 ? `${day} · in ${days} days` : `${day} · ${-days} days ago`;
}

export function interviewLabel(at: number, now: number): string {
  return `Interview ${interviewWhen(at, now)}`;
}

export function interviewMark(at: number, now: number): string {
  const when = interviewWhen(at, now);
  return when.charAt(0).toUpperCase() + when.slice(1);
}

export function upcomingInterview(
  application: Pick<Application, "status" | "interviewAt">,
  now: number,
): boolean {
  return (
    application.status === "interview" &&
    application.interviewAt !== null &&
    now > 0 &&
    daysUntil(application.interviewAt, now) >= 0
  );
}

export function upcomingFirst<T extends Pick<Application, "status" | "interviewAt">>(
  list: readonly T[],
  now: number,
): T[] {
  const soon = list
    .filter((application) => upcomingInterview(application, now))
    .sort((a, b) => (a.interviewAt ?? 0) - (b.interviewAt ?? 0));
  if (soon.length === 0) return [...list];
  const first = new Set(soon);
  return [...soon, ...list.filter((application) => !first.has(application))];
}

export function canPrepare(application: Pick<Application, "status">): boolean {
  return application.status === "interview";
}

export function notInOtto(list: readonly Pick<Application, "resumeId">[]): number {
  return list.filter((application) => !application.resumeId).length;
}

const number = new Intl.NumberFormat("en-US");

export function outsideLine(outside: number, shown: number): string {
  if (outside === 1 && shown === 1) return "Sent with a resume not in Otto.";
  if (outside === shown) return "All of these were sent with a resume not in Otto.";
  return `${number.format(outside)} of these ${outside === 1 ? "was" : "were"} sent with a resume not in Otto.`;
}

export function sentLabel(
  application: Pick<Application, "resumeId" | "resumeTitle">,
  titles: ReadonlyMap<string, { title: string }>,
): string {
  if (!application.resumeId) return "a resume not in Otto";
  const live = titles.get(application.resumeId);
  if (live) return `“${live.title}”`;
  return application.resumeTitle ? `“${application.resumeTitle}” (deleted)` : "a deleted resume";
}

export function applicationAnchor(id: string): string {
  return `application-${id}`;
}

export function prepHref(id: string): string {
  return `/dashboard/applications/${encodeURIComponent(id)}/prep`;
}

// A pack that exists opens as it is; otherwise the prep page starts making one.
export function prepareHref(application: Pick<Application, "id" | "hasPrep">): string {
  return application.hasPrep ? prepHref(application.id) : `${prepHref(application.id)}?start=1`;
}
