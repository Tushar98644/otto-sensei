"use client";

import { ChevronRight } from "lucide-react";
import { useId } from "react";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { countText } from "../count";
import { OttoNote } from "@/components/mascot/otto-note";
import { HiringNoteRow } from "@/components/studio/hiring-notes";
import { hiringSystemOf } from "@/lib/ats/detect";
import { HIRING_SYSTEMS } from "@/lib/ats/systems";
import type { ScreeningQuestion } from "@/lib/ats/types";
import { cn } from "@/lib/utils";
import type { ReadJob } from "./session";

const LIST_CHOICES = 4;

type SystemCopy = Messages["studioTailor"]["system"];

function choicesLine(t: SystemCopy, question: ScreeningQuestion): string {
  if (question.kind === "yes_no") return t.yesNo;
  if (question.optionCount <= LIST_CHOICES) return question.options.join(" / ");
  return fmt(t.choices, { count: question.optionCount });
}

function ScreeningQuestions({ questions }: { questions: readonly ScreeningQuestion[] }) {
  const headingId = useId();
  const t = useMessages("studioTailor").system;
  return (
    <section aria-labelledby={headingId} className="mt-3 rounded-xl bg-surface p-4">
      <h4 id={headingId} className="text-sm/6 font-semibold text-ink">
        {t.questions}
      </h4>
      <ul className="mt-1 divide-y divide-border">
        {questions.map((question, index) => (
          <li key={`${index}-${question.label}`} className="py-3">
            <p className="text-sm/6 text-pretty text-ink">{question.label}</p>
            <p className="text-xs/5 text-subtle">
              {[question.required ? t.required : null, choicesLine(t, question)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <OttoNote size="sm" live={false} className="mt-3" message={t.answerTruthfully} />
    </section>
  );
}

export type HiringSystemNotesProps = {
  posting: ReadJob | null;
  link?: string;
  className?: string;
};

export function HiringSystemNotes({ posting, link, className }: HiringSystemNotesProps) {
  const t = useMessages("studioTailor").system;
  const format = useFormat();
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
          <span className="font-medium">{fmt(t.uses, { system: system.name })}</span>
          <span className="text-subtle"> · {t.howItReads}</span>
        </span>
      </summary>
      <ul
        aria-label={countText(format, t.notes, system.notes.length, { system: system.name })}
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
