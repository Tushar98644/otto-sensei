import type { JobSourceId } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import type { Writing } from "@/lib/writings/schema";
import { normalizeJobUrl, type Application } from "./schema";
import type { StatusEvent } from "./status";

export type ApplicationThread = {
  application: Application;
  history: StatusEvent[];
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

export function sameJobUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizeJobUrl(a ?? "");
  return left !== null && left !== "" && left === normalizeJobUrl(b ?? "");
}

function copyJob(copy: Resume): { jobId: string | null; jobUrl: string } {
  const meta = copy.tailor as { jobId?: unknown; jobUrl?: unknown } | null;
  return {
    jobId: typeof meta?.jobId === "string" && meta.jobId ? meta.jobId : null,
    jobUrl: typeof meta?.jobUrl === "string" ? meta.jobUrl : "",
  };
}

type ApplicationIndex = {
  byId: Map<string, Application>;
  byJob: Map<string, Application>;
  byResume: Map<string, Application>;
  byUrl: Map<string, Application>;
};

type CopyIndex = { byJob: Map<string, Resume>; byUrl: Map<string, Resume> };

// Built once per list, so labelling many jobs reads each link once instead of once per job.
const applicationIndexes = new WeakMap<readonly Application[], ApplicationIndex>();
const copyIndexes = new WeakMap<readonly Resume[], CopyIndex>();

function indexApplications(applications: readonly Application[]): ApplicationIndex {
  const known = applicationIndexes.get(applications);
  if (known) return known;
  const index: ApplicationIndex = {
    byId: new Map(),
    byJob: new Map(),
    byResume: new Map(),
    byUrl: new Map(),
  };
  const newest = (map: Map<string, Application>, key: string, application: Application) => {
    const best = map.get(key);
    if (!best || application.appliedAt > best.appliedAt) map.set(key, application);
  };
  for (const application of applications) {
    if (!index.byId.has(application.id)) index.byId.set(application.id, application);
    if (application.jobId !== null) newest(index.byJob, application.jobId, application);
    if (application.resumeId !== null) newest(index.byResume, application.resumeId, application);
    const url = normalizeJobUrl(application.jobUrl);
    if (url) newest(index.byUrl, url, application);
  }
  applicationIndexes.set(applications, index);
  return index;
}

function indexCopies(resumes: readonly Resume[]): CopyIndex {
  const known = copyIndexes.get(resumes);
  if (known) return known;
  const index: CopyIndex = { byJob: new Map(), byUrl: new Map() };
  const copies = resumes
    .filter((resume) => resume.tailor !== null)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  for (const copy of copies) {
    const { jobId, jobUrl } = copyJob(copy);
    if (jobId && !index.byJob.has(jobId)) index.byJob.set(jobId, copy);
    const url = normalizeJobUrl(jobUrl);
    if (url && !index.byUrl.has(url)) index.byUrl.set(url, copy);
  }
  copyIndexes.set(resumes, index);
  return index;
}

function byUrl<T>(map: Map<string, T>, url: string | null | undefined): T | null {
  const key = normalizeJobUrl(url ?? "");
  return key ? (map.get(key) ?? null) : null;
}

export function applicationForJob(
  applications: readonly Application[],
  job: JobRef,
): Application | null {
  const index = indexApplications(applications);
  return index.byJob.get(job.id) ?? byUrl(index.byUrl, job.url);
}

export function applicationForCopy(
  applications: readonly Application[],
  copy: Resume,
): Application | null {
  if (!copy.tailor) return null;
  const index = indexApplications(applications);
  const { jobId, jobUrl } = copyJob(copy);
  return (
    index.byResume.get(copy.id) ??
    (jobId ? index.byJob.get(jobId) : undefined) ??
    byUrl(index.byUrl, jobUrl)
  );
}

export function copyForJob(resumes: readonly Resume[], job: JobRef): Resume | null {
  const index = indexCopies(resumes);
  return index.byJob.get(job.id) ?? byUrl(index.byUrl, job.url);
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
  const index = indexApplications(applications);
  if (writing.applicationId) return index.byId.get(writing.applicationId) ?? null;
  return byUrl(index.byUrl, writing.jobUrl);
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
