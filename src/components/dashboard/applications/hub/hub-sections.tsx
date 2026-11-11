"use client";

import {
  ArrowUpRight,
  Check,
  Copy,
  FileText,
  MessagesSquare,
  PanelsTopLeft,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ROUTES } from "@/components/site/routes";
import { copyText } from "@/components/studio/tailor/letter-panel";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import type { Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import type { ApplicationThread } from "@/lib/applications/thread";
import { sourceCredit } from "@/lib/job-feed/sources";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { cn, pluralize } from "@/lib/utils";
import type { Writing } from "@/lib/writings/schema";
import { StatusIcon } from "../status-menu";
import { formatDay, prepHref } from "../view";
import type { TimelineStep } from "./timeline";

export function HubCard({
  id,
  title,
  meta,
  children,
  className,
}: {
  // An anchor other screens link to, e.g. the board card's Letter mark goes to #letters.
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
  return (
    <HubCard title="Timeline">
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
                  {STATUS_NAMES[step.status]}
                  <span className="sr-only">
                    {step.state === "current"
                      ? " (now)"
                      : step.state === "next"
                        ? " (not yet)"
                        : " (done)"}
                  </span>
                </p>
                {step.at !== null ? (
                  <p className="text-xs/5 text-subtle">{formatDay(step.at, now || step.at)}</p>
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

export type HubLetter = {
  key: string;
  kind: Writing["kind"];
  question: string;
  text: string;
  at: number;
  // Kept on the tailored copy rather than as a saved row.
  onCopy: boolean;
};

/** The saved letters and answers, plus the copy's own letter when it isn't one of them. */
export function hubLetters(
  writings: readonly Writing[],
  copy: Resume | null,
  copyLetter: string,
): HubLetter[] {
  const letters: HubLetter[] = writings.map((writing) => ({
    key: writing.id,
    kind: writing.kind,
    question: writing.question,
    text: writing.text,
    at: writing.createdAt,
    onCopy: false,
  }));
  const same = (a: string, b: string) => a.trim() === b.trim();
  if (copy?.tailor && copyLetter && !writings.some((writing) => same(writing.text, copyLetter))) {
    letters.push({
      key: `copy:${copy.id}`,
      kind: "letter",
      question: "",
      text: copyLetter,
      at: copy.tailor.createdAt,
      onCopy: true,
    });
  }
  return letters.sort((a, b) => b.at - a.at);
}

export function LettersCard({
  letters,
  now,
  pro,
  onWrite,
}: {
  letters: HubLetter[];
  now: number;
  pro: boolean | null;
  onWrite: () => void;
}) {
  const count = letters.filter((letter) => letter.kind === "letter").length;
  const answers = letters.length - count;
  const meta = letters.length
    ? [count ? pluralize(count, "letter") : null, answers ? pluralize(answers, "answer") : null]
        .filter(Boolean)
        .join(" · ")
    : undefined;
  return (
    <HubCard id="letters" title="Cover letters and answers" meta={meta}>
      {letters.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {letters.map((letter) => (
            <li
              key={letter.key}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs/5 text-subtle">
                  <Badge>{letter.kind === "letter" ? "Letter" : "Answer"}</Badge>
                  {letter.onCopy ? "On your tailored copy" : formatDay(letter.at, now || letter.at)}
                </p>
                {letter.question ? (
                  <p className="mt-1.5 text-sm/6 font-medium text-ink">{letter.question}</p>
                ) : null}
                <p className="mt-1 line-clamp-3 text-sm/6 whitespace-pre-line text-muted">
                  {letter.text}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                onClick={() =>
                  void copyText(letter.text, letter.kind === "letter" ? "letter" : "answer")
                }
              >
                <Copy aria-hidden />
                Copy
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm/6 text-muted">
          No cover letter yet. Letters you write for this job show up here by themselves.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onWrite}>
          <PenLine aria-hidden />
          Write a cover letter
          {pro === false ? (
            <Badge variant="ink" className="h-5 px-1.5">
              Pro
            </Badge>
          ) : null}
        </Button>
        {letters.length > 0 ? (
          <Link
            href={ROUTES.dashboardLetters}
            className={buttonClasses({
              variant: "ghost",
              size: "sm",
              className: "text-muted hover:text-ink",
            })}
          >
            All cover letters
          </Link>
        ) : null}
      </div>
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
  return (
    <HubCard
      title="Interview prep"
      meta={prep ? `Made ${formatDay(prep.createdAt, now || prep.createdAt)}` : undefined}
    >
      {prep ? (
        <>
          <p className="text-sm/6 text-muted">
            {pluralize(prep.questions, "likely question")} and{" "}
            {pluralize(prep.stories, "story", "stories")} from your own resume lines.
            {prep.demo ? " Sample prep, made without the AI." : ""}
          </p>
          <Link
            href={prepHref(application.id)}
            className={buttonClasses({ size: "sm", className: "self-start" })}
          >
            <MessagesSquare aria-hidden />
            Open prep
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm/6 text-muted">
            {application.status === "interview"
              ? "Likely questions for this job, stories from your own lines, and questions to ask them."
              : "When an interview is booked, prep for it starts from this job and the resume you sent."}
          </p>
          <Button
            variant={application.status === "interview" ? "primary" : "secondary"}
            size="sm"
            className="self-start"
            onClick={onPrepare}
          >
            <MessagesSquare aria-hidden />
            Prepare for this interview
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
  const url = job?.url || application.jobUrl;
  const place = job
    ? [job.remote && !/remote/i.test(job.location) ? "Remote" : "", job.location]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <HubCard title="The job">
      <div className="flex flex-col gap-1">
        <p className="text-sm/6 font-medium text-ink">
          {job?.title || application.role || "Role not named"}
        </p>
        <p className="text-sm/5 text-muted">{job?.company || application.company}</p>
        {place ? <p className="text-sm/5 text-muted">{place}</p> : null}
        {job ? (
          <p className="text-xs/5 text-subtle">
            {sourceCredit(job.source)} · Posted {formatDay(job.postedAt, now || job.postedAt)}
            {job.closed ? " · This post has closed" : ""}
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
          Open job post
          <ArrowUpRight aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm/6 text-muted">No link to the post is saved.</p>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <PenLine aria-hidden />
            Add the link
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
  return (
    <HubCard title="Resume sent">
      {sent ? (
        <>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-sm/6 font-medium text-ink">{resumeTitle(sent)}</p>
            {sent.tailor ? (
              <Badge className="mt-0.5">
                <FileText aria-hidden />
                Tailored to this job
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpen(sent.id, "fix")}>
              <PanelsTopLeft aria-hidden />
              Open in the studio
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpen(sent.id, "download")}>
              Download PDF
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm/6 text-muted">
          {application.resumeId
            ? application.resumeTitle
              ? `“${application.resumeTitle}”, which isn't in this browser now.`
              : "A resume that isn't in this browser now."
            : "A resume that isn't in Otto."}
        </p>
      )}
    </HubCard>
  );
}

export function NotesCard({ notes, onEdit }: { notes: string; onEdit: () => void }) {
  return (
    <HubCard title="Notes">
      {notes ? (
        <p className="text-sm/6 whitespace-pre-line text-ink">{notes}</p>
      ) : (
        <p className="text-sm/6 text-muted">
          Who you spoke to, what they asked, what to send next.
        </p>
      )}
      <Button variant="ghost" size="sm" className="self-start" onClick={onEdit}>
        <PenLine aria-hidden />
        {notes ? "Edit notes" : "Add notes"}
      </Button>
    </HubCard>
  );
}
