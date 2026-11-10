"use client";

import {
  ArrowRight,
  BellRing,
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
import { formatDay } from "../view";
import { interviewHref } from "../../interview/view";
import {
  cardColumn,
  cardName,
  COLUMN_NAMES,
  daysInStage,
  initials,
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
  // A cover letter is kept for it (a saved one, or the one on its tailored copy).
  hasLetter: boolean;
  // This card is the one being dragged: it stays in place, faded, while a copy follows the pointer.
  lifted: boolean;
  // Held from the keyboard: its handle says so.
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

// One job on the board, compact: the role, the company and its initials, how long it has sat in
// its column (red once that's too long), and what's kept for it, as links. Hover or focus shows
// "Move on" in the top row; the menu (or a right-click) has every move. The initials are the handle.
export function BoardCardView({
  card,
  now,
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

  // After a keyboard move the card lands in another column as a new element: focus follows it.
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

  return (
    <li>
      <article
        ref={articleRef}
        data-card-key={card.key}
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        onPointerDown={(event) => onPointerDown(event, card)}
        onContextMenu={(event) => {
          // The same menu as the ⋯ key, where the pointer already is.
          event.preventDefault();
          articleRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup=menu]")?.click();
        }}
        className={cn(
          "group/card relative flex flex-col gap-2 rounded-xl bg-surface p-2.5 ring-1 ring-ink/5 transition-[opacity,box-shadow] hover:ring-ink/12 pointer-fine:cursor-grab",
          lifted && "opacity-40",
          holding && "ring-2 ring-ink",
          busy && "opacity-70",
        )}
      >
        {urgent ? (
          <span className="absolute -top-2.5 right-9 inline-flex h-5 items-center gap-1 rounded-full bg-warn-soft px-1.5 text-xs font-medium text-warn-ink ring-2 ring-surface-hover">
            <BellRing aria-hidden className="size-3 text-warn" />
            Follow up
          </span>
        ) : null}

        <div className="flex items-start gap-2.5">
          <button
            ref={handleRef}
            type="button"
            data-drag-handle=""
            aria-label={`Move ${name}`}
            aria-describedby={instructionsId}
            aria-pressed={holding}
            onKeyDown={(event) => onHandleKeyDown(event, card)}
            onBlur={() => onHandleBlur(card)}
            className="relative flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold text-muted -outline-offset-2 transition-colors aria-pressed:bg-ink aria-pressed:text-white pointer-coarse:size-10"
          >
            <span
              aria-hidden
              className="transition-opacity group-hover/card:opacity-0 group-has-[[data-drag-handle]:focus-visible]/card:opacity-0"
            >
              {initials(company || name)}
            </span>
            <GripVertical
              aria-hidden
              className="absolute size-4 opacity-0 transition-opacity group-hover/card:opacity-100 group-has-[[data-drag-handle]:focus-visible]/card:opacity-100"
            />
          </button>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="truncate text-sm/5 font-medium text-ink">
              {card.kind === "application" ? (
                <Link
                  href={applicationHref(card.application.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {role || company || name}
                </Link>
              ) : (
                role || company || name
              )}
            </h3>
            {role && company ? <p className="truncate text-xs/5 text-muted">{company}</p> : null}
          </div>
          {next ? (
            // In the top row, never over the marks below, so Prep and Letter stay clickable. Close and
            // every other move are in the menu; touch screens use the menu for all of them.
            <button
              type="button"
              aria-label={`Move on to ${COLUMN_NAMES[next]}`}
              title={`Move on to ${COLUMN_NAMES[next]}`}
              aria-describedby={titleId}
              onClick={() => onAction(card, { kind: "column", column: next })}
              className={buttonClasses({
                variant: "ghost",
                size: "icon-sm",
                className:
                  "-my-0.5 size-7 text-muted opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 hover:text-ink pointer-coarse:hidden",
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
              className: "-my-0.5 -mr-1 size-7 text-muted hover:text-ink",
            })}
            trigger={<Ellipsis aria-hidden />}
            items={menu}
          />
        </div>

        <Marks card={card} now={now} hasLetter={hasLetter} />
      </article>
    </li>
  );
}

// Marks that open something: a quiet hover, and a focus ring, like the other links on the card.
const MARK_LINK =
  "rounded-md -outline-offset-1 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-ink";

// Days in its column (red, with a clock, once that's too long), the interview day, how it ended
// (Closed holds both endings), a closed post, and the prep and letter kept for it. Nothing that
// only repeats the column. Words and icons, never color alone.
function Marks({ card, now, hasLetter }: { card: BoardCard; now: number; hasLetter: boolean }) {
  const marks: { key: string; node: ReactNode }[] = [];
  if (now > 0) {
    const days = daysInStage(card, now);
    const overdue = isOverdue(card, now);
    const label = card.kind === "to_apply" ? `${days}d waiting` : `${days}d in stage`;
    marks.push({
      key: "days",
      node: (
        <Badge variant={overdue ? "fail" : "neutral"} className="h-5 px-1.5">
          {overdue ? <Clock aria-hidden className="size-3 text-fail" /> : null}
          {label}
          {overdue ? <span className="sr-only">, overdue</span> : null}
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
    if (application.status === "interview" && application.interviewAt) {
      marks.push({
        key: "interview",
        node: (
          <Badge className="h-5 px-1.5">
            On {formatDay(application.interviewAt, now || application.interviewAt)}
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
  if (marks.length === 0) return null;
  return (
    <ul aria-label="About this job" className="flex flex-wrap gap-1">
      {marks.map((mark) => (
        <li key={mark.key}>{mark.node}</li>
      ))}
    </ul>
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

/** The copy that follows the pointer while a card is dragged. Drawn, not interactive. */
export function CardGhost({ card }: { card: BoardCard }) {
  const company = card.kind === "application" ? card.application.company : card.item.company;
  const role = card.kind === "application" ? card.application.role : card.item.role;
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-surface p-2.5 shadow-float ring-1 ring-ink/8 motion-safe:rotate-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-semibold text-muted">
        {initials(company || cardName(card))}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm/5 font-medium text-ink">
          {role || company || cardName(card)}
        </p>
        {role && company ? <p className="truncate text-xs/5 text-muted">{company}</p> : null}
      </div>
    </div>
  );
}
