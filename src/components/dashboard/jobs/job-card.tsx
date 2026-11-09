"use client";

import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  CircleCheck,
  ScanSearch,
  ThumbsDown,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { StatusPill } from "@/components/ui/status";
import { STATUS_NAMES } from "@/lib/applications/status";
import type { Application } from "@/lib/applications/schema";
import { sourceCredit } from "@/lib/job-feed/sources";
import {
  MATCH_LABELS,
  NOT_FIT_LABELS,
  NOT_FIT_REASONS,
  type JobMatch,
  type MatchedJob,
  type NotFitReason,
} from "@/lib/job-feed/types";
import { applicationAnchor } from "../applications/view";
import { placeLine, postedLabel } from "./view";

export type JobCardProps = {
  job: MatchedJob;
  now: number;
  applied: Application | null;
  // A tailored copy already made for this job: its button opens that copy instead of spending
  // another tailored version.
  tailoredTitle: string | null;
  saving: boolean;
  logging: boolean;
  tailoring: boolean;
  onTailor: (job: MatchedJob) => void;
  onOpenTailored: (job: MatchedJob) => void;
  onToggleSave: (job: MatchedJob) => void;
  onMarkApplied: (job: MatchedJob) => void;
  // "Open job" was followed; only noted, the link works on its own.
  onOpen?: (job: MatchedJob) => void;
  // Matches only: "Not a fit" and why, noted to make matching better.
  onNotFit?: (job: MatchedJob, reason: NotFitReason) => void;
};

// Labels are words, never numbers: the reason under them says what they rest on.
function MatchChip({ match }: { match: JobMatch }) {
  if (match.label === "strong") return <StatusPill status="pass">{MATCH_LABELS.strong}</StatusPill>;
  if (match.label === null) return <Badge>No overlap</Badge>;
  return <Badge>{MATCH_LABELS[match.label]}</Badge>;
}

// One opening: who, what, where and when, how it lines up with the resume and why, where it came
// from, and the four things to do next. A white card on the stone canvas, no border.
export function JobCard({
  job,
  now,
  applied,
  tailoredTitle,
  saving,
  logging,
  tailoring,
  onTailor,
  onOpenTailored,
  onToggleSave,
  onMarkApplied,
  onOpen,
  onNotFit,
}: JobCardProps) {
  const [notFit, setNotFit] = useState<NotFitReason | null>(null);
  const titleId = useId();
  const reasonId = useId();
  const posted = postedLabel(job.postedAt, now);
  const place = placeLine(job);

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
          <h3 id={titleId} className="text-base/6 font-semibold text-pretty text-ink">
            {job.title}
          </h3>
          <p className="text-sm/6 text-muted">
            {[place, posted].filter(Boolean).join(" · ")}
            {job.closed ? (
              <span className="font-medium text-ink"> · This job has closed</span>
            ) : null}
          </p>
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
            loading={saving}
            onClick={() => onToggleSave(job)}
          >
            {job.saved ? <BookmarkCheck aria-hidden /> : <Bookmark aria-hidden />}
            {job.saved ? "Saved" : "Save"}
          </Button>
          {applied ? (
            <Link
              href={`${ROUTES.dashboardApplications}#${applicationAnchor(applied.id)}`}
              className={buttonClasses({
                variant: "ghost",
                size: "sm",
                className: "text-muted hover:text-ink",
              })}
            >
              <CircleCheck aria-hidden className="text-pass" />
              {STATUS_NAMES[applied.status]}
              <span className="sr-only">: see this application</span>
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
          {onNotFit ? (
            notFit ? (
              <p className="px-2 text-sm text-muted" role="status">
                Noted: {NOT_FIT_LABELS[notFit].toLowerCase()}. Thanks.
              </p>
            ) : (
              <Menu
                label={`Why ${job.title} isn't a fit`}
                triggerClassName={buttonClasses({
                  variant: "ghost",
                  size: "sm",
                  className: "text-muted hover:text-ink",
                })}
                trigger={
                  <>
                    <ThumbsDown aria-hidden />
                    Not a fit
                  </>
                }
                items={NOT_FIT_REASONS.map((reason) => ({
                  label: NOT_FIT_LABELS[reason],
                  onSelect: () => {
                    setNotFit(reason);
                    onNotFit(job, reason);
                  },
                }))}
              />
            )
          ) : null}
          {/* A plain followed link: Remote OK's terms ask for one, and every source gets the visit. */}
          <a
            href={job.url}
            target="_blank"
            rel="noopener"
            onClick={() => onOpen?.(job)}
            className={buttonClasses({ variant: "ghost", size: "sm", className: "sm:ml-auto" })}
          >
            Open job
            <ArrowUpRight aria-hidden />
            <span className="sr-only">(opens {job.company}&apos;s posting in a new tab)</span>
          </a>
        </div>
      </article>
    </li>
  );
}
