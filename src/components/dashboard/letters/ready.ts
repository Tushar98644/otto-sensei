import { companyKey } from "@/components/ui/company-mark";
import { normalizeJobUrl } from "@/lib/applications/schema";
import type { WritingKind } from "@/lib/writings/schema";
import type { LetterEntry } from "./entries";
import type { WriteTarget } from "./write-targets";

const plain = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
const url = (value: string) => (value.trim() ? (normalizeJobUrl(value) ?? "") : "");

type JobRef = Pick<LetterEntry, "company" | "role" | "jobUrl" | "applicationId">;

// One job, however it was written for: the same application, the same post or the same company and role.
export function sameJob(
  entry: JobRef,
  target: Pick<WriteTarget, "company" | "title" | "url" | "applicationId">,
): boolean {
  if (entry.applicationId && target.applicationId)
    return entry.applicationId === target.applicationId;
  const link = url(entry.jobUrl);
  if (link && link === url(target.url)) return true;
  return (
    companyKey(entry.company) !== "" &&
    companyKey(entry.company) === companyKey(target.company) &&
    plain(entry.role) === plain(target.title)
  );
}

export function hasKind(
  entries: readonly LetterEntry[],
  target: Pick<WriteTarget, "company" | "title" | "url" | "applicationId">,
  kind: WritingKind,
): boolean {
  return entries.some((entry) => entry.kind === kind && sameJob(entry, target));
}

// Jobs the app already knows that have no cover letter yet.
export function readyTargets(
  targets: readonly WriteTarget[],
  entries: readonly LetterEntry[],
): WriteTarget[] {
  return targets.filter((target) => !hasKind(entries, target, "letter"));
}

export type LetterGroup = {
  key: string;
  company: string;
  role: string;
  jobUrl: string;
  applicationId: string | null;
  entries: LetterEntry[];
  newest: number;
};

function groupKey(entry: LetterEntry): string {
  if (entry.applicationId) return `application:${entry.applicationId}`;
  const company = companyKey(entry.company);
  const role = plain(entry.role);
  if (company || role) return `job:${company}|${role}`;
  const link = url(entry.jobUrl);
  return link ? `url:${link}` : `entry:${entry.key}`;
}

// Everything written for one job sits together; the job written for most recently comes first.
export function letterGroups(entries: readonly LetterEntry[]): LetterGroup[] {
  const groups = new Map<string, LetterGroup>();
  const byJob = new Map<string, string>();
  for (const entry of entries) {
    const jobKey = `job:${companyKey(entry.company)}|${plain(entry.role)}`;
    // An application's pieces and loose ones for the same company and role are one job.
    const key = byJob.get(jobKey) ?? groupKey(entry);
    if (companyKey(entry.company) || plain(entry.role)) byJob.set(jobKey, key);
    const group = groups.get(key);
    if (group) {
      group.entries.push(entry);
      group.newest = Math.max(group.newest, entry.createdAt);
      group.applicationId ??= entry.applicationId;
      if (!group.jobUrl) group.jobUrl = entry.jobUrl;
    } else {
      groups.set(key, {
        key,
        company: entry.company.trim(),
        role: entry.role.trim(),
        jobUrl: entry.jobUrl,
        applicationId: entry.applicationId,
        entries: [entry],
        newest: entry.createdAt,
      });
    }
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      entries: [...group.entries].sort(
        (a, b) => b.createdAt - a.createdAt || a.key.localeCompare(b.key),
      ),
    }))
    .sort((a, b) => b.newest - a.newest || a.key.localeCompare(b.key));
}

// A job to write for again, from what a piece already knows about it.
export function targetForGroup(group: LetterGroup, targets: readonly WriteTarget[]): WriteTarget {
  const first = group.entries[0];
  const ref = {
    company: group.company,
    role: group.role,
    jobUrl: group.jobUrl,
    applicationId: group.applicationId,
  };
  const known = targets.find((target) => sameJob(ref, target));
  if (known) return known;
  const link = url(group.jobUrl);
  return {
    value: `group:${group.key}`,
    from: "application",
    label: [group.company, group.role].filter(Boolean).join(", ") || "This job",
    title: group.role,
    company: group.company,
    url: link,
    jobId: first?.outreach?.jobId ?? null,
    applicationId: group.applicationId,
    resumeId: first?.copyId ?? first?.resumeId ?? null,
    resumeNote: first?.copyId ? "tailored" : null,
    post: link ? { kind: "link", url: link } : { kind: "paste" },
    at: group.newest,
  };
}

export function emailSubject(role: string, name: string): string {
  const what = role.trim() ? `Application for ${role.trim()}` : "Application";
  return name.trim() ? `${what} – ${name.trim()}` : what;
}

export function asEmail(subject: string, body: string): string {
  return `Subject: ${subject.trim()}\n\n${body.trim()}`;
}
