"use client";

import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
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

function MatchChip({ match }: { match: JobMatch }) {
  if (match.label === "strong") return <StatusPill status="pass">{MATCH_LABELS.strong}</StatusPill>;
  if (match.label === null) return <Badge>No overlap</Badge>;
  return <Badge>{MATCH_LABELS[match.label]}</Badge>;
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
        className="flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6"
      >
        <div className="flex flex-col gap-1">
          <p className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm/5 text-subtle">
            <span className="font-medium text-muted">{job.company}</span>
            <span>{sourceCredit(job.source)}</span>
          </p>
          <h3
            ref={titleRef}
            id={titleId}
            tabIndex={-1}
            className="text-base/6 font-semibold text-pretty text-ink outline-none"
          >
            {job.title}
          </h3>
          <p className="text-sm/6 text-muted">
            {[place, posted].filter(Boolean).join(" · ")}
            {job.closed ? (
              <span className="font-medium text-ink"> · This job has closed</span>
            ) : null}
          </p>
          {job.visa.length > 0 ? (
            <p className="text-sm/6 text-subtle">{job.visa.join(" · ")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <MatchChip match={job.match} />
            {job.match.blocked ? <StatusPill status="fail">Likely blocked</StatusPill> : null}
          </div>
          <p id={reasonId} className="text-sm/6 text-pretty text-ink">
            {job.match.reason}
          </p>
          {job.match.notes.map((note) => (
            <p key={note} className="text-sm/6 text-pretty text-muted">
              {note}
            </p>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tailoredTitle ? (
            <Button size="sm" onClick={() => onOpenTailored(job)}>
              Open tailored copy
            </Button>
          ) : job.closed ? null : (
            <Button size="sm" loading={tailoring} onClick={() => onTailor(job)}>
              <ScanSearch aria-hidden />
              Tailor my resume
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            aria-pressed={job.saved}
            onClick={() => onToggleSave(job)}
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
              variant="secondary"
              size="sm"
              loading={logging}
              onClick={() => onMarkApplied(job)}
            >
              Mark applied
            </Button>
          )}
          {/* A plain followed link: Remote OK's terms ask for one. */}
          <a
            href={job.url}
            target="_blank"
            rel="noopener"
            onClick={() => onOpen?.(job)}
            onAuxClick={(event) => {
              if (event.button === 1) onOpen?.(job);
            }}
            className={buttonClasses({ variant: "ghost", size: "sm", className: "sm:ml-auto" })}
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
      </article>
    </li>
  );
}
