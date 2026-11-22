"use client";

import { ArrowRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useId, type CSSProperties, type ReactNode } from "react";
import { InterviewTicket } from "@/components/dashboard/applications/board/card/interview-ticket";
import { interviewWhen } from "@/components/dashboard/applications/board/card/when";
import { PracticeMeter } from "@/components/dashboard/applications/prep/practice-meter";
import {
  gotCount,
  practiceKey,
  usePractice,
} from "@/components/dashboard/applications/prep/practice-store";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { FolderCard } from "@/components/ui/folder-card";
import { ProMark } from "@/components/ui/pro-mark";
import { applicationHref } from "@/lib/applications/thread";
import type { PrepSummary } from "@/lib/insights/prep";
import { cn, pluralize } from "@/lib/utils";
import { formatDay } from "../applications/view";
import { AddToCalendar } from "./add-to-calendar";
import { InterviewArt } from "./interview-art";
import { interviewHref, type InterviewEntry } from "./view";

const LIFTABLE =
  "transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-page-lift has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink";
const CARD = "rounded-2xl bg-surface shadow-card ring-1 ring-ink/6";
const STRETCH = "outline-none after:absolute after:inset-0 after:rounded-2xl";

export type PrepareAction = { locked: boolean; onLocked: () => void };

const stagger = (index: number): CSSProperties => ({ animationDelay: `${(index + 1) * 70}ms` });

function jobName(company: string, role: string): string {
  return role.trim() || `Your ${company} interview`;
}

function usePackPractice(pack: PrepSummary | null): number {
  const record = usePractice(pack ? practiceKey(pack.applicationId, pack.createdAt) : null);
  return pack ? Math.min(gotCount(record), pack.questions) : 0;
}

// Prepare is one click: the link carries ?start=1, so the prep page starts on arrival.
function PrepareTarget({
  entry,
  action,
  className,
  describedBy,
  children,
}: {
  entry: InterviewEntry;
  action: PrepareAction;
  className: string;
  describedBy?: string;
  children: ReactNode;
}) {
  const { application, pack } = entry;
  if (!pack && action.locked) {
    return (
      <button
        type="button"
        onClick={action.onLocked}
        aria-describedby={describedBy}
        className={className}
      >
        {children}
      </button>
    );
  }
  return (
    <Link
      href={interviewHref(application.id, { start: !pack })}
      aria-describedby={describedBy}
      className={className}
    >
      {children}
    </Link>
  );
}

// The countdown beside the company: "Tomorrow", "In 3 days"; sepia while it's close.
function Countdown({ at, now }: { at: number; now: number }) {
  if (now <= 0) return null;
  const when = interviewWhen(at, now);
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs/4 font-medium whitespace-nowrap tabular-nums",
        when.soon ? "bg-otter-light text-otter" : "bg-surface-muted text-muted",
      )}
    >
      {when.lead}
      <span className="sr-only">, {when.spoken}</span>
    </span>
  );
}

function Undated({ applicationId }: { applicationId: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm/5 text-muted">
      <CalendarClock aria-hidden className="size-4 text-subtle" />
      No interview day yet.
      <Link
        href={applicationHref(applicationId)}
        className="relative z-10 font-medium text-ink underline decoration-border-strong underline-offset-4 hover:decoration-ink"
      >
        Add the day
      </Link>
    </p>
  );
}

// The soonest interview, drawn like Home's Up next: Otto beside the day, the job, one key.
export function FeaturedInterview({
  entry,
  now,
  action,
  allowance,
}: {
  entry: InterviewEntry;
  now: number;
  action: PrepareAction;
  allowance: string | null;
}) {
  const { application, pack } = entry;
  const got = usePackPractice(pack);
  const at = application.interviewAt;
  const cta = pack ? "Open prep" : "Prepare";
  return (
    <div className="group/art group/otto relative grid gap-2 rounded-xl has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink motion-safe:animate-fade-in sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[17rem_minmax(0,1fr)]">
      <InterviewArt at={at} prepared={pack !== null} className="h-40 sm:h-full sm:min-h-48" />
      <div className="flex min-w-0 flex-col items-start gap-4 px-2 pt-2 pb-2 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
        <div className="flex w-full flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <CompanyMark name={application.company} size="sm" />
            <span className="min-w-0 text-sm/5 font-medium text-pretty text-ink">
              {application.company}
            </span>
            {at === null ? null : <Countdown at={at} now={now} />}
            {pack?.demo ? <Badge>Demo</Badge> : null}
          </div>
          <h3 className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
            <PrepareTarget entry={entry} action={action} className={cn("text-left", STRETCH)}>
              {jobName(application.company, application.role)}
            </PrepareTarget>
          </h3>
          {pack ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm/6 text-muted">
                {pluralize(pack.questions, "question")} round by round
                {pack.stories > 0
                  ? `, ${pluralize(pack.stories, "story", "stories")} from your own lines`
                  : ""}
                .
              </p>
              <PracticeMeter got={got} total={pack.questions} />
            </div>
          ) : (
            <p className="max-w-prose text-sm/6 text-pretty text-muted">
              One click: Otto reads the job post and builds likely questions and stories from your
              own resume lines.
            </p>
          )}
        </div>
        {at === null ? <Undated applicationId={application.id} /> : null}
        <div className="flex w-full flex-wrap items-center gap-2">
          {/* The whole card is the link above; the key only shows where to press. */}
          <span
            aria-hidden
            className={buttonClasses({
              className:
                "pointer-events-none group-hover/art:from-primary-hover-top group-hover/art:to-primary-hover group-active/art:translate-y-px max-sm:flex-1",
            })}
          >
            {cta}
            <ArrowRight className="transition-transform duration-200 group-hover/art:translate-x-0.5" />
          </span>
          {at === null ? null : (
            <AddToCalendar
              interview={{
                applicationId: application.id,
                company: application.company,
                role: application.role,
                interviewAt: at,
                interviewTime: application.interviewTime,
                interviewZone: application.interviewZone,
              }}
              className="relative z-10 max-sm:flex-1"
            />
          )}
          {action.locked && !pack ? <ProMark className="relative z-10 ml-1" /> : null}
        </div>
        {!pack && !action.locked && allowance ? (
          <p className="text-xs/5 text-subtle">{allowance}</p>
        ) : null}
      </div>
    </div>
  );
}

// Each later interview: a white card with its mark, its calendar leaf and one way in.
export function InterviewTile({
  entry,
  now,
  action,
  index,
}: {
  entry: InterviewEntry;
  now: number;
  action: PrepareAction;
  index: number;
}) {
  const { application, pack } = entry;
  const got = usePackPractice(pack);
  const at = application.interviewAt;
  const titleId = useId();
  const soon = at !== null && now > 0 && !interviewWhen(at, now).past;
  return (
    <li
      style={stagger(index)}
      className={cn(
        "group/tile relative flex flex-col gap-4 p-4 motion-safe:animate-fade-in",
        CARD,
        LIFTABLE,
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyMark name={application.company} />
        <div className="min-w-0 flex-1">
          <p className="text-xs/4 font-medium text-subtle">{application.company}</p>
          <h3 id={titleId} className="mt-0.5 text-base/6 font-medium text-pretty text-ink">
            {jobName(application.company, application.role)}
          </h3>
        </div>
        {pack?.demo ? <Badge>Demo</Badge> : null}
      </div>
      {at === null ? (
        <Undated applicationId={application.id} />
      ) : (
        <InterviewTicket at={at} now={now} />
      )}
      {pack ? <PracticeMeter got={got} total={pack.questions} /> : null}
      <div className="mt-auto flex items-center justify-between gap-2">
        <PrepareTarget
          entry={entry}
          action={action}
          describedBy={titleId}
          className={cn("inline-flex items-center gap-1.5 text-sm/6 font-medium text-ink", STRETCH)}
        >
          {pack ? "Open prep" : "Prepare"}
          {action.locked && !pack ? <ProMark /> : null}
          <ArrowRight
            aria-hidden
            className="size-4 text-muted transition duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:text-ink"
          />
        </PrepareTarget>
        {at !== null && soon ? (
          <AddToCalendar
            interview={{
              applicationId: application.id,
              company: application.company,
              role: application.role,
              interviewAt: at,
              interviewTime: application.interviewTime,
              interviewZone: application.interviewZone,
            }}
            variant="ghost"
            size="sm"
            className="relative z-10 -mr-1.5 text-muted hover:text-ink"
          />
        ) : null}
      </div>
    </li>
  );
}

function PackSheet({
  company,
  questions,
  stories,
}: {
  company: string;
  questions: number;
  stories: number;
}) {
  const rows = Math.min(Math.max(questions, 2), 3);
  return (
    <div aria-hidden className="relative h-36 overflow-hidden rounded-xl bg-surface-muted">
      <div className="absolute inset-x-[18%] top-5">
        <div className="absolute inset-0 rotate-3 rounded-xs bg-surface shadow-page transition duration-300 ease-out group-hover/art:rotate-6" />
        <div className="relative flex -rotate-1 flex-col gap-2 rounded-xs bg-surface p-3 shadow-page transition duration-300 ease-out group-hover/art:-translate-y-2 group-hover/art:shadow-page-lift">
          <span className="flex items-center gap-1.5">
            <CompanyMark
              name={company}
              size="sm"
              className="size-5 rounded-[5px] text-[0.6875rem]"
            />
            <span className="h-1.5 w-14 rounded-full bg-border-strong/50" />
          </span>
          {Array.from({ length: rows }, (_, row) => (
            <span key={row} className="flex items-center gap-1.5">
              <span className="font-display text-sm/3 text-ink/55">“</span>
              <span
                className={cn("h-1 rounded-full bg-surface-strong", row % 2 ? "w-3/5" : "w-4/5")}
              />
            </span>
          ))}
          {stories > 0 ? (
            <span className="flex gap-1">
              {["S", "T", "A", "R"].map((letter) => (
                <span
                  key={letter}
                  className="flex size-3.5 items-center justify-center rounded-full bg-primary/10 text-[0.5rem] font-semibold text-primary"
                >
                  {letter}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// A prep pack is a document, so it sits in a folder like a resume: paper in a well, the job under it.
export function PackCard({ pack, now, index }: { pack: PrepSummary; now: number; index: number }) {
  const got = usePackPractice(pack);
  const titleId = useId();
  return (
    <li style={stagger(index)} className="group/art relative flex motion-safe:animate-fade-in">
      <FolderCard
        tab="Prep pack"
        tabEnd={
          <span className="text-xs/4 text-subtle">
            Made {formatDay(pack.createdAt, now || pack.createdAt)}
          </span>
        }
        className="w-full"
        bodyClassName="flex flex-col p-2 transition duration-200 ease-out group-hover/art:shadow-page-lift has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
      >
        <PackSheet company={pack.company} questions={pack.questions} stories={pack.stories} />
        <div className="flex flex-1 flex-col gap-3 px-3 pt-4 pb-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs/4 font-medium text-subtle">{pack.company}</p>
              <h3 id={titleId} className="mt-0.5 text-base/6 font-medium text-pretty text-ink">
                {jobName(pack.company, pack.role)}
              </h3>
            </div>
            {pack.demo ? <Badge>Demo</Badge> : null}
          </div>
          <p className="text-sm/5 text-muted">
            {pluralize(pack.questions, "question")}
            {pack.stories > 0 ? ` · ${pluralize(pack.stories, "story", "stories")}` : ""}
          </p>
          <PracticeMeter got={got} total={pack.questions} />
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <Link
              href={interviewHref(pack.applicationId)}
              aria-describedby={titleId}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm/6 font-medium text-ink",
                STRETCH,
              )}
            >
              Open prep
              <ArrowRight
                aria-hidden
                className="size-4 text-muted transition duration-200 group-hover/art:translate-x-0.5 group-hover/art:text-ink"
              />
            </Link>
            <Link
              href={applicationHref(pack.applicationId)}
              aria-describedby={titleId}
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: "relative z-10 -mr-1.5 text-muted hover:text-ink",
              })}
            >
              Application
            </Link>
          </div>
        </div>
      </FolderCard>
    </li>
  );
}
