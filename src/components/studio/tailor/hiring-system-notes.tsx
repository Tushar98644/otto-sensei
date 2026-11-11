"use client";

import { ChevronRight } from "lucide-react";
import { useId } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { HiringNoteRow } from "@/components/studio/hiring-notes";
import { hiringSystemOf } from "@/lib/ats/detect";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import type { ScreeningQuestion } from "@/lib/ats/types";
import { cn, pluralize } from "@/lib/utils";
import type { ReadJob } from "./session";

// Never a score: each employer sets up the same system differently.

const LIST_CHOICES = 4;

function choicesLine(question: ScreeningQuestion): string {
  if (question.kind === "yes_no") return "Yes or no";
  if (question.optionCount <= LIST_CHOICES) return question.options.join(" / ");
  return `${question.optionCount} choices`;
}

function ScreeningQuestions({ questions }: { questions: readonly ScreeningQuestion[] }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="mt-3 rounded-xl bg-surface p-4">
      <h4 id={headingId} className="text-sm/6 font-semibold text-ink">
        Questions on this form that can be set to reject you automatically
      </h4>
      <ul className="mt-1 divide-y divide-border">
        {questions.map((question, index) => (
          <li key={`${index}-${question.label}`} className="py-3">
            <p className="text-sm/6 text-pretty text-ink">{question.label}</p>
            <p className="text-xs/5 text-subtle">
              {[question.required ? "Required" : null, choicesLine(question)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <OttoNote
        size="sm"
        live={false}
        className="mt-3"
        message="I can't tell which ones this employer uses. Answer them truthfully, and the same way every time."
      />
    </section>
  );
}

export type HiringSystemNotesProps = {
  posting: ReadJob | null;
  link?: string;
  className?: string;
};

export function HiringSystemNotes({ posting, link, className }: HiringSystemNotesProps) {
  const id = hiringSystemOf(posting, link);
  if (!id) return null;
  const system = HIRING_SYSTEMS[id];
  const questions = posting?.questions ?? [];
  return (
    <details className={cn("group/system", className)}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm/6 text-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted transition-transform group-open/system:rotate-90"
        />
        <span className="min-w-0">
          <span className="font-medium">This job uses {system.name}</span>
          <span className="text-subtle"> · how it reads you</span>
        </span>
      </summary>
      <ul
        aria-label={`${pluralize(system.notes.length, "note")} on ${system.name}`}
        className="divide-y divide-border"
      >
        {system.notes.map((note) => (
          <HiringNoteRow key={note.fact} note={note} />
        ))}
      </ul>
      {questions.length > 0 ? <ScreeningQuestions questions={questions} /> : null}
    </details>
  );
}
