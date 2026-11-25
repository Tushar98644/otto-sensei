"use client";

import { useFormat, useMessages } from "@/i18n/client";
import type { LetterFilter } from "./entries";

export const LETTER_FILTERS: readonly LetterFilter[] = ["all", "letter", "answer", "outreach"];

export function LetterFilters({
  filter,
  counts,
  onChange,
}: {
  filter: LetterFilter;
  counts: Record<LetterFilter, number>;
  onChange: (filter: LetterFilter) => void;
}) {
  const { filters } = useMessages("letters");
  const format = useFormat();
  return (
    <div
      role="group"
      aria-label={filters.show}
      className="flex w-max gap-1 rounded-xl bg-surface-strong p-1"
    >
      {LETTER_FILTERS.map((item) => {
        const selected = item === filter;
        if (item !== "all" && counts[item] === 0 && !selected) return null;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item)}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control pointer-coarse:h-10"
          >
            {filters[item]}
            <span className="text-xs text-muted tabular-nums">{format.number(counts[item])}</span>
          </button>
        );
      })}
    </div>
  );
}
