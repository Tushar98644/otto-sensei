import { ROUTES } from "@/components/site/routes";
import { normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationForCopy } from "@/lib/applications/thread";
import type { PrepSummary } from "@/lib/insights/prep";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

// Client-safe and pure: what the Interview prep page lists and offers, kept out of the component
// so it's tested. A pack lives on its application, so every list here is keyed by application id.

/** The prep page for one application, under Interview prep. */
export function interviewHref(applicationId: string): string {
  return `${ROUTES.dashboardInterview}/${encodeURIComponent(applicationId)}`;
}

/** Applications at the interview stage with no pack yet, the latest to get there first. */
export function waitingForPrep(
  applications: readonly Application[],
  packs: readonly Pick<PrepSummary, "applicationId">[],
): Application[] {
  const prepared = new Set(packs.map((pack) => pack.applicationId));
  return applications
    .filter((application) => application.status === "interview" && !prepared.has(application.id))
    .sort((a, b) => b.statusChangedAt - a.statusChangedAt);
}

/** The job picker's order: interviews first, then the rest, newest application first in each. */
export function prepChoices(applications: readonly Application[]): Application[] {
  return [...applications].sort(
    (a, b) =>
      Number(b.status === "interview") - Number(a.status === "interview") ||
      b.appliedAt - a.appliedAt,
  );
}

/** The application already logged for this job link, so pasting it again doesn't log it twice. */
export function findByLink(applications: readonly Application[], link: string): Application | null {
  const url = normalizeJobUrl(link);
  if (!url) return null;
  return (
    applications.find(
      (application) => application.jobUrl !== "" && normalizeJobUrl(application.jobUrl) === url,
    ) ?? null
  );
}

// One line of the job picker: an application, or a tailored copy not sent yet, which joins
// Applications at the interview stage when picked.
export type PrepChoice =
  | { value: string; label: string; kind: "application"; application: Application }
  | { value: string; label: string; kind: "copy"; copy: Resume };

/**
 * Every job prep can start from: the applications (interviews first), then each tailored copy that
 * has no application yet, newest first. A copy that doesn't name its company is left out: an
 * application needs one.
 */
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
