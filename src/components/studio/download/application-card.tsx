"use client";

import { FileText, MessagesSquare, PanelsTopLeft, Search, Target } from "lucide-react";
import Link from "next/link";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { MarkApplied, useCopyApplication } from "@/components/dashboard/applications/mark-applied";
import { StatusIcon } from "@/components/dashboard/applications/status-menu";
import { prepHref } from "@/components/dashboard/applications/view";
import { ROUTES } from "@/components/site/routes";
import { requestLetterFor } from "@/components/studio/tailor/letter-request";
import { loadResult } from "@/components/studio/tailor/session";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationHref, copyLetter } from "@/lib/applications/thread";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";

// The Download step's next move, so finishing a resume never ends on a dead end: a resume that
// isn't tailored yet goes to a job, and a tailored copy to its application, its letter and its
// interview prep.
export function ApplicationCard({ resume }: { resume: Resume }) {
  return resume.tailor ? <TailoredCopyCard resume={resume} /> : <FindAJobCard />;
}

function FindAJobCard() {
  const setStep = useStudioStore((s) => s.setStep);
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Next: a job to send it to</CardTitle>
        <CardDescription>
          Tailor it to one job post, or see open jobs that fit this resume.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setStep("tailor")}>
          <Target aria-hidden />
          Tailor to a job
        </Button>
        <Link href={ROUTES.dashboardJobs} className={buttonClasses({ variant: "ghost" })}>
          <Search aria-hidden />
          See matching jobs
        </Link>
      </div>
    </Card>
  );
}

// A tailored copy's job: where that application stands and a link to its page, or one click to
// log it as sent. Its letter and its job go along by themselves. Then what the job asks for next.
function TailoredCopyCard({ resume }: { resume: Resume }) {
  const { user } = useMe();
  const application = useCopyApplication(resume);
  const locked = useProTools() === false;
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  if (!resume.tailor || !user) return null;
  const job = [resume.tailor.jobTitle, resume.tailor.company].filter(Boolean).join(" at ");
  const letter = copyLetter(resume) !== "";
  // This tab still holds the job post the copy was made from, so the Tailor step can write the
  // letter from it. Otherwise the Cover letters page asks for the job again.
  const tailoredHere = loadResult(resume.tailor.baseResumeId)?.copyId === resume.id;
  const proBadge = locked ? (
    <Badge variant="ink" className="h-5 px-1.5">
      Pro
    </Badge>
  ) : null;

  function writeLetter() {
    requestLetterFor(resume.id);
    setActive(resume.id);
    setStep("tailor");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{application ? "Your application" : "Sent it?"}</CardTitle>
        <CardDescription>
          {application
            ? `${job || application.company}. ${letter ? "Its cover letter is kept with it." : "Letters you write for this job join it."}`
            : `Log ${job || "this job"} when you send it. ${letter ? "The letter on this copy goes with it." : "I'll remind you to follow up."}`}
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        {application ? (
          <>
            <Link
              href={applicationHref(application.id)}
              className={buttonClasses({ variant: "secondary" })}
            >
              <StatusIcon status={application.status} />
              {STATUS_NAMES[application.status]}
              <span className="sr-only">: open this application</span>
            </Link>
            <Link
              href={applicationHref(application.id)}
              className={buttonClasses({ variant: "ghost" })}
            >
              <PanelsTopLeft aria-hidden />
              See everything for this job
            </Link>
          </>
        ) : (
          <MarkApplied resume={resume} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {letter ? null : tailoredHere ? (
          <Button variant="ghost" onClick={writeLetter}>
            <FileText aria-hidden />
            Write the cover letter
            {proBadge}
          </Button>
        ) : (
          <Link href={ROUTES.dashboardLetters} className={buttonClasses({ variant: "ghost" })}>
            <FileText aria-hidden />
            Write the cover letter
            {proBadge}
          </Link>
        )}
        {/* Prep lives on an application; before one is logged, the Interview prep page starts it
            from this copy. */}
        <Link
          href={application ? prepHref(application.id) : ROUTES.dashboardInterview}
          className={buttonClasses({ variant: "ghost" })}
        >
          <MessagesSquare aria-hidden />
          {application?.hasPrep ? "Open interview prep" : "Prepare for the interview"}
          {/* A pack made on Pro or the trial stays readable on Free. */}
          {application?.hasPrep ? null : proBadge}
        </Link>
      </div>
    </Card>
  );
}
