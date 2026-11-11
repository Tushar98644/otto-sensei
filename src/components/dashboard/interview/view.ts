import { ROUTES } from "@/components/site/routes";
import { normalizeJobUrl, type Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationForCopy } from "@/lib/applications/thread";
import type { PrepSummary } from "@/lib/insights/prep";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export function interviewHref(applicationId: string): string {
  return `${ROUTES.dashboardInterview}/${encodeURIComponent(applicationId)}`;
}

export function waitingForPrep(
  applications: readonly Application[],
  packs: readonly Pick<PrepSummary, "applicationId">[],
): Application[] {
  const prepared = new Set(packs.map((pack) => pack.applicationId));
  return applications
    .filter((application) => application.status === "interview" && !prepared.has(application.id))
    .sort((a, b) => b.statusChangedAt - a.statusChangedAt);
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
