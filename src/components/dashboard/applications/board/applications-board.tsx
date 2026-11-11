"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { roomForApplication } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import type { Application } from "@/lib/applications/schema";
import { STATUS_NAMES } from "@/lib/applications/status";
import { copyLetter, writingsByApplication } from "@/lib/applications/thread";
import type { SavedJob } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import type { Writing } from "@/lib/writings/schema";
import { defaultResumeId } from "../../jobs/view";
import { useStudioActions } from "../../use-studio-actions";
import {
  addApplication,
  changeApplication,
  commitDelete,
  hideApplication,
  restoreApplication,
} from "../use-applications";
import { formatDay, prepHref } from "../view";
import {
  BOARD_COLUMNS,
  boardColumns,
  canDrop,
  cardColumn,
  columnOf,
  COLUMN_NAMES,
  COLUMN_PAGE,
  createBody,
  planDrop,
  planStatus,
  toApplyItems,
  type BoardCard,
  type BoardColumn,
  type Move,
} from "./board";
import { BoardCardView, CardGhost, type CardAction } from "./board-card";
import { MovePopover, type MoveAnswer, type MoveAsk } from "./move-popover";
import { useBoardDrag, type DragMode, type DropPoint } from "./use-board-drag";

const count = new Intl.NumberFormat("en-US");

// Written out in full so Tailwind sees every class.
const STAGE: Record<BoardColumn, { bar: string; tint: string; over: string }> = {
  to_apply: { bar: "bg-border-strong", tint: "from-border-strong/10", over: "border-border-strong" },
  applied: { bar: "bg-primary", tint: "from-primary/8", over: "border-primary" },
  interview: { bar: "bg-otter", tint: "from-otter/10", over: "border-otter" },
  offer: { bar: "bg-pass", tint: "from-pass/10", over: "border-pass" },
  closed: { bar: "bg-fail", tint: "from-fail/8", over: "border-fail" },
};

type MoveMode = DragMode | "menu";

// The time a move is logged at, read when the move happens, never while drawing.
function sentAt(): number {
  return Date.now();
}

export type ApplicationsBoardProps = {
  applications: readonly Application[];
  resumes: readonly Resume[];
  savedJobs: readonly SavedJob[];
  writings: readonly Writing[];
  now: number;
  // null while the plan loads; false on Free, where prep opens the trial prompt.
  pro: boolean | null;
  onNeedsDetails: (resumeId: string | null) => void;
};

export function ApplicationsBoard({
  applications,
  resumes,
  savedJobs,
  writings,
  now,
  pro,
  onNeedsDetails,
}: ApplicationsBoardProps) {
  const router = useRouter();
  const actions = useStudioActions();
  const instructionsId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<BoardColumn>("applied");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [ask, setAsk] = useState<MoveAsk | null>(null);
  const [shown, setShown] = useState<Partial<Record<BoardColumn, number>>>({});

  const toApply = useMemo(
    () => toApplyItems(savedJobs, resumes, applications),
    [savedJobs, resumes, applications],
  );
  const columns = useMemo(
    () => boardColumns(applications, toApply, resumes, now),
    [applications, toApply, resumes, now],
  );
  const letters = useMemo(
    () => writingsByApplication(applications, writings),
    [applications, writings],
  );
  const fallback = useMemo(() => {
    const id = defaultResumeId(resumes);
    return resumes.find((resume) => resume.id === id) ?? null;
  }, [resumes]);

  function hasLetter(card: BoardCard): boolean {
    const copy = card.kind === "application" ? card.copy : card.item.copy;
    if (copyLetter(copy)) return true;
    if (card.kind !== "application") return false;
    return (letters.get(card.application.id) ?? []).some((writing) => writing.kind === "letter");
  }

  function prepare(application: Application) {
    if (pro === false) openFeaturePrompt("letter");
    else router.push(prepHref(application.id));
  }

  // Beside the drop, or under the card itself for moves that didn't come from one.
  function anchorOf(card: BoardCard, point: DropPoint): { x: number; y: number } {
    if (point) return point;
    const box = document
      .querySelector(`[data-card-key="${CSS.escape(card.key)}"]`)
      ?.getBoundingClientRect();
    return box
      ? { x: box.left + box.width / 2, y: box.bottom }
      : { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  }

  function remove(application: Application) {
    hideApplication(application);
    drag.announce(`${application.company} deleted.`);
    undoToast({
      title: "Application deleted",
      description: application.company,
      onUndo: () => restoreApplication(application),
      onCommit: (options) => {
        commitDelete(application, options).catch((error: unknown) =>
          toast({ title: "Couldn't delete it", description: errorMessage(error), variant: "error" }),
        );
      },
    });
  }

  async function create(
    card: Extract<BoardCard, { kind: "to_apply" }>,
    answer: MoveAnswer,
    mode: MoveMode,
  ) {
    if (!(await roomForApplication(applications.length))) return;
    const body = createBody(card.item, answer.status, sentAt(), fallback, answer.interviewAt);
    if (!body) {
      onNeedsDetails(card.item.copy?.id ?? null);
      return;
    }
    setBusyKey(card.key);
    try {
      const application = await addApplication(body);
      drag.announce(`${application.company} moved to ${STATUS_NAMES[answer.status]}.`);
      if (mode === "keyboard") setFocusKey(`application:${application.id}`);
      if (answer.prepare) {
        prepare(application);
        return;
      }
      undoToast({
        title:
          answer.status === "applied"
            ? `Marked as applied at ${application.company}`
            : `${application.company} moved to ${STATUS_NAMES[answer.status]}`,
        description:
          application.followUpAt === null
            ? undefined
            : `I'll remind you to follow up on ${formatDay(application.followUpAt, application.followUpAt)}.`,
        onUndo: () => {
          hideApplication(application);
          commitDelete(application, { keepalive: false }).catch((error: unknown) =>
            toast({ title: "Couldn't undo that", description: errorMessage(error), variant: "error" }),
          );
        },
      });
    } catch (error) {
      toast({ title: "Couldn't log it", description: errorMessage(error), variant: "error" });
    } finally {
      setBusyKey(null);
    }
  }

  function changeStatus(application: Application, answer: MoveAnswer, mode: MoveMode) {
    const name = application.company || application.role || "It";
    drag.announce(`${name} moved to ${STATUS_NAMES[answer.status]}.`);
    if (mode === "keyboard") setFocusKey(`application:${application.id}`);
    changeApplication(application, {
      status: answer.status,
      ...(answer.status === "interview" ? { interviewAt: answer.interviewAt } : {}),
    }).then(
      () => {
        if (answer.prepare) prepare(application);
      },
      (error: unknown) => {
        drag.announce(`${name} is back in ${STATUS_NAMES[application.status]}.`);
        toast({ title: "Couldn't move it", description: errorMessage(error), variant: "error" });
      },
    );
  }

  function run(move: Move, mode: MoveMode, point: DropPoint, answer?: MoveAnswer) {
    if (move.kind === "none") return;
    if (move.kind === "ask") {
      setAsk({ card: move.card, column: move.column, anchor: anchorOf(move.card, point) });
      return;
    }
    if (move.kind === "delete") {
      remove(move.application);
      return;
    }
    // A phone follows the card to its new column.
    setTab(columnOf(move.status));
    const reply = answer ?? { status: move.status, interviewAt: null, prepare: false };
    if (move.kind === "status") changeStatus(move.application, reply, mode);
    else void create({ kind: "to_apply", key: move.item.key, item: move.item }, reply, mode);
  }

  function onAction(card: BoardCard, action: CardAction) {
    switch (action.kind) {
      case "column":
        run(planDrop(card, action.column), "menu", null);
        return;
      case "status":
        run(planStatus(card, action.status), "menu", null);
        return;
      case "close":
        setAsk({ card, column: "closed", anchor: anchorOf(card, null) });
        return;
      case "prepare":
        if (card.kind === "application") prepare(card.application);
        return;
      case "delete":
        if (card.kind === "application") remove(card.application);
        return;
      case "open-copy":
        actions.open(action.copyId, "download");
        return;
    }
  }

  const drag = useBoardDrag({
    onDrop: (card, target, mode, point) => run(planDrop(card, target), mode, point),
    onKeyboardTarget: (target) => {
      if (target !== "delete") setTab(target);
    },
    scrollerRef,
  });
  const { held, announce, ghostRef } = drag;
  const clearFocus = useCallback(() => setFocusKey(null), []);
  function cancelAsk() {
    setAsk(null);
    announce("Left where it was.");
  }

  function answerAsk(answer: MoveAnswer) {
    if (!ask) return;
    const { card } = ask;
    setAsk(null);
    run(planStatus(card, answer.status), "menu", null, answer);
  }

  function column(name: BoardColumn) {
    const cards = columns[name];
    const limit = shown[name] ?? COLUMN_PAGE;
    const stage = STAGE[name];
    const over = held !== null && held.target === name && canDrop(held.card, name);
    const blocked = held !== null && name !== cardColumn(held.card) && !canDrop(held.card, name);
    return (
      <section
        key={name}
        aria-labelledby={`${instructionsId}-${name}`}
        data-drop-target={name}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-hover transition-[opacity,filter,border-color,box-shadow] md:h-[min(42rem,calc(100dvh-13rem))] md:w-76 md:shrink-0",
          over && [stage.over, "shadow-card"],
          blocked && "opacity-40 grayscale",
          name !== tab && "max-md:hidden",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b to-transparent",
            stage.tint,
          )}
        />
        <header className="relative flex h-10 shrink-0 items-center gap-2 px-3 pt-1">
          <span aria-hidden className={cn("h-4 w-1 rounded-full", stage.bar)} />
          <h3 id={`${instructionsId}-${name}`} className="flex-1 text-sm/5 font-semibold text-ink">
            {COLUMN_NAMES[name]}
          </h3>
          <span className="text-xs font-medium text-muted tabular-nums">
            {count.format(cards.length)}
          </span>
        </header>
        {/* pt-2 leaves room for a card's corner mark inside the scroller's edge. */}
        <div className="relative flex-1 px-2 pt-2 pb-2 md:overflow-y-auto">
          {cards.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {cards.slice(0, limit).map((card) => (
                <BoardCardView
                  key={card.key}
                  card={card}
                  now={now}
                  hasLetter={hasLetter(card)}
                  lifted={held?.mode === "pointer" && held.card.key === card.key}
                  holding={held?.mode === "keyboard" && held.card.key === card.key}
                  busy={busyKey === card.key}
                  instructionsId={instructionsId}
                  focusHandle={focusKey === card.key}
                  onFocused={clearFocus}
                  onAction={onAction}
                  onPointerDown={drag.onCardPointerDown}
                  onHandleKeyDown={drag.onHandleKeyDown}
                  onHandleBlur={drag.onHandleBlur}
                />
              ))}
            </ul>
          ) : (
            <p className="px-1 py-3 text-center text-sm text-subtle">
              <span aria-hidden>—</span>
              <span className="sr-only">Nothing in {COLUMN_NAMES[name]}</span>
            </p>
          )}
          {cards.length > limit ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full text-muted hover:text-ink"
              onClick={() => setShown({ ...shown, [name]: limit + COLUMN_PAGE })}
            >
              Load more ({count.format(cards.length - limit)})
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p id={instructionsId} className="sr-only">
        Press Space on a job&apos;s initials to pick it up. Use the arrow keys to choose a column,
        then Space to drop it there, or Escape to put it back. Each job&apos;s menu can move it too.
      </p>
      <p aria-live="polite" className="sr-only">
        {drag.announcement}
      </p>

      {/* Phones: one column at a time; while a card is held, its stages are drop places. */}
      <div className="-mx-4 overflow-x-auto px-4 md:hidden">
        <div
          role="group"
          aria-label="Stage"
          className="flex w-max gap-1 rounded-xl bg-surface-strong p-1"
        >
          {BOARD_COLUMNS.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={held ? held.target === name : tab === name}
              data-drop-target={held ? name : undefined}
              onClick={() => setTab(name)}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control"
            >
              <span aria-hidden className={cn("h-3 w-1 rounded-full", STAGE[name].bar)} />
              {COLUMN_NAMES[name]}
              <span className="text-xs text-muted tabular-nums">
                {count.format(columns[name].length)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Runs to the window's edge from md, so later columns read as more to scroll to. 1.5rem,
          not 2rem: 100vw counts a classic scrollbar, and half of one must not widen the page. */}
      <div
        ref={scrollerRef}
        className="md:-mr-8 md:overflow-x-auto md:pr-8 md:pb-3 lg:-mr-[calc(max(0px,(100vw-15rem-64rem)/2)+1.5rem)] lg:pr-[calc(max(0px,(100vw-15rem-64rem)/2)+1.5rem)]"
      >
        <div className="flex flex-col md:w-max md:flex-row md:gap-3">
          {BOARD_COLUMNS.map((name) => column(name))}
        </div>
      </div>

      {held?.mode === "pointer" && held.card.kind === "application" ? (
        <div
          data-drop-target="delete"
          className={cn(
            "fixed bottom-6 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-xl border-2 border-dashed px-5 text-sm font-medium shadow-float transition-colors",
            held.target === "delete"
              ? "border-fail bg-fail-soft text-fail-ink"
              : "border-border-strong bg-surface text-muted",
          )}
        >
          <Trash2 aria-hidden className="size-4 text-fail" />
          Drop here to delete
        </div>
      ) : null}

      {drag.ghost && held ? (
        <div
          ref={ghostRef}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-50"
          style={{ width: drag.ghost.width }}
        >
          <CardGhost card={held.card} />
        </div>
      ) : null}

      {ask ? <MovePopover ask={ask} pro={pro} onAnswer={answerAsk} onCancel={cancelAsk} /> : null}
    </div>
  );
}
