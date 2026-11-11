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
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="group" aria-label="Show" className="flex w-max gap-1 rounded-xl bg-surface-strong p-1">
          {LIBRARY_FILTERS.map((item) => {
            const selected = item === filter;
            if (item !== "all" && counts[item] === 0 && !selected) return null;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => onFilterChange(item)}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors -outline-offset-2 hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control pointer-coarse:h-10"
              >
                {FILTER_LABELS[item]}
                <span className="text-xs text-muted tabular-nums">{count.format(counts[item])}</span>
              </button>
            );
          })}
        </div>
      </div>

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
