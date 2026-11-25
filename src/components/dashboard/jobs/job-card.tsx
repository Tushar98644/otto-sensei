"use client";

import {
  ArrowUpRight,
  Bookmark,
  Check,
  Ellipsis,
  Info,
  Plane,
  ScanSearch,
  Send,
  ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type CSSProperties } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import { StatusPill } from "@/components/ui/status";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import { applicationHref } from "@/lib/applications/thread";
import { SOURCE_INFO } from "@/lib/job-feed/sources";
import {
  type AskedAppliedAnswer,
  type JobMatch,
  type MatchedJob,
  type NotFitReason,
} from "@/lib/job-feed/types";
import { cn } from "@/lib/utils";
import { StatusIcon } from "../applications/status-menu";
import { midSentence } from "../i18n";
import { CardAppliedQuestion } from "./applied-question";
import { EmployerLine } from "./employer";
import { NotFitQuestion } from "./not-fit-question";
import { matchLead, placeParts, postedLabel, skillList } from "./view";

export type JobCardProps = {
  job: MatchedJob;
  now: number;
  applied: Application | null;
  tailoredTitle: string | null;
  logging: boolean;
  tailoring: boolean;
  free: boolean;
  onTailor: (job: MatchedJob) => void;
  onOpenTailored: (job: MatchedJob) => void;
  onToggleSave: (job: MatchedJob) => void;
  onMarkApplied: (job: MatchedJob) => void;
  onOpen?: (job: MatchedJob) => void;
  onOutreach?: (job: MatchedJob) => void;
  onCompany?: (job: MatchedJob) => void;
  asking?: boolean;
  onAnswer?: (job: MatchedJob, answer: AskedAppliedAnswer) => void;
  onNotFit?: (job: MatchedJob, reason: NotFitReason) => void;
  index?: number;
};

// The same caps as the reason sentence, so the chips never show more than it says.
const FOUND_SHOWN = 5;
const MISSING_SHOWN = 3;
const STAGGER_MS = 45;
const STAGGERED = 6;

const META_PART =
  "relative min-w-0 pl-4 before:absolute before:top-1/2 before:left-1.5 before:size-0.75 before:-translate-y-1/2 before:rounded-full before:bg-border-strong";

const BADGE = "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full text-xs/none font-medium";
const SEAL = "flex size-4.5 items-center justify-center rounded-full";

function MatchBadge({ match }: { match: JobMatch }) {
  const { card } = useMessages("jobs");
  if (match.label === "strong") {
    return (
      <span className={cn(BADGE, "bg-pass-soft pr-2.5 pl-1 text-pass-ink")}>
        <span className={cn(SEAL, "bg-pass text-white shadow-[0_1px_1px_rgb(23_97_58/0.35)]")}>
          <Check aria-hidden className="size-3" strokeWidth={3} />
        </span>
        {card.strong}
      </span>
    );
  }
  if (match.label === "good") {
    return (
      <span className={cn(BADGE, "bg-surface-muted pr-2.5 pl-1 text-ink")}>
        <span className={cn(SEAL, "bg-surface text-ink shadow-control ring-1 ring-ink/8")}>
          <Check aria-hidden className="size-3" strokeWidth={2.75} />
        </span>
        {card.good}
      </span>
    );
  }
  if (match.label === "stretch") {
    return (
      <span className={cn(BADGE, "bg-surface-muted pr-2.5 pl-1 text-muted")}>
        <span aria-hidden className={cn(SEAL, "border border-dashed border-border-strong")} />
        {card.stretch}
      </span>
    );
  }
  return <span className={cn(BADGE, "bg-surface-muted px-2.5 text-muted")}>{card.noOverlap}</span>;
}

function SkillChips({
  label,
  items,
  max,
  found,
}: {
  label: string;
  items: readonly string[];
  max: number;
  found: boolean;
}) {
  const { card } = useMessages("jobs");
  const format = useFormat();
  const { shown, more } = skillList(items, max);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <p className="shrink-0 text-xs/7 font-medium text-subtle sm:w-36">{label}</p>
      <ul className="flex flex-wrap gap-1.5">
        {shown.map((skill) => (
          <li
            key={skill}
            className={cn(
              "inline-flex h-7 max-w-full items-center gap-1 rounded-full px-2.5 text-xs/none",
              found
                ? "bg-surface-muted pl-2 font-medium text-ink"
                : "border border-dashed border-border-strong/70 text-muted",
            )}
          >
            {found ? (
              <Check aria-hidden className="size-3 shrink-0 text-pass" strokeWidth={2.75} />
            ) : null}
            <span className="truncate">{skill}</span>
          </li>
        ))}
        {more > 0 ? (
          <li className="inline-flex h-7 items-center px-1 text-xs/none text-subtle tabular-nums">
            {fmt(card.andMore, { count: format.number(more) })}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function JobCard({
  job,
  now,
  applied,
  tailoredTitle,
  logging,
  tailoring,
  free,
  onTailor,
  onOpenTailored,
  onToggleSave,
  onMarkApplied,
  onOpen,
  onOutreach,
  onCompany,
  asking = false,
  onAnswer,
  onNotFit,
  index = 0,
}: JobCardProps) {
  const t = useMessages("jobs");
  const { card } = t;
  const { statuses } = useMessages("applications");
  const format = useFormat();
  const [notFit, setNotFit] = useState<NotFitReason | "asking" | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const posted = postedLabel(job.postedAt, now, t, format);
  const meta = [...placeParts(job, t).flatMap((part) => part.split(/\s+·\s+/)), posted].filter(
    Boolean,
  );
  const lead = matchLead(job.match, card.notFound);
  const more: MenuEntry[] = [];
  if (onOutreach && !job.closed) {
    more.push({
      label: card.outreach,
      icon: Send,
      pro: free,
      onSelect: () => onOutreach(job),
    });
  }
  if (onNotFit && notFit === null) {
    more.push({ label: card.notFit, icon: ThumbsDown, onSelect: () => setNotFit("asking") });
  }

  const badges = (
    <>
      <MatchBadge match={job.match} />
      {job.match.blocked ? <StatusPill status="fail">{card.blocked}</StatusPill> : null}
    </>
  );

  return (
    <li
      className="motion-safe:animate-fade-in"
      style={
        index < STAGGERED
          ? ({ animationDelay: `${index * STAGGER_MS}ms` } as CSSProperties)
          : undefined
      }
    >
      <article
        aria-labelledby={titleId}
        aria-describedby={reasonId}
        className="flex flex-col gap-4 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgb(18_36_29/0.04)] ring-1 ring-ink/3 transition-[translate,box-shadow] duration-200 ease-out hover:shadow-[0_1px_2px_rgb(18_36_29/0.05),0_14px_32px_-16px_rgb(18_36_29/0.24)] motion-safe:hover:-translate-y-0.5 sm:p-6"
      >
        <div className="flex gap-3 sm:gap-4">
          <CompanyMark name={job.company} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 pt-0.5 text-sm/5 font-medium text-pretty text-muted">
                {job.company}
              </p>
              <div className="-mt-0.5 flex shrink-0 flex-wrap justify-end gap-1.5 max-sm:hidden">
                {badges}
              </div>
            </div>
            <h3
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              className="mt-0.5 text-lg/6 font-semibold tracking-tight text-pretty text-ink outline-none sm:text-xl/7"
            >
              {job.title}
            </h3>
            {/* Each part's dot sits in its own left padding, clipped at the line's start, so no line opens with one. */}
            <div className="mt-1.5 overflow-hidden">
              <ul className="-ml-4 flex flex-wrap text-sm/6 text-muted">
                {meta.map((part, at) => (
                  <li key={`${at}-${part}`} className={META_PART}>
                    {part}
                  </li>
                ))}
                {job.closed ? (
                  <li className={cn(META_PART, "font-medium text-ink")}>{card.closed}</li>
                ) : null}
                <li className={cn(META_PART, "text-subtle")}>
                  {fmt(card.via, { source: SOURCE_INFO[job.source].name })}
                </li>
              </ul>
            </div>
            {job.employer ? (
              <EmployerLine
                employer={job.employer}
                onOpen={onCompany ? () => onCompany(job) : undefined}
              />
            ) : null}
            {job.visa.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {job.visa.map((line) => (
                  <li
                    key={line}
                    className="inline-flex min-h-6 items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-0.5 text-xs/5 text-muted"
                  >
                    <Plane aria-hidden className="size-3 shrink-0 text-subtle" />
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5 sm:hidden">{badges}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:pl-16">
          <p id={reasonId} className="sr-only">
            {job.match.reason}
          </p>
          <div aria-hidden className="flex flex-col gap-2.5">
            {lead ? <p className="text-sm/6 text-pretty text-ink">{lead}</p> : null}
            <SkillChips label={card.found} items={job.match.found} max={FOUND_SHOWN} found />
            <SkillChips
              label={card.notFound}
              items={job.match.missing}
              max={MISSING_SHOWN}
              found={false}
            />
          </div>
          {job.match.notes.map((note) => (
            <p key={note} className="flex gap-2 text-sm/6 text-pretty text-muted">
              <Info aria-hidden className="mt-1 size-3.5 shrink-0 text-subtle" />
              {note}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:pl-16">
          {tailoredTitle ? (
            <Button size="sm" onClick={() => onOpenTailored(job)} className="max-sm:flex-1">
              {card.openTailored}
            </Button>
          ) : job.closed ? null : (
            <Button
              size="sm"
              loading={tailoring}
              onClick={() => onTailor(job)}
              className="max-sm:flex-1"
            >
              <ScanSearch aria-hidden />
              {card.tailor}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={job.saved}
            onClick={() => onToggleSave(job)}
          >
            <Bookmark
              key={job.saved ? "saved" : "save"}
              aria-hidden
              className={cn(job.saved && "fill-primary text-primary motion-safe:animate-pop")}
            />
            {job.saved ? card.saved : card.save}
            {free && !job.saved ? <ProMark /> : null}
          </Button>
          {applied ? (
            <Link
              href={applicationHref(applied.id)}
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: "text-muted hover:text-ink",
              })}
            >
              <StatusIcon status={applied.status} />
              {statuses[applied.status]}
              <span className="sr-only">{card.openApplication}</span>
            </Link>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={logging}
              onClick={() => onMarkApplied(job)}
            >
              {card.markApplied}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
            {/* A plain followed link: Remote OK's terms ask for one. */}
            <a
              href={job.url}
              target="_blank"
              rel="noopener"
              onClick={() => onOpen?.(job)}
              onAuxClick={(event) => {
                if (event.button === 1) onOpen?.(job);
              }}
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className:
                  "[&_svg]:text-muted [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5 hover:[&_svg]:-translate-y-0.5 hover:[&_svg]:text-ink",
              })}
            >
              {card.openJob}
              <ArrowUpRight aria-hidden />
              <span className="sr-only">{fmt(card.opensPosting, { company: job.company })}</span>
            </a>
            {more.length > 0 ? (
              <Menu
                label={fmt(card.moreFor, { title: job.title })}
                align="end"
                triggerLabel={fmt(card.moreFor, { title: job.title })}
                triggerClassName={buttonClasses({
                  variant: "ghost",
                  size: "icon-sm",
                  className: "text-muted hover:text-ink",
                })}
                trigger={<Ellipsis aria-hidden />}
                items={more}
              />
            ) : null}
          </div>
        </div>

        {notFit === "asking" && onNotFit ? (
          <NotFitQuestion
            title={job.title}
            onPick={(reason) => {
              setNotFit(reason);
              onNotFit(job, reason);
              titleRef.current?.focus();
            }}
            onCancel={() => {
              setNotFit(null);
              titleRef.current?.focus();
            }}
          />
        ) : notFit && notFit !== "asking" ? (
          <p className="text-sm/6 text-muted" role="status">
            {fmt(card.noted, { reason: midSentence(format, t.notFit.reasons[notFit]) })}
          </p>
        ) : null}

        {onAnswer ? (
          <CardAppliedQuestion
            open={asking && !applied}
            company={job.company}
            logging={logging}
            onAnswer={(answer) => onAnswer(job, answer)}
            focusAfter={titleRef}
          />
        ) : null}
      </article>
    </li>
  );
}
