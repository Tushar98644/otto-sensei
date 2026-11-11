import type { JobSourceId } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import { normalizeJobUrl, type Application } from "./schema";
import type { StatusEvent } from "./status";

// One job is one thread: opening, saved job, tailored copy, application, letters and prep. They
// find each other by server-kept ids, and by the job link only for rows saved before those existed.

export type ApplicationThread = {
  application: Application;
  history: StatusEvent[];
  // While its row is kept (30 days after it closes).
  job: ThreadJob | null;
  writings: Writing[];
  prep: { createdAt: number; questions: number; stories: number; demo: boolean } | null;
};

export type ThreadJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  url: string;
  postedAt: number;
  closed: boolean;
  source: JobSourceId;
};

export type JobRef = { id: string; url: string };

/** Empty or broken links never match. */
export function sameJobUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeJobUrl(a ?? "");
  return left !== null && left !== "" && left === normalizeJobUrl(b ?? "");
}

// Read by shape: localStorage copies are never re-parsed.
function copyJob(copy: Resume): { jobId: string | null; jobUrl: string } {
  const meta = copy.tailor as { jobId?: unknown; jobUrl?: unknown } | null;
  return {
    jobId: typeof meta?.jobId === "string" && meta.jobId ? meta.jobId : null,
    jobUrl: typeof meta?.jobUrl === "string" ? meta.jobUrl : "",
  };
}

function newest(list: readonly Application[]): Application | null {
  let best: Application | null = null;
  for (const item of list) if (!best || item.appliedAt > best.appliedAt) best = item;
  return best;
}

export function applicationForJob(
  applications: readonly Application[],
  job: JobRef,
): Application | null {
  return (
    newest(applications.filter((application) => application.jobId === job.id)) ??
    newest(applications.filter((application) => sameJobUrl(application.jobUrl, job.url)))
  );
}

// Null for a base resume: it goes out to many jobs.
export function applicationForCopy(
  applications: readonly Application[],
  copy: Resume,
): Application | null {
  if (!copy.tailor) return null;
  const sent = newest(applications.filter((application) => application.resumeId === copy.id));
  if (sent) return sent;
  const { jobId, jobUrl } = copyJob(copy);
  if (jobId) {
    const linked = newest(applications.filter((application) => application.jobId === jobId));
    if (linked) return linked;
  }
  return newest(applications.filter((application) => sameJobUrl(application.jobUrl, jobUrl)));
}

export function copyForJob(resumes: readonly Resume[], job: JobRef): Resume | null {
  const copies = resumes
    .filter((resume) => resume.tailor !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    copies.find((copy) => copyJob(copy).jobId === job.id) ??
    copies.find((copy) => sameJobUrl(copyJob(copy).jobUrl, job.url)) ??
    null
  );
}

export function copyForApplication(
  resumes: readonly Resume[],
  application: Pick<Application, "resumeId">,
): Resume | null {
  if (!application.resumeId) return null;
  const copy = resumes.find((resume) => resume.id === application.resumeId);
  return copy?.tailor ? copy : null;
}

export function applicationForWriting(
  applications: readonly Application[],
  writing: Pick<Writing, "applicationId" | "jobUrl">,
): Application | null {
  if (writing.applicationId) {
    return applications.find((application) => application.id === writing.applicationId) ?? null;
  }
  return newest(applications.filter((application) => sameJobUrl(application.jobUrl, writing.jobUrl)));
}

export function writingsForApplication(
  writings: readonly Writing[],
  application: Pick<Application, "id" | "jobUrl">,
): Writing[] {
  return writings
    .filter((writing) =>
      writing.applicationId
        ? writing.applicationId === application.id
        : sameJobUrl(writing.jobUrl, application.jobUrl),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

// One pass over each list.
export function writingsByApplication(
  applications: readonly Application[],
  writings: readonly Writing[],
): Map<string, Writing[]> {
  const known = new Set(applications.map((application) => application.id));
  const byUrl = new Map<string, Application>();
  for (const application of applications) {
    const url = normalizeJobUrl(application.jobUrl);
    if (!url) continue;
    const current = byUrl.get(url);
    if (!current || application.appliedAt > current.appliedAt) byUrl.set(url, application);
  }
  const out = new Map<string, Writing[]>();
  for (const writing of writings) {
    let id: string | null = null;
    if (writing.applicationId) id = known.has(writing.applicationId) ? writing.applicationId : null;
    else {
      const url = normalizeJobUrl(writing.jobUrl);
      id = url ? (byUrl.get(url)?.id ?? null) : null;
    }
    if (id) out.set(id, [...(out.get(id) ?? []), writing]);
  }
  return out;
}

export function copyLetter(copy: Resume | null | undefined): string {
  const letter = (copy?.tailor as { coverLetter?: unknown } | null | undefined)?.coverLetter;
  return typeof letter === "string" ? letter.trim() : "";
}

export function copyJobId(copy: Resume | null | undefined): string | null {
  return copy ? copyJob(copy).jobId : null;
}

export function applicationHref(id: string): string {
  return `/dashboard/applications/${encodeURIComponent(id)}`;
}
