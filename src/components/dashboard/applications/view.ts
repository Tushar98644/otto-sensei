import type { Application } from "@/lib/applications/schema";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/applications/status";

export type ApplicationFilter = "all" | ApplicationStatus;
export const APPLICATION_FILTERS: readonly ApplicationFilter[] = ["all", ...APPLICATION_STATUSES];

export const FILTER_NAMES: Record<ApplicationFilter, string> = {
  all: "All",
  applied: "Waiting",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  no_reply: "No reply",
};

// Newest applied first; ties by id, the same order the API pages in.
export function sortApplications(list: readonly Application[]): Application[] {
  return [...list].sort(
    (a, b) => b.appliedAt - a.appliedAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
  );
}

// A copy older than the one shown is ignored, so a slow response can't undo a later click; a tie
// wins, which is how an optimistic change is rolled back.
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

// "Oct 12", or "Oct 12, 2025" outside the current year.
export function formatDay(timestamp: number, now: number): string {
  const format =
    new Date(timestamp).getFullYear() === new Date(now).getFullYear() ? sameYear : otherYear;
  return format.format(timestamp);
}

// Its live title, else the title it had if deleted since, or none for a file not in Otto.
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
