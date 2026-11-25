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
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationHref, copyLetter } from "@/lib/applications/thread";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";

export function ApplicationCard({ resume }: { resume: Resume }) {
  return resume.tailor ? <TailoredCopyCard resume={resume} /> : <FindAJobCard />;
}

function FindAJobCard() {
  const setStep = useStudioStore((s) => s.setStep);
  const t = useMessages("studioDownload").next;
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setStep("tailor")}>
          <Target aria-hidden />
          {t.tailor}
        </Button>
        <Link href={ROUTES.dashboardJobs} className={buttonClasses({ variant: "ghost" })}>
          <Search aria-hidden />
          {t.jobs}
        </Link>
      </div>
    </Card>
  );
}

function TailoredCopyCard({ resume }: { resume: Resume }) {
  const { user } = useMe();
  const application = useCopyApplication(resume);
  const locked = useProTools() === false;
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const t = useMessages("studioDownload").application;
  if (!resume.tailor || !user) return null;
  const { jobTitle, company } = resume.tailor;
  const job =
    jobTitle && company ? fmt(t.titleAt, { title: jobTitle, company }) : jobTitle || company;
  const letter = copyLetter(resume) !== "";
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
        <CardTitle as="h2">{application ? t.yours : t.sent}</CardTitle>
        <CardDescription>
          {application
            ? `${job || application.company}. ${letter ? t.letterKept : t.lettersJoin}`
            : `${fmt(t.log, { job: job || t.thisJob })} ${letter ? t.letterGoes : t.remind}`}
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
              <span className="sr-only">{t.openIt}</span>
            </Link>
            <Link
              href={applicationHref(application.id)}
              className={buttonClasses({ variant: "ghost" })}
            >
              <PanelsTopLeft aria-hidden />
              {t.everything}
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
            {t.writeLetter}
            {proBadge}
          </Button>
        ) : (
          <Link href={ROUTES.dashboardLetters} className={buttonClasses({ variant: "ghost" })}>
            <FileText aria-hidden />
            {t.writeLetter}
            {proBadge}
          </Link>
        )}
        <Link
          href={application ? prepHref(application.id) : ROUTES.dashboardInterview}
          className={buttonClasses({ variant: "ghost" })}
        >
          <MessagesSquare aria-hidden />
          {application?.hasPrep ? t.openPrep : t.prepare}
          {application?.hasPrep ? null : proBadge}
        </Link>
      </div>
    </Card>
  );
}
