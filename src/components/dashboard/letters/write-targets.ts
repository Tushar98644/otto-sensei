import { api } from "@/lib/api/client";
import type { Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationForCopy, applicationForJob, copyForJob, copyJobId } from "@/lib/applications/thread";
import { savedJobText, savedJobUrl } from "@/lib/insights/saved-job";
import type { SavedJob } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";

// Kept in step with the writing routes' shortest job post.
export const MIN_TARGET_POST_CHARS = 80;
const MAX_TARGETS = 60;

export type TargetPost =
  | { kind: "saved"; text: string }
  | { kind: "feed"; id: string }
  | { kind: "link"; url: string }
  | { kind: "paste" };

export type WriteTarget = {
  value: string;
  from: "application" | "job" | "copy";
  label: string;
  title: string;
  company: string;
  url: string;
  jobId: string | null;
  applicationId: string | null;
  // The resume made for this job: the version sent, or the tailored copy itself.
  resumeId: string | null;
  resumeNote: "sent" | "tailored" | null;
  post: TargetPost;
  at: number;
};

function labelOf(company: string, title: string, note: string): string {
  const name = [company, title].map((part) => part.trim()).filter(Boolean).join(", ");
  return `${name || "Untitled job"} (${note})`;
}

function postOf(text: string, jobId: string | null, url: string): TargetPost {
  if (text) return { kind: "saved", text };
  if (jobId) return { kind: "feed", id: jobId };
  return url ? { kind: "link", url } : { kind: "paste" };
}

function fromApplication(application: Application, resumes: readonly Resume[]): WriteTarget {
  const sent = application.resumeId
    ? resumes.find((resume) => resume.id === application.resumeId)
    : undefined;
  const url = application.jobUrl || savedJobUrl(sent);
  const jobId = application.jobId ?? copyJobId(sent);
  return {
    value: `application:${application.id}`,
    from: "application",
    label: labelOf(application.company, application.role, STATUS_NAMES[application.status]),
    title: application.role,
    company: application.company,
    url,
    jobId,
    applicationId: application.id,
    resumeId: sent?.id ?? null,
    resumeNote: sent ? "sent" : null,
    post: postOf(savedJobText(sent), jobId, url),
    at: application.appliedAt,
  };
}

function fromSavedJob(job: SavedJob): WriteTarget {
  return {
    value: `job:${job.id}`,
    from: "job",
    label: labelOf(job.company, job.title, "saved job"),
    title: job.title,
    company: job.company,
    url: job.url,
    jobId: job.id,
    applicationId: null,
    resumeId: null,
    resumeNote: null,
    post: { kind: "feed", id: job.id },
    at: job.savedAt,
  };
}

function fromCopy(copy: Resume): WriteTarget {
  const url = savedJobUrl(copy);
  const jobId = copyJobId(copy);
  return {
    value: `copy:${copy.id}`,
    from: "copy",
    label: labelOf(copy.tailor?.company ?? "", copy.tailor?.jobTitle ?? "", "tailored copy"),
    title: copy.tailor?.jobTitle ?? "",
    company: copy.tailor?.company ?? "",
    url,
    jobId,
    applicationId: null,
    resumeId: copy.id,
    resumeNote: "tailored",
    post: postOf(savedJobText(copy), jobId, url),
    at: copy.tailor?.createdAt ?? copy.updatedAt,
  };
}

// Newest first: open applications, saved jobs not applied to, and tailored copies not sent yet.
export function writeTargets(
  applications: readonly Application[],
  savedJobs: readonly SavedJob[],
  resumes: readonly Resume[],
): WriteTarget[] {
  const copies = resumes.filter(
    (resume) =>
      resume.tailor !== null &&
      resume.tailor.company.trim() !== "" &&
      applicationForCopy(applications, resume) === null,
  );
  const jobs = savedJobs.filter(
    (job) =>
      !job.closed &&
      applicationForJob(applications, job) === null &&
      copyForJob(copies, job) === null,
  );
  const open = applications.filter(
    (application) => application.status !== "rejected" && application.status !== "no_reply",
  );
  return [
    ...open.map((application) => fromApplication(application, resumes)),
    ...jobs.map(fromSavedJob),
    ...copies.map(fromCopy),
  ]
    .sort((a, b) => b.at - a.at || a.value.localeCompare(b.value))
    .slice(0, MAX_TARGETS);
}

// Saved jobs arrive after the rest, so one is never the choice already made when the dialog opens.
export function firstTarget(targets: readonly WriteTarget[]): WriteTarget | null {
  return targets.find((target) => target.from !== "job") ?? null;
}

export function postLine(post: TargetPost): string {
  if (post.kind === "saved") return "Otto uses the job post saved with your tailored copy.";
  if (post.kind === "feed") return "Otto reads the job post from your Jobs tab.";
  if (post.kind === "link") return "Otto reads the job post from its link.";
  return "No job post is saved for this one. Paste its link or text below.";
}

// Throws when the post can't be read; a post too short to write from comes back empty.
export async function readTargetPost(post: TargetPost): Promise<string> {
  const text =
    post.kind === "saved"
      ? post.text
      : post.kind === "feed"
        ? (await api.jobPost(post.id)).text
        : post.kind === "link"
          ? (await api.readJob({ url: post.url })).posting.text
          : "";
  const trimmed = text.trim();
  return trimmed.length >= MIN_TARGET_POST_CHARS ? trimmed : "";
}
