"use client";

import {
  ArrowDown,
  Check,
  ChevronDown,
  CornerDownRight,
  FileText,
  Play,
  RotateCcw,
} from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { PrepQuestion, StarStory } from "@/lib/insights/prep";
import { cn } from "@/lib/utils";
import type { PracticeMark } from "./practice-store";
import { Speaker, WithBlanks } from "./speech";

export type LinkedStory = { story: StarStory; href: string };

export function storyHref(index: number): string {
  return `#prep-story-${index + 1}`;
}

export const QUESTION_CARD =
  "rounded-2xl bg-surface shadow-card ring-1 ring-ink/6 print:shadow-none print:ring-ink/15";

function Note({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </div>
  );
}

export function hasMoreNotes(item: PrepQuestion, story: LinkedStory | null): boolean {
  return Boolean(item.points.length > 0 || story || item.followUp);
}

// Points, the story to tell and the follow-up; "What they're checking" sits on the card itself.
export function AnswerNotes({
  item,
  story,
  checking = false,
}: {
  item: PrepQuestion;
  story: LinkedStory | null;
  checking?: boolean;
}) {
  const t = useMessages("prep");
  return (
    <>
      {checking && item.checking ? (
        <Note label={t.question.checking}>
          <p className="text-base/7 text-pretty text-ink">{item.checking}</p>
        </Note>
      ) : null}
      {item.points.length > 0 ? (
        <Note label={t.question.points}>
          <ul className="flex flex-col gap-1.5">
            {item.points.map((point) => (
              <li key={point} className="flex gap-3 text-base/7 text-pretty text-ink">
                <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <WithBlanks text={point} />
                </span>
              </li>
            ))}
          </ul>
        </Note>
      ) : null}
      {story ? (
        <Note label={t.question.story}>
          <a
            href={story.href}
            className="group/story flex w-fit max-w-full items-center gap-3 rounded-xl bg-surface p-2 pr-3 shadow-control ring-1 ring-ink/8 transition hover:-translate-y-px hover:shadow-page-lift print:shadow-none"
          >
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-otter-light text-otter"
            >
              <FileText className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm/5 font-medium text-pretty text-ink">
                {story.story.title}
              </span>
              <span className="block text-xs/4 text-subtle">{t.question.fromLine}</span>
            </span>
            <ArrowDown
              aria-hidden
              className="size-4 shrink-0 text-muted transition group-hover/story:translate-y-0.5 group-hover/story:text-ink print:hidden"
            />
          </a>
        </Note>
      ) : null}
      {item.followUp ? (
        <Note label={t.question.followUp}>
          <p className="flex gap-2 text-base/7 text-pretty text-ink">
            <CornerDownRight aria-hidden className="mt-1.5 size-4 shrink-0 text-muted" />
            <span>{fmt(t.quote, { text: item.followUp })}</span>
          </p>
        </Note>
      ) : null}
    </>
  );
}

export function MarkChip({ mark }: { mark: PracticeMark }) {
  const { question } = useMessages("prep");
  return mark === "got" ? (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-primary/8 px-2 text-xs font-medium text-primary">
      <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
      {question.got}
    </span>
  ) : (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-otter-light px-2 text-xs font-medium text-otter">
      <RotateCcw aria-hidden className="size-3.5" />
      {question.again}
    </span>
  );
}

// The key that opens practice on one question, its number said only to screen readers.
export function PractiseButton({ number, onPractise }: { number: number; onPractise: () => void }) {
  const { question } = useMessages("prep");
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onPractise}
      className="-mr-1.5 text-muted hover:text-ink"
    >
      <Play aria-hidden />
      <span className="max-sm:sr-only">{question.practice}</span>
      <span className="sr-only">{fmt(question.practiceQuestion, { number })}</span>
    </Button>
  );
}

export function QuestionCard({
  item,
  number,
  total,
  story,
  mark,
  onPractise,
}: {
  item: PrepQuestion;
  number: number;
  total: number;
  story: LinkedStory | null;
  mark?: PracticeMark;
  onPractise?: () => void;
}) {
  const t = useMessages("prep");
  const format = useFormat();
  const [open, setOpen] = useState(false);
  const notesId = useId();
  const more = hasMoreNotes(item, story);
  const inside = [
    item.points.length > 0 ? format.plural(t.count.points, item.points.length) : "",
    story ? t.question.yourStory : "",
    item.followUp ? t.question.followUpShort : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className={cn("break-inside-avoid", QUESTION_CARD)}>
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-x-3">
          <Speaker meta={fmt(t.question.of, { number, total })} />
          <div className="ml-auto flex items-center gap-2 print:hidden">
            {mark ? <MarkChip mark={mark} /> : null}
            {onPractise ? <PractiseButton number={number} onPractise={onPractise} /> : null}
          </div>
        </div>
        <h3 className="mt-4 font-display text-2xl/8 font-normal text-pretty text-ink">
          {fmt(t.quote, { text: item.question })}
        </h3>
        {item.checking ? (
          <p className="mt-4 border-l-2 border-primary/25 pl-3 text-sm/6 text-pretty text-muted">
            <span className="font-medium text-ink">{t.question.checkingLead}</span>
            {item.checking}
          </p>
        ) : null}
      </div>
      {more ? (
        <div className="border-t border-border">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={notesId}
            onClick={() => setOpen((shown) => !shown)}
            className="flex min-h-12 w-full items-center gap-2 rounded-b-2xl px-5 text-left text-sm font-medium text-ink transition-colors hover:bg-ink/3 aria-expanded:rounded-none sm:px-6 print:hidden"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-muted transition-transform duration-200",
                open && "rotate-180",
              )}
            />
            {t.question.howTo}
            {inside ? (
              <span className="ml-auto hidden pl-2 text-xs/5 font-normal text-subtle sm:block">
                {inside}
              </span>
            ) : null}
          </button>
          <div
            id={notesId}
            className={cn(
              "flex-col gap-5 px-5 pt-2 pb-6 sm:px-6 print:flex print:pt-5",
              open ? "flex motion-safe:animate-fade-in" : "hidden",
            )}
          >
            <AnswerNotes item={item} story={story} />
          </div>
        </div>
      ) : null}
    </li>
  );
}
