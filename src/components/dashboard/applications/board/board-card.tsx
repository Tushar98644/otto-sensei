"use client";

import {
  ArrowRight,
  CircleX,
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
import { useEffect, useId, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { buttonClasses } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { STATUS_NAMES, type ApplicationStatus } from "@/lib/applications/status";
import { applicationHref } from "@/lib/applications/thread";
import { cn } from "@/lib/utils";
import {
  cardColumn,
  cardName,
  COLUMN_NAMES,
  menuStatuses,
  onward,
  type BoardCard,
  type BoardColumn,
} from "./board";
import { InterviewTicket } from "./card/interview-ticket";
import { CardMarks } from "./card/marks";

export type CardAction =
  | { kind: "column"; column: BoardColumn }
  | { kind: "status"; status: ApplicationStatus }
  | { kind: "close" }
  | { kind: "prepare" }
  | { kind: "delete" }
  | { kind: "remove-post"; postId: string }
  | { kind: "open-copy"; copyId: string };

export type BoardCardProps = {
  card: BoardCard;
  now: number;
  hasLetter: boolean;
  fromEmail?: boolean;
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
  hasLetter,
  fromEmail = false,
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
  const next = onward(card);
  const column = cardColumn(card);

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
    ...(card.kind === "to_apply" && card.item.postId
      ? [
          "separator" as const,
          {
            label: "Remove from To apply",
            icon: Trash2,
            tone: "danger" as const,
            onSelect: () => onAction(card, { kind: "remove-post", postId: card.item.postId ?? "" }),
          },
        ]
      : []),
  ];

  const text = cardText(card);
  const roleId = `${titleId}-role`;
  const interviewAt =
    card.kind === "application" && card.application.status === "interview"
      ? card.application.interviewAt
      : null;

  return (
    <li className={cn("py-0.5", ENTER)}>
      <article
        ref={articleRef}
        data-card-key={card.key}
        aria-labelledby={text.secondary ? `${titleId} ${roleId}` : titleId}
        aria-busy={busy || undefined}
        onPointerDown={(event) => onPointerDown(event, card)}
        onContextMenu={(event) => {
          event.preventDefault();
          articleRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup=menu]")?.click();
        }}
        className={cn(
          "group/card relative flex flex-col gap-3 rounded-xl bg-surface p-3 ring-1 ring-ink/6 transition-[translate,box-shadow,opacity] duration-200 ease-out pointer-fine:cursor-grab",
          "shadow-[0_1px_2px_rgb(18_36_29/0.04),0_3px_8px_-4px_rgb(18_36_29/0.1)]",
          "hover:shadow-[0_2px_4px_rgb(18_36_29/0.04),0_14px_24px_-12px_rgb(18_36_29/0.28)] hover:ring-ink/8 motion-safe:hover:-translate-y-0.5",
          holding &&
            "shadow-[0_2px_4px_rgb(18_36_29/0.04),0_14px_24px_-12px_rgb(18_36_29/0.28)] ring-2 ring-ink hover:ring-ink motion-safe:-translate-y-0.5",
          lifted &&
            "bg-transparent shadow-none ring-0 outline-1 -outline-offset-1 outline-ink/20 outline-dashed hover:shadow-none motion-safe:hover:translate-y-0 [&>*]:opacity-0",
          busy && "opacity-70",
        )}
      >
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
            className="group/handle relative -my-1 -ml-3 shrink-0 cursor-grab touch-none py-1 pl-3 outline-hidden"
          >
            <GripVertical
              aria-hidden
              className="absolute top-1/2 left-px size-3 -translate-y-1/2 text-subtle opacity-0 transition-opacity group-hover/card:opacity-70 group-focus-visible/handle:opacity-100 group-aria-pressed/handle:opacity-100 pointer-coarse:opacity-50"
            />
            <CompanyMark
              name={text.company || name}
              size="md"
              className="outline-2 outline-offset-2 outline-transparent transition-[scale,outline-color] group-focus-visible/handle:outline-ink group-aria-pressed/handle:outline-transparent motion-safe:group-active/handle:scale-95"
            />
          </button>
          <div className="min-w-0 flex-1 pt-px pointer-coarse:pr-9">
            <h3
              id={titleId}
              className="line-clamp-2 pr-7 text-sm/5 font-semibold text-pretty [overflow-wrap:anywhere] text-ink pointer-coarse:pr-0"
            >
              {card.kind === "application" ? (
                <Link
                  href={applicationHref(card.application.id)}
                  className="decoration-ink/30 underline-offset-4 hover:underline"
                >
                  {text.primary}
                </Link>
              ) : (
                text.primary
              )}
            </h3>
            {text.secondary ? (
              <p
                id={roleId}
                className="mt-0.5 line-clamp-3 text-[13px]/[18px] text-pretty [overflow-wrap:anywhere] text-muted"
              >
                {text.secondary}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "absolute top-2 right-2 flex items-center gap-0.5 rounded-lg transition-opacity duration-150",
            "pointer-fine:bg-surface pointer-fine:p-0.5 pointer-fine:opacity-0 pointer-fine:shadow-control pointer-fine:ring-1 pointer-fine:ring-ink/6",
            "group-focus-within/card:opacity-100 group-hover/card:opacity-100 has-aria-expanded:opacity-100",
            lifted && "invisible",
          )}
        >
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
                className:
                  "group/next size-6 rounded-md text-muted hover:text-ink pointer-coarse:hidden [&_svg]:size-3.5",
              })}
            >
              <ArrowRight
                aria-hidden
                className="transition-transform motion-safe:group-hover/next:translate-x-0.5"
              />
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
                "size-6 rounded-md text-muted hover:text-ink aria-expanded:bg-surface-muted aria-expanded:text-ink pointer-coarse:size-9",
            })}
            trigger={<Ellipsis aria-hidden />}
            items={menu}
          />
        </div>

        {interviewAt !== null ? <InterviewTicket at={interviewAt} now={now} /> : null}
        <CardMarks card={card} now={now} hasLetter={hasLetter} fromEmail={fromEmail} />
      </article>
    </li>
  );
}

// One entrance per card on first paint, staggered down each column; nth-child keeps the selectors exclusive.
const ENTER =
  "motion-safe:nth-1:animate-[fade-in_220ms_ease-out_backwards] motion-safe:nth-2:animate-[fade-in_220ms_ease-out_40ms_backwards] motion-safe:nth-3:animate-[fade-in_220ms_ease-out_80ms_backwards] motion-safe:nth-4:animate-[fade-in_220ms_ease-out_120ms_backwards] motion-safe:nth-5:animate-[fade-in_220ms_ease-out_160ms_backwards] motion-safe:nth-[n+6]:animate-[fade-in_220ms_ease-out_200ms_backwards]";

function cardText(card: BoardCard) {
  const company = (
    card.kind === "application" ? card.application.company : card.item.company
  ).trim();
  const role = (card.kind === "application" ? card.application.role : card.item.role).trim();
  return {
    company,
    primary: company || role || cardName(card),
    secondary: company && role ? role : "",
  };
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
  const text = cardText(card);
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-surface p-3 shadow-float ring-1 ring-ink/8 motion-safe:scale-[1.02] motion-safe:rotate-[1.5deg]">
      <CompanyMark name={text.company || cardName(card)} size="md" />
      <div className="min-w-0 pt-px">
        <p className="line-clamp-2 text-sm/5 font-semibold text-pretty [overflow-wrap:anywhere] text-ink">
          {text.primary}
        </p>
        {text.secondary ? (
          <p className="mt-0.5 line-clamp-2 text-[13px]/[18px] text-pretty [overflow-wrap:anywhere] text-muted">
            {text.secondary}
          </p>
        ) : null}
      </div>
    </div>
  );
}
