import { ROUTES } from "@/components/site/routes";
import { normalizeJobUrl, type Application } from "@/lib/applications/schema";
import type { PrepSummary } from "@/lib/insights/prep";

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
