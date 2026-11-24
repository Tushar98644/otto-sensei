"use client";

import { ArrowLeft, Check, Lightbulb, RotateCcw, X } from "lucide-react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type SyntheticEvent,
} from "react";
import { Otto } from "@/components/mascot/otto";
import { Button } from "@/components/ui/button";
import { CompanyMark } from "@/components/ui/company-mark";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Field } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
import { VoiceTextarea } from "@/components/ui/voice-field";
import type { InterviewPrep, PrepTarget } from "@/lib/insights/prep";
import { practiceSteps } from "@/lib/insights/prep-view";
import { cn } from "@/lib/utils";
import { PracticeTimer } from "./practice-timer";
import {
  clearMarks,
  markQuestion,
  saveAnswer,
  usePractice,
  type PracticeMark,
} from "./practice-store";
import { AnswerNotes, MarkChip } from "./prep-question";
import { ResumeSlip, StarOutline } from "./prep-story";
import { AssumeNote, TechnicalNotes } from "./prep-technical";
import { AskBubbles, Speaker } from "./speech";

const SPOKEN =
  "font-display text-3xl/10 font-normal text-pretty text-ink outline-none sm:text-4xl/12";
const ANSWER_CHARS = 4_000;

export type PracticeModeProps = {
  prep: InterviewPrep;
  target: Pick<PrepTarget, "role" | "company">;
  storageKey: string;
  // The question number to open on; otherwise the first one not yet marked got it.
  startAt: number | null;
  onClose: () => void;
};

function typing(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest("input, textarea, select, [contenteditable]") !== null
  );
}

const SEGMENT: Record<PracticeMark | "none", string> = {
  got: "bg-primary",
  again: "bg-otter/55",
  none: "bg-surface-strong",
};

export function PracticeMode({ prep, target, storageKey, startAt, onClose }: PracticeModeProps) {
  const steps = useMemo(() => practiceSteps(prep), [prep]);
  const record = usePractice(storageKey);
  const all = useMemo(() => steps.map((_, index) => index), [steps]);
  const [queue, setQueue] = useState<number[]>(all);
  const [position, setPosition] = useState(() => {
    if (startAt !== null)
      return Math.max(
        0,
        steps.findIndex((step) => step.number === startAt),
      );
    const open = steps.findIndex((step) => record.marks[step.item.question] !== "got");
    return open === -1 ? 0 : open;
  });
  const [outline, setOutline] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const outlineId = useId();

  const current = position < queue.length ? queue[position] : undefined;
  const step = current === undefined ? undefined : steps[current];
  const story =
    step?.kind === "general" && step.item.story !== null
      ? prep.stories[step.item.story]
      : undefined;
  const role = [target.role || prep.job.title, target.company || prep.job.company]
    .filter(Boolean)
    .join(" at ");
  const company = target.company || prep.job.company;
  const got = steps.filter((item) => record.marks[item.item.question] === "got").length;
  const left = all.filter((index) => record.marks[steps[index]!.item.question] !== "got");

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
  }, [position, queue]);

  function go(to: number) {
    const next = Math.min(Math.max(to, 0), queue.length);
    if (next === position) return;
    setPosition(next);
    setOutline(false);
  }

  function mark(value: PracticeMark) {
    if (!step) return;
    markQuestion(storageKey, step.item.question, value);
    go(position + 1);
  }

  function run(indexes: number[], from = 0) {
    setQueue(indexes.length > 0 ? indexes : all);
    setPosition(from);
    setOutline(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || typing(event.target))
      return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(position + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(position - 1);
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

  const answer = step ? (record.answers[step.item.question] ?? "") : "";

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
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
          <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4 sm:px-8">
            {company ? <CompanyMark name={company} size="sm" /> : null}
            <div className="min-w-0 flex-1">
              <p id={titleId} className="truncate text-sm/5 font-medium text-ink">
                Practice
              </p>
              {role ? <p className="truncate text-xs/4 text-subtle">{role}</p> : null}
            </div>
            <p className="hidden text-sm/5 text-muted tabular-nums sm:block">
              <span className="font-medium text-ink">{got}</span> of {steps.length} got it
            </p>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X aria-hidden />
              End
            </Button>
          </div>
          <div aria-hidden className="mx-auto flex w-full max-w-4xl gap-1 px-4 sm:px-8">
            {steps.map((item, index) => (
              <span
                key={item.item.question}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-300",
                  SEGMENT[record.marks[item.item.question] ?? "none"],
                  index === current && "outline-2 outline-offset-1 outline-ink/40",
                )}
              />
            ))}
          </div>
        </header>

        {/* Outside the keyed step so the live region persists and each count is read out. */}
        <p className="sr-only" aria-live="polite" aria-atomic>
          {step ? `Question ${step.number} of ${steps.length}` : `${got} of ${steps.length} got it`}
        </p>
        <div
          key={`${position}-${queue.length}`}
          className="mx-auto w-full max-w-3xl flex-1 px-4 pt-10 pb-16 motion-safe:animate-fade-in sm:px-8 sm:pt-14"
        >
          {step ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Eyebrow className="flex flex-wrap gap-x-2">
                  <span>
                    Round {step.stop} · {step.label}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    Question {step.number} of {steps.length}
                  </span>
                </Eyebrow>
                {record.marks[step.item.question] ? (
                  <MarkChip mark={record.marks[step.item.question]!} />
                ) : null}
              </div>
              <Speaker size="lg" className="mt-8" />
              <h2 ref={headingRef} tabIndex={-1} className={cn(SPOKEN, "mt-5")}>
                “{step.item.question}”
              </h2>
              {step.kind === "technical" && step.item.assume ? (
                <AssumeNote text={step.item.assume} className="mt-5" />
              ) : null}

              <Field
                className="mt-10"
                label="Your answer"
                hint="Say it out loud first, then jot down what you'd keep. Kept in this browser, for this pack."
              >
                <VoiceTextarea
                  value={answer}
                  onChange={(event) =>
                    saveAnswer(storageKey, step.item.question, event.target.value)
                  }
                  onDictate={(text) => saveAnswer(storageKey, step.item.question, text)}
                  rows={5}
                  maxLength={ANSWER_CHARS}
                  placeholder="Tap the mic and answer out loud, or type here…"
                />
              </Field>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  aria-expanded={outline}
                  aria-controls={outlineId}
                  onClick={() => setOutline((shown) => !shown)}
                >
                  <Lightbulb aria-hidden />
                  {outline ? "Hide my outline" : "Show my outline"}
                </Button>
                <PracticeTimer />
              </div>
              <div
                id={outlineId}
                hidden={!outline}
                className="mt-6 flex flex-col gap-6 rounded-3xl bg-surface-muted p-5 motion-safe:animate-fade-in sm:p-8"
              >
                {step.kind === "technical" ? (
                  <TechnicalNotes item={step.item} />
                ) : (
                  <AnswerNotes item={step.item} story={null} checking />
                )}
                {story ? (
                  <div className="flex flex-col gap-4">
                    <Eyebrow>Your story · {story.title}</Eyebrow>
                    <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-6">
                      <ResumeSlip line={story.line} place={story.place} />
                      <StarOutline story={story} />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <Summary
              headingRef={headingRef}
              got={got}
              total={steps.length}
              asks={prep.asks}
              left={left.map((index) => ({
                index,
                question: steps[index]!.item.question,
                mark: record.marks[steps[index]!.item.question],
              }))}
              onJump={(index) => run(all, index)}
              onAgain={() => run(left)}
              onRestart={() => {
                clearMarks(storageKey);
                run(all);
              }}
            />
          )}
        </div>

        <footer className="sticky bottom-0 border-t border-border bg-background">
          <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 px-4 py-3 sm:px-8">
            <Button variant="secondary" onClick={() => go(position - 1)} disabled={position === 0}>
              <ArrowLeft aria-hidden />
              <span className="max-sm:sr-only">Back</span>
            </Button>
            <p className="hidden items-center gap-1.5 text-xs/5 text-subtle lg:flex">
              <Kbd aria-hidden>←</Kbd>
              <Kbd aria-hidden>→</Kbd>
              <span className="sr-only">Arrow keys</span> to move
            </p>
            {step ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => mark("again")}>
                  <RotateCcw aria-hidden />
                  Practice again
                </Button>
                <Button onClick={() => mark("got")}>
                  <Check aria-hidden />
                  Got it
                </Button>
              </div>
            ) : (
              <Button onClick={onClose}>Finish</Button>
            )}
          </div>
        </footer>
      </div>
    </dialog>
  );
}

function Summary({
  headingRef,
  got,
  total,
  asks,
  left,
  onJump,
  onAgain,
  onRestart,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  got: number;
  total: number;
  asks: readonly string[];
  left: { index: number; question: string; mark: PracticeMark | undefined }[];
  onJump: (index: number) => void;
  onAgain: () => void;
  onRestart: () => void;
}) {
  const done = left.length === 0;
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Otto
          pose={done ? "cheer" : "think"}
          size={112}
          animated={!done}
          className={done ? "motion-safe:animate-pop" : undefined}
        />
        <div className="min-w-0">
          <Eyebrow>
            {got} of {total} got it
          </Eyebrow>
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-display text-3xl/10 font-normal text-pretty outline-none sm:text-4xl/12"
          >
            {done ? "That's every question. Nice work." : "Good run. A few to say once more."}
          </h2>
        </div>
      </div>

      {done ? null : (
        <section aria-label="Questions to practice again" className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2">
            {left.map((item) => (
              <li key={item.question}>
                <button
                  type="button"
                  onClick={() => onJump(item.index)}
                  className="group/row flex w-full items-start gap-3 rounded-2xl bg-surface p-4 text-left shadow-card ring-1 ring-ink/6 transition hover:-translate-y-px hover:shadow-page-lift"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                      item.mark === "again"
                        ? "bg-otter-light text-otter"
                        : "border border-dashed border-border-strong text-subtle",
                    )}
                  >
                    {item.mark === "again" ? <RotateCcw className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 text-base/7 text-pretty text-ink">
                    “{item.question}”
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onAgain}>
              <RotateCcw aria-hidden />
              Practice {left.length === 1 ? "that one" : `those ${left.length}`} again
            </Button>
            <Button variant="ghost" onClick={onRestart}>
              Start over
            </Button>
          </div>
        </section>
      )}
      {done ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onRestart}>
            <RotateCcw aria-hidden />
            Start over
          </Button>
        </div>
      ) : null}

      <section aria-label="Your turn" className="flex flex-col gap-5 border-t border-border pt-10">
        <Eyebrow>Your turn</Eyebrow>
        <Speaker size="lg" />
        <p className="font-display text-2xl/8 text-pretty text-ink">
          “That&apos;s everything from me. What would you like to ask us?”
        </p>
        {asks.length > 0 ? (
          <>
            <p className="text-base/7 text-muted">Pick two or three of these, or ask your own.</p>
            <AskBubbles asks={asks} surface="paper" />
          </>
        ) : (
          <p className="text-base/7 text-muted">
            Ask about the team, the work and what comes next.
          </p>
        )}
      </section>
    </div>
  );
}
