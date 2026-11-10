import type { JobSourceId } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import { normalizeJobUrl, type Application } from "./schema";
import type { StatusEvent } from "./status";

// Client-safe and pure. One job is one thread: the opening, the saved job, the tailored copy, the
// application, its letters and answers and its prep. These find each other by the ids the server
// keeps (applications.job_id, applications.resume_id, writings.application_id, tailor.jobId), and
// by the job link only for rows saved before those existed.

// GET /api/applications/:id: one application with everything linked to it, for its own page.
export type ApplicationThread = {
  application: Application;
  history: StatusEvent[];
  // The opening on the Jobs tab, while its row is kept (30 days after it closes).
  job: ThreadJob | null;
  // Letters and answers written for it, newest first.
  writings: Writing[];
  // The saved prep pack, as counts.
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

// What a job on the Jobs tab, a saved job or a thread's opening is known by.
export type JobRef = { id: string; url: string };

/** Two links to the same post, once normalized. Empty or broken links never match. */
export function sameJobUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeJobUrl(a ?? "");
  return left !== null && left !== "" && left === normalizeJobUrl(b ?? "");
}

// A copy's job link and opening id, read by shape: copies in localStorage are never re-parsed.
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

/** The newest application for an opening: by its id, else by its link. */
export function applicationForJob(
  applications: readonly Application[],
  job: JobRef,
): Application | null {
  return (
    newest(applications.filter((application) => application.jobId === job.id)) ??
    newest(applications.filter((application) => sameJobUrl(application.jobUrl, job.url)))
  );
}

/**
 * The newest application a tailored copy went out with: sent as that copy, else (logged some
 * other way) for the same opening or link. Null for a base resume: it goes out to many jobs.
 */
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

/** The tailored copy made for an opening: by its id, else by its link. Newest edit first. */
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

/** The copy an application went out with, when it's a tailored copy still in this browser. */
export function copyForApplication(
  resumes: readonly Resume[],
  application: Pick<Application, "resumeId">,
): Resume | null {
  if (!application.resumeId) return null;
  const copy = resumes.find((resume) => resume.id === application.resumeId);
  return copy?.tailor ? copy : null;
}

/** The application a letter or answer belongs to: by its link, else by the job link. */
export function applicationForWriting(
  applications: readonly Application[],
  writing: Pick<Writing, "applicationId" | "jobUrl">,
): Application | null {
  if (writing.applicationId) {
    return applications.find((application) => application.id === writing.applicationId) ?? null;
  }
  return newest(applications.filter((application) => sameJobUrl(application.jobUrl, writing.jobUrl)));
}

/** The letters and answers for one application, newest first. */
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

/**
 * Every listed application's letters and answers at once, for the board and the lists: by link,
 * else by the job link (newest application with it). One pass over each list.
 */
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

/** The cover letter kept on a tailored copy, or "". */
export function copyLetter(copy: Resume | null | undefined): string {
  const letter = (copy?.tailor as { coverLetter?: unknown } | null | undefined)?.coverLetter;
  return typeof letter === "string" ? letter.trim() : "";
}

/** The opening id a tailored copy was made for, or null. */
export function copyJobId(copy: Resume | null | undefined): string | null {
  return copy ? copyJob(copy).jobId : null;
}

/** The application's own page, the hub every other screen links to. */
export function applicationHref(id: string): string {
  return `/dashboard/applications/${encodeURIComponent(id)}`;
}
