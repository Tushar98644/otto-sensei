import type { AskedAppliedAnswer, FeedJob } from "@/lib/job-feed/types";

// "Open job" goes to the company's own post, so an application sent there never reaches the
// tracker unless someone says so. The list lives in this browser only; nothing here is sent.

const DAY_MS = 24 * 60 * 60 * 1_000;

/** A job is asked about for a week after it was last opened. */
export const ASK_FOR_MS = 7 * DAY_MS;
/** The second "Not yet" on the same job ends the asking for good. */
export const MAX_NOT_YET = 2;
// Answers outlive the asking window so "never again" holds when the job is opened later; 90 days
// is past the life of a job post. The cap keeps the list small however many jobs are opened.
export const KEEP_MS = 90 * DAY_MS;
export const MAX_OPENED_JOBS = 200;

export type OpenedJob = {
  jobId: string;
  // Enough to ask, and to log the application, when the job isn't on the page any more.
  company: string;
  title: string;
  url: string;
  openedAt: number;
  notYet: number;
  // The last "Not yet": the job stays quiet until it is opened again after this.
  answeredAt: number | null;
  // Answered yes, marked applied, or told "not yet" twice: never asked again.
  done: boolean;
};

export type OpenedJobRef = Pick<FeedJob, "id" | "company" | "title" | "url">;

export function pruneOpenedJobs(list: readonly OpenedJob[], now: number): readonly OpenedJob[] {
  return list
    .filter((entry) => {
      const age = now - entry.openedAt;
      if (age >= KEEP_MS) return false;
      // An expired question nobody answered has nothing left to remember.
      return entry.done || entry.notYet > 0 || age < ASK_FOR_MS;
    })
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_OPENED_JOBS);
}

/** Opening it again after a "Not yet" asks once more. */
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

// "Not yet" quiets it until the job is opened again, and the second one ends it. A job that was
// never opened is left alone.
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
  // The shared clock; 0 before it is known, when nothing is asked.
  now: number;
  // When the person last came back to the Jobs tab: a job opened after that isn't asked about yet,
  // so the question never shows up while they are still on their way out.
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

/** Jobs with a card on this page are asked on the card; the rest share one strip above the list. */
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

const count = new Intl.NumberFormat("en-US");

/** The strip's line: "You opened 3 jobs. Applied to any?" */
export function stripLine(jobs: number): string {
  return jobs === 1
    ? "You opened 1 job. Applied to it?"
    : `You opened ${count.format(jobs)} jobs. Applied to any?`;
}

export function promptAnnouncement(onCard: readonly OpenedJob[], offPage: number): string {
  const parts: string[] = [];
  if (onCard.length === 1) parts.push(`Applied to ${onCard[0]!.company}? Answer on its job card.`);
  if (onCard.length > 1) {
    parts.push(
      `Applied to the ${count.format(onCard.length)} jobs you opened? Answer on their job cards.`,
    );
  }
  if (offPage > 0) parts.push(`${stripLine(offPage)} It's at the top of the list.`);
  return parts.join(" ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Anything that doesn't fit the shape is dropped. */
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
