"use client";

import {
  ArrowUpRight,
  Check,
  FileText,
  MessagesSquare,
  PanelsTopLeft,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import type { ApplicationThread } from "@/lib/applications/thread";
import { SOURCE_INFO } from "@/lib/job-feed/sources";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { formatDay } from "../../i18n";
import { StatusIcon } from "../status-menu";
import { prepHref } from "../view";
import type { TimelineStep } from "./timeline";

export function HubCard({
  id,
  title,
  meta,
  children,
  className,
}: {
  id?: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn("flex scroll-mt-6 flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6", className)}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-sans text-base/6 font-semibold text-ink">{title}</h2>
        {meta ? <p className="text-sm/5 text-subtle">{meta}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function TimelineCard({ steps, now }: { steps: TimelineStep[]; now: number }) {
  const t = useMessages("applications");
  const format = useFormat();
  return (
    <HubCard title={t.hub.timeline}>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const last = index === steps.length - 1;
          return (
            <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0">
              {last ? null : (
                <span aria-hidden className="absolute top-7 bottom-0 left-3 w-px bg-border" />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative flex size-6 shrink-0 items-center justify-center rounded-full",
                  step.state === "done" && "bg-surface-muted text-ink",
                  step.state === "current" && "bg-ink text-white",
                  step.state === "next" && "inset-ring inset-ring-border-strong",
                )}
              >
                {step.state === "done" ? <Check className="size-3.5" /> : null}
                {step.state === "current" ? (
                  <StatusIcon status={step.status} className="size-3.5 text-white" />
                ) : null}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm/5",
                    step.state === "current"
                      ? "font-medium text-ink"
                      : step.state === "done"
                        ? "text-ink"
                        : "text-muted",
                  )}
                >
                  {t.statuses[step.status]}
                  <span className="sr-only">
                    {step.state === "current"
                      ? t.hub.now
                      : step.state === "next"
                        ? t.hub.notYet
                        : t.hub.done}
                  </span>
                </p>
                {step.at !== null ? (
                  <p className="text-xs/5 text-subtle">
                    {formatDay(format, step.at, now || step.at)}
                  </p>
                ) : step.state === "done" ? (
                  <p className="text-xs/5 text-subtle">No date kept</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </HubCard>
  );
}

export function PrepCard({
  application,
  prep,
  now,
  pro,
  onPrepare,
}: {
  application: Application;
  prep: ApplicationThread["prep"];
  now: number;
  pro: boolean | null;
  onPrepare: () => void;
}) {
  const { hub } = useMessages("applications");
  const format = useFormat();
  return (
    <HubCard
      title={hub.prep}
      meta={
        prep
          ? fmt(hub.prepMade, { day: formatDay(format, prep.createdAt, now || prep.createdAt) })
          : undefined
      }
    >
      {prep ? (
        <>
          <p className="text-sm/6 text-muted">
            {fmt(hub.prepSummary, {
              questions: format.plural(hub.likelyQuestions, prep.questions),
              stories: format.plural(hub.stories, prep.stories),
            })}
            {prep.demo ? hub.samplePrep : ""}
          </p>
          <Link
            href={prepHref(application.id)}
            className={buttonClasses({ size: "sm", className: "self-start" })}
          >
            <MessagesSquare aria-hidden />
            {hub.openPrep}
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm/6 text-muted">
            {application.status === "interview" ? hub.prepPitch : hub.prepLater}
          </p>
          <Button
            variant={application.status === "interview" ? "primary" : "secondary"}
            size="sm"
            className="self-start"
            onClick={onPrepare}
          >
            <MessagesSquare aria-hidden />
            {hub.prepare}
            {pro === false ? (
              <Badge variant="ink" className="h-5 px-1.5">
                Pro
              </Badge>
            ) : null}
          </Button>
        </>
      )}
    </HubCard>
  );
}

export function JobCard({
  application,
  job,
  now,
  onEdit,
}: {
  application: Application;
  job: ApplicationThread["job"];
  now: number;
  onEdit: () => void;
}) {
  const { hub } = useMessages("applications");
  const format = useFormat();
  const url = job?.url || application.jobUrl;
  const place = job
    ? [job.remote && !/remote/i.test(job.location) ? hub.remote : "", job.location]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <HubCard title={hub.job}>
      <div className="flex flex-col gap-1">
        <p className="text-sm/6 font-medium text-ink">
          {job?.title || application.role || hub.roleNotNamed}
        </p>
        <p className="text-sm/5 text-muted">{job?.company || application.company}</p>
        {place ? <p className="text-sm/5 text-muted">{place}</p> : null}
        {job ? (
          <p className="text-xs/5 text-subtle">
            {fmt(hub.postedVia, {
              source: fmt(hub.via, { source: SOURCE_INFO[job.source].name }),
              day: formatDay(format, job.postedAt, now || job.postedAt),
            })}
            {job.closed ? hub.postClosed : ""}
          </p>
        ) : null}
      </div>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener"
          className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start" })}
        >
          {hub.openPost}
          <ArrowUpRight aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm/6 text-muted">No link to the post is saved.</p>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PenLine aria-hidden />
            {hub.addLink}
          </Button>
        </div>
      )}
    </HubCard>
  );
}

export function ResumeSentCard({
  application,
  sent,
  onOpen,
}: {
  application: Application;
  sent: Resume | null;
  onOpen: (id: string, step: "fix" | "download") => void;
}) {
  const { hub } = useMessages("applications");
  return (
    <HubCard title={hub.resumeSent}>
      {sent ? (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-sm/6 font-medium text-ink">{resumeTitle(sent)}</p>
            {sent.tailor ? (
              <Badge className="mt-0.5">
                <FileText aria-hidden />
                {hub.tailored}
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpen(sent.id, "fix")}>
              <PanelsTopLeft aria-hidden />
              {hub.openStudio}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpen(sent.id, "download")}>
              {hub.download}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm/6 text-muted">
          {application.resumeId
            ? application.resumeTitle
              ? fmt(hub.notInBrowserTitled, { title: application.resumeTitle })
              : hub.notInBrowser
            : hub.notInOtto}
        </p>
      )}
    </HubCard>
  );
}

export function NotesCard({ notes, onEdit }: { notes: string; onEdit: () => void }) {
  const { hub } = useMessages("applications");
  return (
    <HubCard title={hub.notes}>
      {notes ? (
        <p className="text-sm/6 whitespace-pre-line text-ink">{notes}</p>
      ) : (
        <p className="text-sm/6 text-muted">{hub.notesHint}</p>
      )}
      <Button variant="ghost" size="sm" className="self-start" onClick={onEdit}>
        <PenLine aria-hidden />
        {notes ? hub.editNotes : hub.addNotes}
      </Button>
    </HubCard>
  );
}
