import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { AskedAppliedAnswer, FeedJob } from "@/lib/job-feed/types";
import { DAY_MS } from "@/lib/time";
import type { JobsMessages } from "../i18n";

export const ASK_FOR_MS = 7 * DAY_MS;
export const MAX_NOT_YET = 2;
// 90 days outlives a job post, so "never again" still holds when it's opened later.
export const KEEP_MS = 90 * DAY_MS;
export const MAX_OPENED_JOBS = 200;

export type OpenedJob = {
  jobId: string;
  company: string;
  title: string;
  url: string;
  openedAt: number;
  notYet: number;
  answeredAt: number | null;
  done: boolean;
};

export type OpenedJobRef = Pick<FeedJob, "id" | "company" | "title" | "url">;

export function pruneOpenedJobs(list: readonly OpenedJob[], now: number): readonly OpenedJob[] {
  return list
    .filter((entry) => {
      const age = now - entry.openedAt;
      if (age >= KEEP_MS) return false;
      return entry.done || entry.notYet > 0 || age < ASK_FOR_MS;
    })
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_OPENED_JOBS);
}

export function recordOpen(
  list: readonly OpenedJob[],
  job: OpenedJobRef,
  now: number,
): readonly OpenedJob[] {
  const before = list.find((entry) => entry.jobId === job.id);
  const entry: OpenedJob = before?.done
    ? { ...before, openedAt: now }
    : {
        jobId: job.id,
        company: job.company.slice(0, 200),
        title: job.title.slice(0, 200),
        url: job.url,
        openedAt: now,
        notYet: before?.notYet ?? 0,
        answeredAt: before?.answeredAt ?? null,
        done: false,
      };
  return pruneOpenedJobs([entry, ...list.filter((item) => item.jobId !== job.id)], now);
}

export function answerOpenedJob(
  list: readonly OpenedJob[],
  jobId: string,
  answer: AskedAppliedAnswer,
  now: number,
): readonly OpenedJob[] {
  if (!list.some((entry) => entry.jobId === jobId && !entry.done)) return list;
  return pruneOpenedJobs(
    list.map((entry) => {
      if (entry.jobId !== jobId) return entry;
      // Done entries keep only what the rules need, not which job it was.
      if (answer === "yes") return { ...entry, company: "", title: "", url: "", done: true };
      const notYet = entry.notYet + 1;
      return notYet >= MAX_NOT_YET
        ? { ...entry, company: "", title: "", url: "", notYet, answeredAt: now, done: true }
        : { ...entry, notYet, answeredAt: now };
    }),
    now,
  );
}

export type AskContext = {
  now: number;
  returnedAt: number;
  isApplied: (entry: OpenedJob) => boolean;
};

export function promptsToShow(list: readonly OpenedJob[], context: AskContext): OpenedJob[] {
  const { now, returnedAt, isApplied } = context;
  if (now === 0) return [];
  return list
    .filter(
      (entry) =>
        !entry.done &&
        entry.openedAt < returnedAt &&
        now - entry.openedAt < ASK_FOR_MS &&
        (entry.answeredAt === null || entry.answeredAt < entry.openedAt) &&
        !isApplied(entry),
    )
    .sort((a, b) => b.openedAt - a.openedAt);
}

export function splitByPage(
  due: readonly OpenedJob[],
  pageJobIds: readonly string[],
): { onCard: OpenedJob[]; offPage: OpenedJob[] } {
  const onPage = new Set(pageJobIds);
  return {
    onCard: due.filter((entry) => onPage.has(entry.jobId)),
    offPage: due.filter((entry) => !onPage.has(entry.jobId)),
  };
}

export function stripLine(jobs: number, { applied }: JobsMessages, format: Format): string {
  return format.plural(applied.strip, jobs);
}

export function promptAnnouncement(
  onCard: readonly OpenedJob[],
  offPage: number,
  t: JobsMessages,
  format: Format,
): string {
  const { applied } = t;
  const parts: string[] = [];
  if (onCard.length === 1) parts.push(fmt(applied.onCardOne, { company: onCard[0]!.company }));
  if (onCard.length > 1) {
    parts.push(fmt(applied.onCardMany, { count: format.number(onCard.length) }));
  }
  if (offPage > 0) parts.push(`${stripLine(offPage, t, format)} ${applied.atTop}`);
  return parts.join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOpenedJobs(value: unknown): OpenedJob[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): OpenedJob[] => {
    if (!isRecord(item)) return [];
    const { jobId, company, title, url, openedAt, notYet, answeredAt, done } = item;
    if (
      typeof jobId !== "string" ||
      jobId === "" ||
      typeof company !== "string" ||
      typeof title !== "string" ||
      typeof url !== "string" ||
      typeof openedAt !== "number" ||
      !Number.isFinite(openedAt) ||
      typeof notYet !== "number" ||
      !(answeredAt === null || typeof answeredAt === "number") ||
      typeof done !== "boolean"
    ) {
      return [];
    }
    return [{ jobId, company, title, url, openedAt, notYet, answeredAt, done }];
  });
}
