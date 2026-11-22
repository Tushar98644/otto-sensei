import { BellRing, CircleSlash, Clock, FileText, Mail, MessagesSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { StatusIcon } from "@/components/dashboard/applications/status-menu";
import { interviewHref } from "@/components/dashboard/interview/view";
import { STATUS_NAMES } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { cn } from "@/lib/utils";
import { needsAction, type BoardCard } from "../board";
import { stageTime } from "./when";

const CHIP =
  "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0";

const TONES = {
  warn: "bg-warn-soft text-warn-ink inset-ring inset-ring-warn/15",
  fail: "bg-fail-soft text-fail-ink inset-ring inset-ring-fail/15",
  quiet: "bg-surface-muted text-muted",
  attachment: "bg-surface text-muted inset-ring inset-ring-ink/10",
  link: "transition-colors hover:bg-surface-hover hover:text-ink -outline-offset-1 focus-visible:outline-2 focus-visible:outline-ink",
};

export function CardMarks({
  card,
  now,
  hasLetter,
  fromEmail = false,
}: {
  card: BoardCard;
  now: number;
  hasLetter: boolean;
  fromEmail?: boolean;
}) {
  const marks: { key: string; node: ReactNode }[] = [];
  const time = stageTime(card, now);

  if (needsAction(card, now)) {
    marks.push({
      key: "follow-up",
      node: (
        <span className={cn(CHIP, TONES.warn)}>
          <BellRing aria-hidden className="text-warn" />
          Time to follow up
        </span>
      ),
    });
  }
  if (time?.late) {
    marks.push({
      key: "late",
      node: (
        <span className={cn(CHIP, TONES.fail)}>
          <Clock aria-hidden className="text-fail" />
          {time.text}
          <span className="sr-only">, no reply yet</span>
        </span>
      ),
    });
  }
  if (card.kind === "application") {
    const { application } = card;
    if (application.status === "rejected" || application.status === "no_reply") {
      marks.push({
        key: "ended",
        node: (
          <span className={cn(CHIP, TONES.quiet)}>
            <StatusIcon status={application.status} />
            {STATUS_NAMES[application.status]}
          </span>
        ),
      });
    }
    if (application.hasPrep) {
      marks.push({
        key: "prep",
        node: (
          <Link
            href={interviewHref(application.id)}
            aria-label="Open interview prep"
            className={cn(CHIP, TONES.attachment, TONES.link)}
          >
            <MessagesSquare aria-hidden />
            Prep
          </Link>
        ),
      });
    }
  } else if (card.item.closed) {
    marks.push({
      key: "closed",
      node: (
        <span className={cn(CHIP, TONES.warn)}>
          <CircleSlash aria-hidden className="text-warn" />
          Post closed
        </span>
      ),
    });
  }
  if (hasLetter) {
    marks.push({
      key: "letter",
      node:
        card.kind === "application" ? (
          <Link
            href={`${applicationHref(card.application.id)}#letters`}
            aria-label="Open the cover letter"
            className={cn(CHIP, TONES.attachment, TONES.link)}
          >
            <FileText aria-hidden />
            Letter
          </Link>
        ) : (
          <span className={cn(CHIP, TONES.attachment)}>
            <FileText aria-hidden />
            Letter
          </span>
        ),
    });
  }
  if (fromEmail) {
    marks.push({
      key: "email",
      node: (
        <a
          href="#email-updates"
          title="Changed by a job email"
          className={cn(CHIP, TONES.quiet, TONES.link)}
        >
          <Mail aria-hidden />
          From email
        </a>
      ),
    });
  }
  if (time && !time.late) {
    marks.push({
      key: "time",
      node: (
        <span className="inline-flex h-6 items-center gap-1 text-xs text-subtle">
          <Clock aria-hidden className="size-3.5 shrink-0" />
          {time.text}
        </span>
      ),
    });
  }

  if (marks.length === 0) return null;
  return (
    <ul aria-label="About this job" className="flex flex-wrap items-center gap-1.5">
      {marks.map((mark) => (
        <li key={mark.key}>{mark.node}</li>
      ))}
    </ul>
  );
}
