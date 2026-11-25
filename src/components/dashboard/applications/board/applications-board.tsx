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
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Application } from "@/lib/applications/schema";
import { copyLetter, writingsByApplication } from "@/lib/applications/thread";
import { savedPostFromHash } from "@/lib/extension/links";
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
import { formatDay } from "../../i18n";
import { prepHref } from "../view";
import {
  BOARD_COLUMNS,
  boardColumns,
  canDrop,
  cardColumn,
  columnOf,
  COLUMN_PAGE,
  createBody,
  interviewClock,
  planDrop,
  planStatus,
  type BoardCard,
  type BoardColumn,
  type Move,
  type ToApplyItem,
} from "./board";
import { BoardCardView, CardGhost, type CardAction } from "./board-card";
import { MovePopover, type MoveAnswer, type MoveAsk } from "./move-popover";
import { hideSavedPost, removeSavedPost, restoreSavedPosts } from "./use-board-extras";
import { useBoardDrag, type DragMode, type DropPoint } from "./use-board-drag";

// Written out in full so Tailwind sees every class.
const STAGE: Record<BoardColumn, { bar: string; tint: string; over: string }> = {
  to_apply: {
    bar: "bg-border-strong",
    tint: "from-border-strong/10",
    over: "border-border-strong",
  },
  applied: { bar: "bg-primary", tint: "from-primary/8", over: "border-primary" },
  interview: { bar: "bg-otter", tint: "from-otter/10", over: "border-otter" },
  offer: { bar: "bg-pass", tint: "from-pass/10", over: "border-pass" },
  closed: { bar: "bg-fail", tint: "from-fail/8", over: "border-fail" },
};

type MoveMode = DragMode | "menu";

function sentAt(): number {
  return Date.now();
}

export type ApplicationsBoardProps = {
  applications: readonly Application[];
  resumes: readonly Resume[];
  toApply: readonly ToApplyItem[];
  writings: readonly Writing[];
  emailed?: ReadonlySet<string>;
  now: number;
  pro: boolean | null;
  onNeedsDetails: (resumeId: string | null) => void;
};

const NONE: ReadonlySet<string> = new Set();

export function ApplicationsBoard({
  applications,
  resumes,
  toApply,
  writings,
  emailed = NONE,
  now,
  pro,
  onNeedsDetails,
}: ApplicationsBoardProps) {
  const t = useMessages("applications");
  const { board } = t;
  const format = useFormat();
  const router = useRouter();
  const actions = useStudioActions();
  const instructionsId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [linkedPost] = useState(() =>
    typeof window === "undefined" ? null : savedPostFromHash(window.location.hash),
  );
  const [tab, setTab] = useState<BoardColumn>(linkedPost ? "to_apply" : "applied");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  // A link from Otto for Chrome (#saved-<id>) lands on that job's card.
  const [focusKey, setFocusKey] = useState<string | null>(linkedPost ? `post:${linkedPost}` : null);
  const [ask, setAsk] = useState<MoveAsk | null>(null);
  const [shown, setShown] = useState<Partial<Record<BoardColumn, number>>>({});

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
    drag.announce(fmt(board.deletedSr, { name: application.company }));
    undoToast({
      title: board.deleted,
      description: application.company,
      onUndo: () => restoreApplication(application),
      onCommit: (options) => {
        commitDelete(application, options).catch((error: unknown) =>
          toast({ title: board.cantDelete, description: errorMessage(error), variant: "error" }),
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
    const body = createBody(
      card.item,
      answer.status,
      sentAt(),
      fallback,
      answer.interviewAt,
      answer.interviewTime,
    );
    if (!body) {
      onNeedsDetails(card.item.copy?.id ?? null);
      return;
    }
    setBusyKey(card.key);
    try {
      const application = await addApplication(body);
      drag.announce(
        fmt(board.movedSr, { name: application.company, status: t.statuses[answer.status] }),
      );
      if (mode === "keyboard") setFocusKey(`application:${application.id}`);
      if (answer.prepare) {
        prepare(application);
        return;
      }
      undoToast({
        title:
          answer.status === "applied"
            ? fmt(board.markedAt, { company: application.company })
            : fmt(board.moved, { name: application.company, status: t.statuses[answer.status] }),
        description:
          application.followUpAt === null
            ? undefined
            : fmt(board.remind, {
                day: formatDay(format, application.followUpAt, application.followUpAt),
              }),
        onUndo: () => {
          hideApplication(application);
          commitDelete(application, { keepalive: false }).catch((error: unknown) =>
            toast({ title: board.cantUndo, description: errorMessage(error), variant: "error" }),
          );
        },
      });
    } catch (error) {
      toast({ title: board.cantLog, description: errorMessage(error), variant: "error" });
    } finally {
      setBusyKey(null);
    }
  }

  function changeStatus(application: Application, answer: MoveAnswer, mode: MoveMode) {
    const name = application.company || application.role || board.it;
    drag.announce(fmt(board.movedSr, { name, status: t.statuses[answer.status] }));
    if (mode === "keyboard") setFocusKey(`application:${application.id}`);
    changeApplication(application, {
      status: answer.status,
      ...(answer.status === "interview"
        ? { interviewAt: answer.interviewAt, ...interviewClock(answer.interviewTime) }
        : {}),
    }).then(
      () => {
        if (answer.prepare) prepare(application);
      },
      (error: unknown) => {
        drag.announce(fmt(board.backIn, { name, status: t.statuses[application.status] }));
        toast({ title: board.cantMove, description: errorMessage(error), variant: "error" });
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
    setTab(columnOf(move.status));
    const reply = answer ?? {
      status: move.status,
      interviewAt: null,
      interviewTime: null,
      prepare: false,
    };
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
      case "remove-post":
        removePost(card, action.postId);
        return;
      case "open-copy":
        actions.open(action.copyId, "download");
        return;
    }
  }

  function removePost(card: BoardCard, postId: string) {
    const name = card.kind === "to_apply" ? card.item.company || card.item.role : "";
    hideSavedPost(postId);
    drag.announce(fmt(board.removedSr, { name: name || board.theJob }));
    undoToast({
      title: board.removed,
      description: name || undefined,
      onUndo: restoreSavedPosts,
      onCommit: (options) => {
        removeSavedPost(postId, options).catch((error: unknown) =>
          toast({
            title: board.cantRemove,
            description: errorMessage(error),
            variant: "error",
          }),
        );
      },
    });
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
    announce(board.leftWhere);
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
            {board.columns[name]}
          </h3>
          <span className="text-xs font-medium text-muted tabular-nums">
            {format.number(cards.length)}
          </span>
        </header>
        <div className="relative flex-1 px-2 pt-2 pb-2 md:overflow-y-auto">
          {cards.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {cards.slice(0, limit).map((card) => (
                <BoardCardView
                  key={card.key}
                  card={card}
                  now={now}
                  hasLetter={hasLetter(card)}
                  fromEmail={card.kind === "application" && emailed.has(card.application.id)}
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
              <span className="sr-only">
                {fmt(board.nothingIn, { column: board.columns[name] })}
              </span>
            </p>
          )}
          {cards.length > limit ? (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full text-muted hover:text-ink"
              onClick={() => setShown({ ...shown, [name]: limit + COLUMN_PAGE })}
            >
              {fmt(board.loadMore, { count: format.number(cards.length - limit) })}
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p id={instructionsId} className="sr-only">
        {board.instructions}
      </p>
      <p aria-live="polite" className="sr-only">
        {drag.announcement}
      </p>

      <div className="-mx-4 overflow-x-auto px-4 md:hidden">
        <div
          role="group"
          aria-label={board.stage}
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
              {board.columns[name]}
              <span className="text-xs text-muted tabular-nums">
                {format.number(columns[name].length)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 1.5rem, not 2rem: 100vw counts a classic scrollbar, which must not widen the page. */}
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
          {board.dropDelete}
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
