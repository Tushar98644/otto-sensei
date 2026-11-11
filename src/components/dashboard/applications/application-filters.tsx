"use client";

import { APPLICATION_FILTERS, FILTER_NAMES, type ApplicationFilter } from "./view";

const count = new Intl.NumberFormat("en-US");

export function ApplicationFilters({
  filter,
  counts,
  onChange,
}: {
  filter: ApplicationFilter;
  counts: Record<ApplicationFilter, number>;
  onChange: (filter: ApplicationFilter) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        role="group"
        aria-label="Show"
        className="flex w-max gap-1 rounded-xl bg-surface-strong p-1"
      >
        {APPLICATION_FILTERS.map((item) => {
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
              {FILTER_NAMES[item]}
              <span className="text-xs text-muted tabular-nums">{count.format(counts[item])}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
