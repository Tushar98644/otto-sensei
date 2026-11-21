import { ROUTES } from "@/components/site/routes";
import { normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationForCopy } from "@/lib/applications/thread";
import type { PrepSummary } from "@/lib/insights/prep";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import { formatDay } from "../applications/view";

export const PREP_START_PARAM = "start";

// With start, the prep page begins making the pack as soon as it knows the resume and the job.
export function interviewHref(applicationId: string, { start = false } = {}): string {
  const href = `${ROUTES.dashboardInterview}/${encodeURIComponent(applicationId)}`;
  return start ? `${href}?${PREP_START_PARAM}=1` : href;
}

function dayOf(timestamp: number): number {
  return new Date(timestamp).setHours(0, 0, 0, 0);
}

function daysFrom(now: number, timestamp: number): number {
  return Math.round((dayOf(timestamp) - dayOf(now)) / DAY_MS);
}

// Upcoming interviews first, soonest on top; then those with no day yet; past ones last.
function waitRank(application: Application, now: number): number {
  if (application.interviewAt === null) return 1;
  return now === 0 || daysFrom(now, application.interviewAt) >= 0 ? 0 : 2;
}

export function waitingForPrep(
  applications: readonly Application[],
  packs: readonly Pick<PrepSummary, "applicationId">[],
  now = 0,
): Application[] {
  const prepared = new Set(packs.map((pack) => pack.applicationId));
  return applications
    .filter((application) => application.status === "interview" && !prepared.has(application.id))
    .sort((a, b) => {
      const rank = waitRank(a, now) - waitRank(b, now);
      if (rank !== 0) return rank;
      if (a.interviewAt === null || b.interviewAt === null) return b.statusChangedAt - a.statusChangedAt;
      return waitRank(a, now) === 0 ? a.interviewAt - b.interviewAt : b.interviewAt - a.interviewAt;
    });
}

export function interviewDayLine(interviewAt: number | null, now: number): string {
  if (interviewAt === null) return "No interview day set yet";
  const day = formatDay(interviewAt, now || interviewAt);
  if (now === 0) return `Interview ${day}`;
  const days = daysFrom(now, interviewAt);
  if (days === 0) return "Interview today";
  if (days === 1) return "Interview tomorrow";
  return days > 0 ? `Interview ${day}` : `Interview was ${day}`;
}

export function prepChoices(applications: readonly Application[]): Application[] {
  return [...applications].sort(
    (a, b) =>
      Number(b.status === "interview") - Number(a.status === "interview") ||
      b.appliedAt - a.appliedAt,
  );
}

export function findByLink(applications: readonly Application[], link: string): Application | null {
  const url = normalizeJobUrl(link);
  if (!url) return null;
  return (
    applications.find(
      (application) => application.jobUrl !== "" && normalizeJobUrl(application.jobUrl) === url,
    ) ?? null
  );
}

export type PrepChoice =
  | { value: string; label: string; kind: "application"; application: Application }
  | { value: string; label: string; kind: "copy"; copy: Resume };

export function prepPickerChoices(
  applications: readonly Application[],
  resumes: readonly Resume[],
): PrepChoice[] {
  const fromApplications: PrepChoice[] = prepChoices(applications).map((application) => ({
    value: `application:${application.id}`,
    label: `${[application.company, application.role].filter(Boolean).join(", ")} (${STATUS_NAMES[application.status]})`,
    kind: "application",
    application,
  }));
  const fromCopies: PrepChoice[] = resumes
    .filter(
      (resume) =>
        resume.tailor !== null &&
        resume.tailor.company.trim() !== "" &&
        applicationForCopy(applications, resume) === null,
    )
    .sort((a, b) => (b.tailor?.createdAt ?? 0) - (a.tailor?.createdAt ?? 0))
    .map((copy) => ({
      value: `copy:${copy.id}`,
      label: `${resumeTitle(copy)} (tailored copy, not sent yet)`,
      kind: "copy",
      copy,
    }));
  return [...fromApplications, ...fromCopies];
}
