"use client";

import { ArrowDownUp, ChevronDown, Search, X } from "lucide-react";
import { useRef } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import {
  FILTER_LABELS,
  LIBRARY_FILTERS,
  LIBRARY_SORTS,
  SORT_LABELS,
  toolbarParts,
  type LibraryFilter,
  type LibrarySort,
} from "./library";

export type LibraryToolbarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  counts: Record<LibraryFilter, number>;
};

const count = new Intl.NumberFormat("en-US");

export function LibraryToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  counts,
}: LibraryToolbarProps) {
  const parts = toolbarParts(counts, { query, filter, sort });
  if (!parts.filters && !parts.search) return null;
  return (
    <div className="flex flex-col gap-3 motion-safe:animate-fade-in xl:flex-row xl:items-center xl:justify-between">
      {parts.filters ? (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div
            role="group"
            aria-label="Show"
            className="flex w-max gap-1 rounded-xl bg-surface-strong p-1 shadow-[inset_0_1px_2px_rgb(18_36_29/0.06)]"
          >
            {LIBRARY_FILTERS.map((item) => {
              const selected = item === filter;
              if (item !== "all" && counts[item] === 0 && !selected) return null;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onFilterChange(item)}
                  className="group/seg flex h-9 shrink-0 items-center gap-2 rounded-lg pr-2 pl-3 text-sm font-medium text-muted -outline-offset-2 transition-[color,background-color,box-shadow] duration-200 hover:bg-surface/50 hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control aria-pressed:ring-1 aria-pressed:ring-ink/5 pointer-coarse:h-10"
                >
                  {FILTER_LABELS[item]}
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs/4 text-muted tabular-nums transition-colors group-aria-pressed/seg:bg-surface-muted group-aria-pressed/seg:text-ink">
                    {count.format(counts[item])}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {parts.search ? (
        <div className="flex gap-2">
          <SearchField value={query} onChange={onQueryChange} />
          <Menu
            label="Sort resumes"
            align="end"
            triggerLabel={`Sort by ${SORT_LABELS[sort].toLowerCase()}. Change order`}
            triggerClassName={buttonClasses({ variant: "secondary", className: "px-3.5" })}
            trigger={
              <>
                <ArrowDownUp aria-hidden className="text-muted" />
                <span className="max-sm:sr-only">{SORT_LABELS[sort]}</span>
                <ChevronDown aria-hidden className="text-muted" />
              </>
            }
            items={LIBRARY_SORTS.map((item) => ({
              label: SORT_LABELS[item],
              checked: item === sort,
              onSelect: () => onSortChange(item),
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative min-w-0 flex-1 xl:w-72 xl:flex-none">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
      />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
        placeholder="Search by name or company"
        aria-label="Search resumes"
        autoComplete="off"
        spellCheck={false}
        className={cn("pl-10 [&::-webkit-search-cancel-button]:appearance-none", value && "pr-11")}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/6 hover:text-ink"
        >
          <X aria-hidden className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
