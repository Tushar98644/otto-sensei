"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api/client";
import type { OccupationOption } from "@/lib/api/types";

export type OccupationSearchProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (occupation: OccupationOption) => void;
};

// Waits for a pause in typing, so a fast typist sends one search, not one per letter.
const TYPING_PAUSE_MS = 150;

type Results = { query: string; occupations: OccupationOption[] } | { query: string; error: true };

// "Any other job": every occupation O*NET and ESCO name, found by any of their names ("RN",
// "HGV driver", "solicitor"), not only the kinds of role the card lists.
export function OccupationSearch({ open, onOpenChange, onPick }: OccupationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const listId = useId();
  const typed = query.trim();

  useEffect(() => {
    if (!open || !typed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .searchOccupations(typed, controller.signal)
        .then((res) => setResults({ query: typed, occupations: res.occupations }))
        .catch(() => {
          if (!controller.signal.aborted) setResults({ query: typed, error: true });
        });
    }, TYPING_PAUSE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, typed]);

  const current = results?.query === typed ? results : null;
  const searching = typed !== "" && current === null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
      title="Pick the job you want"
      description="Search over a thousand occupations by any name for them, like “nurse”, “HGV driver” or “store manager”."
    >
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
        />
        <Input
          data-autofocus
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Job title"
          aria-label="Job title"
          aria-controls={listId}
          autoComplete="off"
          maxLength={60}
          className="pl-10"
        />
      </div>
      <div className="min-h-40">
        {searching ? (
          <p className="flex items-center gap-2 py-3 text-sm text-muted">
            <Spinner className="size-4" /> Searching
          </p>
        ) : current && "error" in current ? (
          <p className="py-3 text-sm text-muted">Search didn&apos;t work. Try again in a moment.</p>
        ) : current && current.occupations.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            Nothing by that name. Try another word for the job.
          </p>
        ) : (
          <ul id={listId} aria-label="Occupations" className="flex flex-col gap-1">
            {(current?.occupations ?? []).map((occupation) => (
              <li key={occupation.code}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(occupation);
                    setQuery("");
                    onOpenChange(false);
                  }}
                  className="flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-colors hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-hidden"
                >
                  <span className="text-sm font-medium text-ink">{occupation.name}</span>
                  <span className="text-xs text-subtle">{occupation.group}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs/5 text-subtle">
        Includes information from the O*NET® 31.0 Database by the U.S. Department of Labor,
        Employment and Training Administration (USDOL/ETA), used under the{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          CC BY 4.0 licence
        </a>
        . O*NET® is a trademark of USDOL/ETA. Otto has modified some of this information; USDOL/ETA
        has not approved, endorsed or tested these changes. This service uses the ESCO
        classification of the European Commission.
      </p>
    </Dialog>
  );
}
