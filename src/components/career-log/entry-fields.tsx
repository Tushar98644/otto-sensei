"use client";

import { useId } from "react";
import { VoiceTextarea } from "@/components/ui/voice-field";
import { PROMPTS } from "@/lib/career-log/entry";
import { CAREER_LOG_LIMITS, ENTRY_FIELDS, type EntryField } from "@/lib/career-log/types";
import { cn } from "@/lib/utils";
import type { Draft } from "./use-entry-draft";

type EntryFieldsProps = {
  draft: Draft;
  onChange: (field: EntryField, value: string) => void;
  onBlur?: () => void;
  numbered?: boolean;
  className?: string;
};

// Three prompts, none required: each has the mic (the same voice typing and limits as everywhere) and a box.
export function EntryFields({
  draft,
  onChange,
  onBlur,
  numbered = false,
  className,
}: EntryFieldsProps) {
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {ENTRY_FIELDS.map((field, index) => {
        const prompt = PROMPTS[field];
        const fieldId = `${id}-${field}`;
        return (
          <div key={field} className="flex flex-col gap-2">
            <label htmlFor={fieldId} className="flex items-baseline gap-2.5">
              {numbered ? (
                <span
                  aria-hidden
                  className="font-display text-xl/7 text-subtle tabular-nums sm:text-2xl/8"
                >
                  {index + 1}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-col">
                <span className="text-base/6 font-medium text-pretty text-ink">{prompt.label}</span>
                <span className="text-sm/6 text-pretty text-muted">{prompt.hint}</span>
              </span>
            </label>
            <VoiceTextarea
              id={fieldId}
              value={draft[field]}
              autoResize
              rows={2}
              maxLength={CAREER_LOG_LIMITS.fieldChars}
              placeholder={prompt.placeholder}
              onChange={(event) => onChange(field, event.target.value)}
              onDictate={(text) => onChange(field, text)}
              onBlur={onBlur}
              className="min-h-20 text-base/7"
            />
          </div>
        );
      })}
    </div>
  );
}
