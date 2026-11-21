"use client";

import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CircleX,
  Clock,
  Ellipsis,
  FileText,
  GripVertical,
  MessagesSquare,
  PanelsTopLeft,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { STATUS_NAMES, type ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { cn } from "@/lib/utils";
import { StatusIcon } from "../status-menu";
import { interviewLabel, upcomingInterview } from "../view";
import { interviewHref } from "../../interview/view";
import {
  cardColumn,
  cardName,
  COLUMN_NAMES,
  daysInStage,
  isOverdue,
  menuStatuses,
  needsAction,
  onward,
  type BoardCard,
  type BoardColumn,
} from "./board";

export type CardAction =
  | { kind: "column"; column: BoardColumn }
  | { kind: "status"; status: ApplicationStatus }
  | { kind: "close" }
  | { kind: "prepare" }
  | { kind: "delete" }
  | { kind: "open-copy"; copyId: string };

export type BoardCardProps = {
  card: BoardCard;
  now: number;
  pro: boolean | null;
  hasLetter: boolean;
  lifted: boolean;
  holding: boolean;
  busy: boolean;
  instructionsId: string;
  focusHandle: boolean;
  onFocused: () => void;
  onAction: (card: BoardCard, action: CardAction) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>, card: BoardCard) => void;
  onHandleKeyDown: (event: KeyboardEvent<HTMLElement>, card: BoardCard) => void;
  onHandleBlur: (card: BoardCard) => void;
};

export function BoardCardView({
  card,
  now,
  pro,
  hasLetter,
  lifted,
  holding,
  busy,
  instructionsId,
  focusHandle,
  onFocused,
  onAction,
  onPointerDown,
  onHandleKeyDown,
  onHandleBlur,
}: BoardCardProps) {
  const titleId = useId();
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const name = cardName(card);
  const company = card.kind === "application" ? card.application.company : card.item.company;
  const role = card.kind === "application" ? card.application.role : card.item.role;
  const next = onward(card);
  const column = cardColumn(card);
  const urgent = needsAction(card, now);

  useEffect(() => {
    if (!focusHandle) return;
    handleRef.current?.focus();
    onFocused();
  }, [focusHandle, onFocused]);

  const menu: MenuEntry[] = [
    ...(next
      ? [
          {
            label: `Move on to ${COLUMN_NAMES[next]}`,
            icon: ArrowRight,
            onSelect: () => onAction(card, { kind: "column", column: next }),
          },
        ]
      : []),
    ...links(card, (href) => router.push(href), onAction),
    ...(column === "interview" && card.kind === "application"
      ? [
          {
            label: card.application.hasPrep ? "Open interview prep" : "Prepare for this interview",
            icon: MessagesSquare,
            pro: pro === false && !card.application.hasPrep,
            onSelect: () => onAction(card, { kind: "prepare" }),
          },
        ]
      : []),
    "separator",
    ...menuStatuses(card).map((status) => ({
      label: `Move to ${STATUS_NAMES[status]}`,
      onSelect: () =>
        onAction(
          card,
          status === "interview"
            ? { kind: "column", column: "interview" }
            : { kind: "status", status },
        ),
    })),
    ...(card.kind === "application"
      ? [
          "separator" as const,
          {
            label: "Delete",
            icon: Trash2,
            tone: "danger" as const,
            onSelect: () => onAction(card, { kind: "delete" }),
          },
        ]
      : []),
  ];

  const title = company || role || name;
  const subtitle = company && role ? role : "";

  return (
    <li>
      <article
        ref={articleRef}
        data-card-key={card.key}
        aria-labelledby={subtitle ? `${titleId} ${titleId}-role` : titleId}
        aria-busy={busy || undefined}
        onPointerDown={(event) => onPointerDown(event, card)}
        onContextMenu={(event) => {
          event.preventDefault();
          articleRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup=menu]")?.click();
        }}
        className={cn(
          "group/card relative flex flex-col gap-2.5 rounded-xl bg-surface p-3 ring-1 ring-ink/5 transition-[opacity,box-shadow] duration-150 ease-out hover:ring-ink/12 pointer-fine:cursor-grab",
          lifted && "opacity-40",
          holding && "ring-2 ring-ink",
          busy && "opacity-70",
        )}
      >
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <h3
              id={titleId}
              title={title.length > 40 ? title : undefined}
              className="line-clamp-2 text-sm/5 font-medium break-words text-pretty text-ink"
            >
              {card.kind === "application" ? (
                <Link
                  href={applicationHref(card.application.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </h3>
            {subtitle ? (
              <p
                id={`${titleId}-role`}
                title={subtitle.length > 48 ? subtitle : undefined}
                className="mt-0.5 line-clamp-2 text-sm/5 break-words text-pretty text-muted"
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {/* With a mouse the tools float over the name only while hovered, so names keep the full width. */}
          <div className="-my-1 -mr-1.5 flex shrink-0 items-center gap-0.5 rounded-md bg-surface pointer-fine:absolute pointer-fine:top-3 pointer-fine:right-3 pointer-fine:m-0 pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:duration-150 pointer-fine:ease-out pointer-fine:group-focus-within/card:opacity-100 pointer-fine:group-hover/card:opacity-100 pointer-fine:has-aria-expanded:opacity-100 pointer-fine:before:absolute pointer-fine:before:inset-y-0 pointer-fine:before:-left-4 pointer-fine:before:w-4 pointer-fine:before:bg-linear-to-l pointer-fine:before:from-surface pointer-fine:before:to-transparent">
            <button
              ref={handleRef}
              type="button"
              data-drag-handle=""
              aria-label={`Move ${name}`}
              aria-describedby={instructionsId}
              aria-pressed={holding}
              title="Drag to move"
              onKeyDown={(event) => onHandleKeyDown(event, card)}
              onBlur={() => onHandleBlur(card)}
              className={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className:
                  "size-6 cursor-grab touch-none rounded-md text-muted hover:text-ink aria-pressed:bg-ink aria-pressed:text-white pointer-coarse:size-10 pointer-coarse:rounded-lg",
              })}
            >
              <GripVertical aria-hidden />
            </button>
            {next ? (
              <button
                type="button"
                aria-label={`Move on to ${COLUMN_NAMES[next]}`}
                title={`Move on to ${COLUMN_NAMES[next]}`}
                aria-describedby={titleId}
                onClick={() => onAction(card, { kind: "column", column: next })}
                className={buttonClasses({
                  variant: "ghost",
                  size: "icon-sm",
                  className: "size-6 rounded-md text-muted hover:text-ink pointer-coarse:hidden",
                })}
              >
                <ArrowRight aria-hidden />
              </button>
            ) : null}
            <Menu
              label={`Actions for ${name}`}
              align="end"
              triggerLabel={`More for ${name}`}
              triggerClassName={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className:
                  "size-6 rounded-md text-muted hover:text-ink pointer-coarse:size-10 pointer-coarse:rounded-lg",
              })}
              trigger={<Ellipsis aria-hidden />}
              items={menu}
            />
          </div>
        </div>

        <Marks card={card} now={now} hasLetter={hasLetter} urgent={urgent} />
      </article>
    </li>
  );
}

const MARK_LINK =
  "rounded-md -outline-offset-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ink";

function Marks({
  card,
  now,
  hasLetter,
  urgent,
}: {
  card: BoardCard;
  now: number;
  hasLetter: boolean;
  urgent: boolean;
}) {
  const marks: { key: string; node: ReactNode }[] = [];
  const interviewAt =
    card.kind === "application" && card.application.status === "interview"
      ? card.application.interviewAt
      : null;
  if (urgent) {
    marks.push({
      key: "follow-up",
      node: (
        <Badge variant="warn" className="h-5 px-1.5">
          <BellRing aria-hidden className="size-3 text-warn" />
          Follow up
        </Badge>
      ),
    });
  } else if (isOverdue(card, now)) {
    marks.push({
      key: "quiet",
      node: (
        <Badge variant="warn" className="h-5 px-1.5">
          <Clock aria-hidden className="size-3 text-warn" />
          No reply in {daysInStage(card, now)} days
        </Badge>
      ),
    });
  }
  if (card.kind === "application") {
    const { application } = card;
    if (application.status === "rejected" || application.status === "no_reply") {
      marks.push({
        key: "ended",
        node: (
          <Badge className="h-5 px-1.5">
            <StatusIcon status={application.status} className="size-3" />
            {STATUS_NAMES[application.status]}
          </Badge>
        ),
      });
    }
    if (application.hasPrep) {
      marks.push({
        key: "prep",
        node: (
          <Link
            href={interviewHref(application.id)}
            className={MARK_LINK}
            aria-label="Open interview prep"
          >
            <Badge className="h-5 px-1.5">
              <MessagesSquare aria-hidden className="size-3" />
              Prep
            </Badge>
          </Link>
        ),
      });
    }
  } else if (card.item.closed) {
    marks.push({
      key: "closed",
      node: (
        <Badge variant="warn" className="h-5 px-1.5">
          Post closed
        </Badge>
      ),
    });
  }
  if (hasLetter) {
    const letter = (
      <Badge className="h-5 px-1.5">
        <FileText aria-hidden className="size-3" />
        Letter
      </Badge>
    );
    marks.push({
      key: "letter",
      node:
        card.kind === "application" ? (
          <Link
            href={`${applicationHref(card.application.id)}#letters`}
            className={MARK_LINK}
            aria-label="Open the cover letter"
          >
            {letter}
          </Link>
        ) : (
          letter
        ),
    });
  }
  if (marks.length === 0 && interviewAt === null) return null;
  const soon = card.kind === "application" && upcomingInterview(card.application, now);
  return (
    <div className="flex flex-col gap-1.5">
      {interviewAt !== null ? (
        <p
          className={cn(
            "flex items-start gap-1.5 text-xs/5 tabular-nums",
            soon ? "font-medium text-ink" : "text-muted",
          )}
        >
          <CalendarDays aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted" />
          {interviewLabel(interviewAt, now)}
        </p>
      ) : null}
      {marks.length > 0 ? (
        <ul aria-label="About this job" className="flex flex-wrap gap-1">
          {marks.map((mark) => (
            <li key={mark.key}>{mark.node}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function links(
  card: BoardCard,
  go: (href: string) => void,
  onAction: (card: BoardCard, action: CardAction) => void,
): MenuEntry[] {
  const out: MenuEntry[] = [];
  const copy = card.kind === "application" ? card.copy : card.item.copy;
  if (card.kind === "application") {
    out.push({
      label: "View application",
      icon: PanelsTopLeft,
      onSelect: () => go(applicationHref(card.application.id)),
    });
  }
  if (copy) {
    out.push({
      label: "Open tailored copy",
      icon: FileText,
      onSelect: () => onAction(card, { kind: "open-copy", copyId: copy.id }),
    });
  }
  const url = card.kind === "application" ? card.application.jobUrl : card.item.jobUrl;
  if (url) {
    out.push({
      label: "Open job post",
      icon: SquareArrowOutUpRight,
      onSelect: () => window.open(url, "_blank", "noopener"),
    });
  }
  if (cardColumn(card) !== "closed") {
    out.push({
      label: "Close…",
      description: "Rejected or no reply",
      icon: CircleX,
      tone: "danger",
      onSelect: () => onAction(card, { kind: "close" }),
    });
  }
  return out;
}

export function CardGhost({ card }: { card: BoardCard }) {
  const company = card.kind === "application" ? card.application.company : card.item.company;
  const role = card.kind === "application" ? card.application.role : card.item.role;
  return (
    <div className="flex flex-col rounded-xl bg-surface p-3 shadow-float ring-1 ring-ink/8 motion-safe:rotate-2">
      <p className="line-clamp-2 text-sm/5 font-medium text-ink">
        {company || role || cardName(card)}
      </p>
      {role && company ? <p className="mt-0.5 line-clamp-2 text-sm/5 text-muted">{role}</p> : null}
    </div>
  );
}
