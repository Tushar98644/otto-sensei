"use client";

import type { Application } from "@/lib/api/types";
import type { FeedJob } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { addApplication } from "../applications/use-applications";

export function logJobApplied(
  job: Pick<FeedJob, "id" | "company" | "title" | "url">,
  sent: Resume | null,
): Promise<Application> {
  return addApplication({
    resumeId: sent?.id ?? null,
    resumeTitle: sent ? resumeTitle(sent).slice(0, 200) : "",
    company: job.company.slice(0, 200),
    role: job.title.slice(0, 200),
    jobUrl: job.url,
    jobId: job.id,
    appliedAt: Date.now(),
    status: "applied",
  });
}
