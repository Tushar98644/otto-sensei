"use client";

import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  LEVEL_LABELS,
  LEVELS,
  ROLE_FAMILIES,
  ROLE_LABELS,
  type JobFilters,
  type Level,
  type RoleFamily,
} from "@/lib/job-feed/types";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import type { JobView } from "./use-job-matches";

const count = new Intl.NumberFormat("en-US");
const TYPE_DELAY_MS = 350;

const SEGMENT =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted -outline-offset-2 transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control pointer-coarse:h-10";
const CHECKBOX = "flex min-h-11 items-center gap-2 text-sm text-ink";

// Reports once typing stops, and at once on Enter or clear. The page's filters stay the truth.
function DelayedInput({
  value,
  onCommit,
  label,
  placeholder,
  icon,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
  placeholder: string;
  icon?: boolean;
}) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const latest = useRef(onCommit);
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
      {icon ? (
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
      ) : null}
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
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "[&::-webkit-search-cancel-button]:appearance-none",
          icon && "pl-10",
          text && "pr-11",
        )}
      />
      {text ? (
        <button
          type="button"
          aria-label={`Clear ${label.toLowerCase()}`}
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
  onFilters: (patch: Partial<JobFilters>) => void;
  // The work profile has answers the "can take it" rules can use.
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
  profileReady,
}: JobFiltersBarProps) {
  const ids = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label="Show" className="flex w-max gap-1 rounded-xl bg-surface-strong p-1">
          <button type="button" aria-pressed={view === "matches"} onClick={() => onView("matches")} className={SEGMENT}>
            Best matches
          </button>
          <button type="button" aria-pressed={view === "saved"} onClick={() => onView("saved")} className={SEGMENT}>
            Saved
            <span className="text-xs text-muted tabular-nums">{count.format(savedCount)}</span>
          </button>
        </div>
        <label htmlFor={`${ids}-resume`} className="sr-only">
          Resume to match
        </label>
        <Select
          id={`${ids}-resume`}
          value={resumeId ?? ""}
          onChange={(event) => onResume(event.target.value)}
          className="lg:ml-auto lg:w-72"
        >
          {resumes.map((resume) => (
            <option key={resume.id} value={resume.id}>
              {`Matching: ${resumeTitle(resume)}`}
            </option>
          ))}
        </Select>
      </div>

      {view === "matches" ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <DelayedInput
              value={filters.q}
              onCommit={(q) => onFilters({ q })}
              label="Search jobs"
              placeholder="Search titles, companies or skills"
              icon
            />
            <div className="sm:w-56">
              <DelayedInput
                value={filters.place}
                onCommit={(place) => onFilters({ place })}
                label="Location"
                placeholder="City or country"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              aria-label="Role"
              value={filters.role ?? ""}
              onChange={(event) => onFilters({ role: (event.target.value || null) as RoleFamily | null })}
            >
              <option value="">Any role</option>
              {ROLE_FAMILIES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Seniority"
              value={filters.level ?? ""}
              onChange={(event) => onFilters({ level: (event.target.value || null) as Level | null })}
            >
              <option value="">Any level</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Posted"
              value={filters.postedWithin === null ? "" : String(filters.postedWithin)}
              onChange={(event) => {
                const value = event.target.value;
                onFilters({ postedWithin: value === "7" ? 7 : value === "30" ? 30 : null });
              }}
            >
              <option value="">Posted any time</option>
              <option value="7">Posted in the last 7 days</option>
              <option value="30">Posted in the last 30 days</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-x-6">
            <label className={CHECKBOX}>
              <input
                type="checkbox"
                checked={filters.remote}
                onChange={(event) => onFilters({ remote: event.target.checked })}
                className="size-4 accent-ink"
              />
              Remote only
            </label>
            <label className={CHECKBOX}>
              <input
                type="checkbox"
                checked={filters.eligibleOnly}
                onChange={(event) => onFilters({ eligibleOnly: event.target.checked })}
                aria-describedby={profileReady ? undefined : `${ids}-eligible`}
                className="size-4 accent-ink"
              />
              Only jobs I can take
            </label>
            {profileReady ? null : (
              <p id={`${ids}-eligible`} className="flex min-h-11 items-center text-sm text-subtle">
                Needs where you can work first.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
