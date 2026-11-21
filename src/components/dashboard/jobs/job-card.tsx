"use client";

import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CircleCheck,
  ClipboardCheck,
  Ellipsis,
  ScanSearch,
  Send,
  ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import { StatusPill } from "@/components/ui/status";
import { STATUS_NAMES } from "@/lib/applications/status";
import type { Application } from "@/lib/applications/schema";
import { applicationHref } from "@/lib/applications/thread";
import { sourceCredit } from "@/lib/job-feed/sources";
import {
  MATCH_LABELS,
  NOT_FIT_LABELS,
  type AskedAppliedAnswer,
  type JobMatch,
  type MatchedJob,
  type NotFitReason,
} from "@/lib/job-feed/types";
import { cn } from "@/lib/utils";
import { StatusIcon } from "../applications/status-menu";
import { CardAppliedQuestion } from "./applied-question";
import { NotFitQuestion } from "./not-fit-question";
import { placeLine, postedLabel } from "./view";

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
  asking?: boolean;
  onAnswer?: (job: MatchedJob, answer: AskedAppliedAnswer) => void;
  onNotFit?: (job: MatchedJob, reason: NotFitReason) => void;
};

const LABEL = "h-7 gap-1.5 px-2.5 text-sm";
const CHIP = "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs/4 font-medium";
const FOUND_SHOWN = 6;
const MISSING_SHOWN = 3;
const QUIET_ICON = "[&_svg]:text-muted";

function MatchLabel({ match }: { match: JobMatch }) {
  if (match.label === "strong") {
    return (
      <Badge variant="pass" className={cn(LABEL, "bg-pass-soft text-pass-ink")}>
        <CircleCheck aria-hidden className="size-4 text-pass" />
        {MATCH_LABELS.strong}
      </Badge>
    );
  }
  return (
    <Badge className={cn(LABEL, "text-ink")}>
      {match.label === null ? "No overlap" : MATCH_LABELS[match.label]}
    </Badge>
  );
}

function More({ skills }: { skills: readonly string[] }) {
  if (skills.length === 0) return null;
  return (
    <li title={skills.join(", ")} className={cn(CHIP, "text-subtle")}>
      +{skills.length}
    </li>
  );
}

// The reason sentence stays for screen readers; the chips repeat it for the eye.
function Skills({ match }: { match: JobMatch }) {
  const missing = match.missing.slice(0, MISSING_SHOWN);
  return (
    <div aria-hidden className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <ul className="flex flex-wrap gap-1.5">
        {match.found.slice(0, FOUND_SHOWN).map((skill) => (
          <li key={skill} className={cn(CHIP, "bg-surface-muted text-ink")}>
            <Check className="size-3 text-pass" strokeWidth={2.25} />
            {skill}
          </li>
        ))}
        <More skills={match.found.slice(FOUND_SHOWN)} />
      </ul>
      {missing.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs/4 text-subtle">Not found</span>
          <ul className="flex flex-wrap gap-1.5">
            {missing.map((skill) => (
              <li
                key={skill}
                className={cn(CHIP, "text-muted ring-1 ring-border-control ring-inset")}
              >
                {skill}
              </li>
            ))}
            <More skills={match.missing.slice(MISSING_SHOWN)} />
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// No logos in the feeds, so the company's first letter gives each card an anchor to scan by.
function Monogram({ company }: { company: string }) {
  const letter = company.match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase() ?? "";
  return (
    <span
      aria-hidden
      className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-base font-semibold text-ink sm:flex"
    >
      {letter}
    </span>
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
  asking = false,
  onAnswer,
  onNotFit,
}: JobCardProps) {
  const [notFit, setNotFit] = useState<NotFitReason | "asking" | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const posted = postedLabel(job.postedAt, now);
  const place = placeLine(job);
  const chips = job.match.found.length > 0;
  const more: MenuEntry[] = [];
  if (onOutreach && !job.closed) {
    more.push({
      label: "Write an outreach message",
      icon: Send,
      pro: free,
      onSelect: () => onOutreach(job),
    });
  }
  if (onNotFit && notFit === null) {
    more.push({ label: "Not a fit", icon: ThumbsDown, onSelect: () => setNotFit("asking") });
  }

  return (
    <li>
      <article
        aria-labelledby={titleId}
        aria-describedby={reasonId}
        className="flex gap-4 rounded-2xl bg-surface p-5 sm:p-6"
      >
        <Monogram company={job.company} />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3
                  ref={titleRef}
                  id={titleId}
                  tabIndex={-1}
                  className="text-base/6 font-semibold text-pretty text-ink outline-none"
                >
                  {job.title}
                </h3>
                <p className="text-sm/6 text-pretty text-muted">
                  <span className="font-medium text-ink">{job.company}</span>
                  {[place, posted].filter(Boolean).map((part) => (
                    <span key={part}> · {part}</span>
                  ))}
                  {job.closed ? (
                    <span className="font-medium text-ink"> · This job has closed</span>
                  ) : null}
                  <span className="text-subtle"> · {sourceCredit(job.source)}</span>
                </p>
                {job.visa.length > 0 ? (
                  <p className="text-sm/6 text-subtle">{job.visa.join(" · ")}</p>
                ) : null}
              </div>
              <div className="order-first flex flex-wrap gap-1.5 sm:order-none sm:shrink-0 sm:justify-end">
                <MatchLabel match={job.match} />
                {job.match.blocked ? (
                  <StatusPill status="fail" className={LABEL}>
                    Likely blocked
                  </StatusPill>
                ) : null}
              </div>
            </div>

            {chips ? <Skills match={job.match} /> : null}
            <p id={reasonId} className={chips ? "sr-only" : "text-sm/6 text-pretty text-muted"}>
              {job.match.reason}
            </p>
            {job.match.notes.length > 0 ? (
              <div className="flex flex-col">
                {job.match.notes.map((note) => (
                  <p key={note} className="text-sm/6 text-pretty text-muted">
                    {note}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
            {tailoredTitle ? (
              <Button size="sm" onClick={() => onOpenTailored(job)} className="mr-1">
                Open tailored copy
              </Button>
            ) : job.closed ? null : (
              <Button size="sm" loading={tailoring} onClick={() => onTailor(job)} className="mr-1">
                <ScanSearch aria-hidden />
                Tailor my resume
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={job.saved}
              onClick={() => onToggleSave(job)}
              className={job.saved ? undefined : QUIET_ICON}
            >
              {job.saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
              {job.saved ? "Saved" : "Save"}
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
                {STATUS_NAMES[applied.status]}
                <span className="sr-only">: open this application</span>
              </Link>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                loading={logging}
                onClick={() => onMarkApplied(job)}
                className={QUIET_ICON}
              >
                <ClipboardCheck aria-hidden />
                Mark applied
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
                className={buttonClasses({ variant: "ghost", size: "sm", className: QUIET_ICON })}
              >
                Open job
                <ArrowUpRight aria-hidden />
                <span className="sr-only">(opens {job.company}&apos;s posting in a new tab)</span>
              </a>
              {more.length > 0 ? (
                <Menu
                  label={`More for ${job.title}`}
                  align="end"
                  triggerLabel={`More for ${job.title}`}
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
              Noted: {NOT_FIT_LABELS[notFit].toLowerCase()}. Thanks.
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
        </div>
      </article>
    </li>
  );
}
