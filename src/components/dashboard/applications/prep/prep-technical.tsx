"use client";

import { ChevronDown, CornerDownRight, Lightbulb, Play, Ruler, TriangleAlert } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FolderCard } from "@/components/ui/folder-card";
import type { TechnicalQuestion } from "@/lib/insights/prep";
import { kindLabel, type RoleFocus } from "@/lib/insights/prep-focus";
import { cn, pluralize } from "@/lib/utils";
import type { PracticeMark } from "./practice-store";
import { MarkChip } from "./prep-question";
import { ResumeSlip } from "./prep-story";
import { Speaker, WithBlanks } from "./speech";

function Note({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Eyebrow>{label}</Eyebrow>
        {hint ? <span className="text-xs/4 text-subtle">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function AssumeNote({ text, className }: { text: string; className?: string }) {
  return (
    <p
      className={cn(
        "flex w-fit max-w-full gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm/6 text-pretty text-ink print:bg-transparent print:px-0",
        className,
      )}
    >
      <Ruler aria-hidden className="mt-1 size-4 shrink-0 text-muted" />
      <span>{text}</span>
    </p>
  );
}

// Covers, pitfalls and probes are general know-how; only the resume slip is about the person.
export function TechnicalNotes({ item }: { item: TechnicalQuestion }) {
  return (
    <>
      {item.covers.length > 0 ? (
        <Note label="What a strong answer covers" hint="General know-how, not facts about you">
          <ul className="flex flex-col gap-1.5">
            {item.covers.map((cover) => (
              <li key={cover} className="flex gap-3 text-base/7 text-pretty text-ink">
                <Lightbulb aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <WithBlanks text={cover} />
                </span>
              </li>
            ))}
          </ul>
        </Note>
      ) : null}
      {item.pitfalls.length > 0 ? (
        <Note label="Common pitfalls">
          <ul className="flex flex-col gap-1.5">
            {item.pitfalls.map((pitfall) => (
              <li key={pitfall} className="flex gap-3 text-base/7 text-pretty text-ink">
                <TriangleAlert aria-hidden className="mt-1.5 size-4 shrink-0 text-otter" />
                <span className="min-w-0">{pitfall}</span>
              </li>
            ))}
          </ul>
        </Note>
      ) : null}
      {item.probes.length > 0 ? (
        <Note label={item.probes.length === 1 ? "Follow-up probe" : "Follow-up probes"}>
          <ul className="flex flex-col gap-1.5">
            {item.probes.map((probe) => (
              <li key={probe} className="flex gap-2 text-base/7 text-pretty text-ink">
                <CornerDownRight aria-hidden className="mt-1.5 size-4 shrink-0 text-muted" />
                <span>“{probe}”</span>
              </li>
            ))}
          </ul>
        </Note>
      ) : null}
      {item.resume ? <ResumeSlip line={item.resume.line} place={item.resume.place} /> : null}
    </>
  );
}

export function TechnicalCard({
  item,
  focus,
  number,
  total,
  mark,
  onPractise,
}: {
  item: TechnicalQuestion;
  focus: RoleFocus;
  number: number;
  total: number;
  mark?: PracticeMark;
  onPractise?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const notesId = useId();
  const inside = [
    item.covers.length > 0 ? pluralize(item.covers.length, "point") : "",
    item.pitfalls.length > 0 ? pluralize(item.pitfalls.length, "pitfall") : "",
    item.probes.length > 0 ? pluralize(item.probes.length, "probe") : "",
    item.resume ? "your line" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="break-inside-avoid">
      <FolderCard
        tab={kindLabel(focus, item.kind)}
        tabEnd={
          item.topic ? (
            <span className="max-w-48 truncate text-xs/4 text-subtle sm:max-w-72">
              {item.topic}
            </span>
          ) : null
        }
        bodyClassName="p-0 shadow-card ring-1 ring-ink/6 print:shadow-none print:ring-ink/15"
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-x-3">
            <Speaker meta={`Question ${number} of ${total}`} />
            <div className="ml-auto flex items-center gap-2 print:hidden">
              {mark ? <MarkChip mark={mark} /> : null}
              {onPractise ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onPractise}
                  className="-mr-1.5 text-muted hover:text-ink"
                >
                  <Play aria-hidden />
                  <span className="max-sm:sr-only">Practise</span>
                  <span className="sr-only"> question {number}</span>
                </Button>
              ) : null}
            </div>
          </div>
          <h3 className="mt-4 font-display text-2xl/8 font-normal text-pretty text-ink">
            “{item.question}”
          </h3>
          {item.assume ? <AssumeNote text={item.assume} className="mt-4" /> : null}
        </div>
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
            How to answer
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
            <TechnicalNotes item={item} />
          </div>
        </div>
      </FolderCard>
    </li>
  );
}
