import { normalizeJobUrl } from "@/lib/applications/schema";
import { copyJobId } from "@/lib/applications/thread";
import type { Resume } from "@/lib/resume/schema";

export type CopyJobLink = {
  url: string;
  // Only jobs from the job feed carry one; the Jobs page's applied prompt needs it to log the job.
  jobId: string | null;
  company: string;
  title: string;
};

export function jobLinkFor(resume: Resume): CopyJobLink | null {
  const tailor = resume.tailor;
  if (!tailor?.jobUrl) return null;
  const url = normalizeJobUrl(tailor.jobUrl);
  if (!url) return null;
  return { url, jobId: copyJobId(resume), company: tailor.company, title: tailor.jobTitle };
}
