"use client";

import { ArrowLeft, ArrowRight, Lightbulb, RotateCcw, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import { prepRounds, ROUND_COPY } from "@/lib/insights/prep-view";
import { cn } from "@/lib/utils";
import { PracticeTimer } from "./practice-timer";
import { AnswerNotes, hasNotes } from "./question-card";
import { AskBubbles, Speaker } from "./speech";
import { StarScript } from "./star-script";

const EYEBROW = "text-xs/4 font-medium tracking-widest text-subtle uppercase";
const SPOKEN = "font-display text-3xl/10 font-normal text-pretty text-ink outline-none sm:text-4xl/12";

function typing(target: EventTarget): boolean {
  return target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]") !== null;
}

export function PracticeSession({
  prep,
  target,
  onClose,
}: {
  prep: InterviewPrep;
  target: Pick<PrepTarget, "role" | "company">;
  onClose: () => void;
}) {
  const steps = useMemo(
    () =>
      prepRounds(prep).flatMap((group) =>
        group.questions.map((question) => ({ ...question, roundNumber: group.number })),
      ),
    [prep],
  );
  const total = steps.length;
  const [index, setIndex] = useState(0);
  const [tips, setTips] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const tipsId = useId();
  const step = index < total ? steps[index] : undefined;
  const story = step && step.item.story !== null ? prep.stories[step.item.story] : undefined;
  const role = [target.role || prep.job.title, target.company || prep.job.company].filter(Boolean).join(" at ");

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    dialogRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, [index]);

  function go(to: number) {
    const next = Math.min(Math.max(to, 0), total);
    if (next === index) return;
    setIndex(next);
    setTips(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || typing(event.target)) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    }
  }

  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  // The browser may close it itself (Escape twice); skip if it was shown again since (dev remount).
  function onDialogClose(event: SyntheticEvent<HTMLDialogElement>) {
    if (!event.currentTarget.open) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={onCancel}
      onClose={onDialogClose}
      onKeyDown={onKeyDown}
      className="m-0 size-full max-h-none max-w-none overflow-y-auto bg-background p-0 text-ink"
    >
      <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-10 bg-background">
          <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4 sm:px-8">
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-sm/5 font-medium text-ink">
                Mock interview
              </p>
              {role ? <p className="truncate text-xs/4 text-subtle">{role}</p> : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X aria-hidden />
              End
            </Button>
          </div>
          <div aria-hidden className="mx-auto flex w-full max-w-4xl gap-1 px-4 sm:px-8">
            {Array.from({ length: total + 1 }, (_, position) => (
              <span
                key={position}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  position <= index ? "bg-primary" : "bg-surface-strong",
                )}
              />
            ))}
          </div>
        </header>

        {/* Outside the keyed step so the live region persists and each count is read out. */}
        <p className="sr-only" aria-live="polite" aria-atomic>
          {step ? `Question ${step.number} of ${total}` : "Your turn"}
        </p>
        <div key={index} className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-16 motion-safe:animate-fade-in sm:px-8 sm:pt-16">
          {step ? (
            <>
              <p className={cn(EYEBROW, "flex flex-wrap gap-x-2")}>
                <span>
                  Round {step.roundNumber} · {ROUND_COPY[step.item.round].label}
                </span>
                <span aria-hidden>·</span>
                <span>
                  Question {step.number} of {total}
                </span>
              </p>
              <Speaker size="lg" className="mt-8" />
              <h2 ref={headingRef} tabIndex={-1} className={cn(SPOKEN, "mt-5")}>
                “{step.item.question}”
              </h2>
              <div className="mt-10 flex flex-wrap items-center gap-2">
                <PracticeTimer />
                {hasNotes(step.item, null) || story ? (
                  <Button
                    variant="secondary"
                    aria-expanded={tips}
                    aria-controls={tipsId}
                    onClick={() => setTips((shown) => !shown)}
                  >
                    <Lightbulb aria-hidden />
                    {tips ? "Hide tips" : "Show tips"}
                  </Button>
                ) : null}
              </div>
              <div
                id={tipsId}
                hidden={!tips}
                className="mt-6 flex flex-col gap-6 rounded-3xl bg-surface-muted p-5 sm:p-8"
              >
                <AnswerNotes item={step.item} story={null} />
                {story ? (
                  <div className="flex flex-col gap-3">
                    <p className={EYEBROW}>Use your story · {story.title}</p>
                    <div className="rounded-2xl bg-surface p-4 sm:p-6">
                      <StarScript story={story} />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className={EYEBROW}>Your turn</p>
              <Speaker size="lg" className="mt-8" />
              <h2 ref={headingRef} tabIndex={-1} className={cn(SPOKEN, "mt-5")}>
                “That&apos;s everything from me. What would you like to ask us?”
              </h2>
              {prep.asks.length > 0 ? (
                <>
                  <p className="mt-4 text-base/7 text-muted">
                    Questions to ask them. Pick two or three, or ask your own.
                  </p>
                  <AskBubbles asks={prep.asks} surface="paper" className="mt-8" />
                </>
              ) : (
                <p className="mt-4 text-base/7 text-muted">Ask about the team, the work and what comes next.</p>
              )}
              <div className="mt-10 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => go(0)}>
                  <RotateCcw aria-hidden />
                  Practice again
                </Button>
              </div>
            </>
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
            <Button variant="secondary" onClick={() => go(index - 1)} disabled={index === 0}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
            <p className="hidden items-center gap-1.5 text-xs/5 text-subtle sm:flex">
              <Kbd aria-hidden>←</Kbd>
              <Kbd aria-hidden>→</Kbd>
              <span className="sr-only">Arrow keys</span> to move
            </p>
            {step ? (
              <Button onClick={() => go(index + 1)}>
                {index === total - 1 ? "Your turn" : "Next question"}
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button onClick={onClose}>Finish</Button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}
