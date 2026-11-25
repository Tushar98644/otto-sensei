"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useFormat, useMessages } from "@/i18n/client";
import type { JobFilters } from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { activeFilterCount, type FilterMemory } from "./filter-memory";
import type { JobView } from "./use-job-matches";

const TYPE_DELAY_MS = 350;

const SEGMENT =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control aria-pressed:ring-1 aria-pressed:ring-ink/5 pointer-coarse:h-10";
const CHECKBOX = "flex min-h-11 items-center gap-2 text-sm text-ink";

function SearchInput({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const { filters: t } = useMessages("jobs");
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(onCommit);
  // A search remembered from an earlier visit, or cleared elsewhere, lands after the first render.
  if (value !== shown) {
    setShown(value);
    if (text.trim() !== value.trim()) setText(value);
  }
  useEffect(() => {
    latest.current = onCommit;
  });
  useEffect(() => {
    if (text.trim() === value.trim()) return;
    const timer = window.setTimeout(() => latest.current(text.trim()), TYPE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text, value]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
      />
      <Input
        ref={inputRef}
        type="search"
        value={text}
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onCommit(text.trim());
          if (event.key === "Escape" && text) {
            event.preventDefault();
            setText("");
            onCommit("");
          }
        }}
        placeholder={t.search}
        aria-label={t.searchLabel}
        autoComplete="off"
        spellCheck={false}
        className={cn("pl-10 [&::-webkit-search-cancel-button]:appearance-none", text && "pr-11")}
      />
      {text ? (
        <button
          type="button"
          aria-label={t.clear}
          onClick={() => {
            setText("");
            onCommit("");
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

export type JobFiltersBarProps = {
  resumes: readonly Resume[];
  resumeId: string | null;
  onResume: (id: string) => void;
  view: JobView;
  onView: (view: JobView) => void;
  savedCount: number;
  filters: JobFilters;
  onFilters: (patch: Partial<Omit<FilterMemory, "resumeId">>) => void;
  onRemote: ((remote: boolean) => void) | null;
  profileReady: boolean;
};

export function JobFiltersBar({
  resumes,
  resumeId,
  onResume,
  view,
  onView,
  savedCount,
  filters,
  onFilters,
  onRemote,
  profileReady,
}: JobFiltersBarProps) {
  const { filters: t } = useMessages("jobs");
  const format = useFormat();
  const ids = useId();
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(filters);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          role="group"
          aria-label={t.show}
          className="flex w-max gap-1 rounded-xl bg-surface-strong p-1"
        >
          <button
            type="button"
            aria-pressed={view === "matches"}
            onClick={() => onView("matches")}
            className={SEGMENT}
          >
            {t.best}
          </button>
          <button
            type="button"
            aria-pressed={view === "saved"}
            onClick={() => onView("saved")}
            className={SEGMENT}
          >
            {t.saved}
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink/6 px-1.5 text-xs/none text-muted tabular-nums">
              {format.number(savedCount)}
            </span>
          </button>
        </div>
        {view === "matches" ? (
          <div className="flex min-w-0 flex-1 gap-2">
            <SearchInput value={filters.q} onCommit={(q) => onFilters({ q })} />
            <Button
              variant="secondary"
              aria-expanded={open}
              aria-controls={`${ids}-panel`}
              onClick={() => setOpen((current) => !current)}
            >
              <SlidersHorizontal aria-hidden />
              {t.filters}
              {active > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs/none text-white tabular-nums">
                  {format.number(active)}
                  <span className="sr-only">{t.on}</span>
                </span>
              ) : null}
              <ChevronDown
                aria-hidden
                className={cn("text-muted transition-transform", open && "rotate-180")}
              />
            </Button>
          </div>
        ) : null}
      </div>

      <div id={`${ids}-panel`}>
        {view === "matches" && open ? (
          <div className="grid gap-x-6 gap-y-3 rounded-2xl bg-surface p-4 shadow-[0_1px_2px_rgb(18_36_29/0.04)] motion-safe:animate-fade-in sm:grid-cols-2 sm:p-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${ids}-posted`}>{t.posted}</Label>
              <Select
                id={`${ids}-posted`}
                value={filters.postedWithin === null ? "" : String(filters.postedWithin)}
                onChange={(event) => {
                  const value = event.target.value;
                  onFilters({ postedWithin: value === "7" ? 7 : value === "30" ? 30 : null });
                }}
              >
                <option value="">{t.anyTime}</option>
                <option value="7">{t.last7}</option>
                <option value="30">{t.last30}</option>
              </Select>
            </div>
            {resumes.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${ids}-resume`}>{t.resume}</Label>
                <Select
                  id={`${ids}-resume`}
                  value={resumeId ?? ""}
                  onChange={(event) => onResume(event.target.value)}
                >
                  {resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resumeTitle(resume)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-6 sm:col-span-2">
              {onRemote ? (
                <label className={CHECKBOX}>
                  <input
                    type="checkbox"
                    checked={filters.remote}
                    onChange={(event) => onRemote(event.target.checked)}
                    className="size-4 accent-ink"
                  />
                  {t.remote}
                </label>
              ) : null}
              {profileReady ? (
                <label className={CHECKBOX}>
                  <input
                    type="checkbox"
                    checked={filters.eligibleOnly}
                    onChange={(event) => onFilters({ eligibleOnly: event.target.checked })}
                    className="size-4 accent-ink"
                  />
                  {t.eligible}
                </label>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
