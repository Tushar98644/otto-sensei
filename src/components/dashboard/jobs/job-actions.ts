"use client";

import type { Application, MatchedJob } from "@/lib/api/types";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { addApplication } from "../applications/use-applications";

/**
 * Logs a job from the Jobs tab as sent today, with the resume version that went out (the copy
 * tailored for this job when there is one). The server sets the usual follow-up reminder.
 */
export function logJobApplied(job: MatchedJob, sent: Resume | null): Promise<Application> {
  return addApplication({
    resumeId: sent?.id ?? null,
    resumeTitle: sent ? resumeTitle(sent).slice(0, 200) : "",
    company: job.company.slice(0, 200),
    role: job.title.slice(0, 200),
    jobUrl: job.url,
    appliedAt: Date.now(),
    status: "applied",
  });
}
