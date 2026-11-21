"use client";

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useMe } from "@/components/account/use-me";
import { MarkApplied, useCopyApplication } from "@/components/dashboard/applications/mark-applied";
import { rememberOpenedJob } from "@/components/dashboard/jobs/use-opened-jobs";
import { buttonClasses } from "@/components/ui/button";
import type { Resume } from "@/lib/resume/schema";
import { jobLinkFor, type CopyJobLink } from "./job-link";

export function OpenJob({ resume }: { resume: Resume }) {
  const job = jobLinkFor(resume);
  return job ? <OpenJobLink resume={resume} job={job} /> : null;
}

function OpenJobLink({ resume, job }: { resume: Resume; job: CopyJobLink }) {
  const { user } = useMe();
  const application = useCopyApplication(resume);
  const [opened, setOpened] = useState(false);
  if (application) return null;

  function open() {
    if (user && job.jobId) {
      rememberOpenedJob(user.id, {
        id: job.jobId,
        company: job.company,
        title: job.title,
        url: job.url,
      });
    }
    setOpened(true);
  }

  const link = (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={open}
      className={buttonClasses({
        variant: opened ? "ghost" : "secondary",
        size: opened ? "sm" : "md",
        className: opened ? undefined : "w-full",
      })}
    >
      {opened ? "Open the job again" : "Open job to apply"}
      <ArrowUpRight aria-hidden />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );

  if (!opened || !user) return link;
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface-muted p-4">
      <p className="text-sm/6 text-pretty text-ink">
        {job.company ? `Applied at ${job.company}?` : "Applied to this job?"} Log it and I&apos;ll
        remind you to follow up.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <MarkApplied resume={resume} />
        {link}
      </div>
    </div>
  );
}
