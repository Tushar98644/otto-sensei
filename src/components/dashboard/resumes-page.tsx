"use client";

import { CloudCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { SharedLinks } from "@/components/share/shared-links";
import { Button } from "@/components/ui/button";
import { preload, useLazy } from "@/components/ui/lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { useResumeList, useStudioHydrated } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";
import {
  cardId,
  FILTER_LABELS,
  filterCounts,
  libraryView,
  type LibraryFilter,
  type LibrarySort,
} from "./library";
import { WELL_HEIGHT } from "./library/paper-well";
import { LibraryToolbar } from "./library-toolbar";
import { NewResumeMenu } from "./new-resume-menu";
import { resumeSections } from "./page-code";
import { useStudioActions, type StudioActions } from "./use-studio-actions";
import { RecentlyDeletedLink } from "./trash/recently-deleted-link";

preload(resumeSections);

const storedLine = "Saved in this browser and backed up to your account.";

const count = new Intl.NumberFormat("en-US");

function reveal(resumeId: string) {
  const card = document.getElementById(cardId(resumeId));
  if (!card) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  card.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  card.querySelector<HTMLElement>("[data-card-open]")?.focus({ preventScroll: true });
}

export function ResumesPage() {
  const hydrated = useStudioHydrated();
  const resumes = useResumeList();
  const actions = useStudioActions();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [sort, setSort] = useState<LibrarySort>("edited");
  const counts = useMemo(() => filterCounts(resumes), [resumes]);
  const shown = useMemo(
    () => libraryView(resumes, { query, filter, sort }),
    [resumes, query, filter, sort],
  );
  const narrowed = query.trim() !== "" || filter !== "all";
  const parts = useLazy(resumeSections, true);
  const shownCards = hydrated && parts !== null;

  useEffect(() => {
    if (!shownCards) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash.startsWith("resume-")) reveal(hash.slice("resume-".length));
  }, [shownCards]);

  function showBase(id: string) {
    setQuery("");
    setFilter("all");
    // After React has put the card back on the page.
    requestAnimationFrame(() => reveal(id));
  }

  function clear() {
    setQuery("");
    setFilter("all");
  }

  const tailored = counts.tailored;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 motion-safe:animate-fade-in">
        <div className="min-w-0 flex-[1_1_20rem]">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Resumes
          </h1>
          <LibraryFacts total={hydrated ? resumes.length : 0} tailored={tailored} />
        </div>
        {/* From lg the sidebar holds the New resume menu. */}
        <NewResumeMenu actions={actions} align="end" className="lg:hidden" />
      </header>

      {!hydrated ? (
        <LoadingGrid />
      ) : resumes.length === 0 ? (
        <EmptyLibrary actions={actions} />
      ) : !parts ? (
        <LoadingGrid />
      ) : (
        <section aria-label="Your resumes" className="flex flex-col gap-8">
          <LibraryToolbar
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
            counts={counts}
          />
          <p aria-live="polite" className="sr-only">
            {narrowed ? `${pluralize(shown.length, "resume")} shown of ${resumes.length}` : ""}
          </p>
          {shown.length > 0 ? (
            <parts.ResumeGrid
              resumes={shown}
              all={resumes}
              actions={actions}
              onShowBase={showBase}
              end={narrowed ? null : <parts.AddResumeTile actions={actions} />}
            />
          ) : (
            <div className="rounded-2xl bg-surface p-6 sm:p-8">
              <OttoNote
                live={false}
                meta={`${FILTER_LABELS[filter]} · ${pluralize(counts[filter], "resume")}`}
                message={
                  query.trim()
                    ? `I couldn't find a resume with “${query.trim()}” in its name or companies.`
                    : "Nothing here yet."
                }
              >
                <Button variant="secondary" onClick={clear}>
                  Show all resumes
                </Button>
              </OttoNote>
            </div>
          )}
        </section>
      )}

      <SharedLinks />

      <RecentlyDeletedLink />
    </div>
  );
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <span>
      <span className="font-medium text-ink tabular-nums">{count.format(value)}</span> {label}
    </span>
  );
}

function Dot() {
  return <span aria-hidden className="size-1 shrink-0 rounded-full bg-border-strong/50" />;
}

function LibraryFacts({ total, tailored }: { total: number; tailored: number }) {
  return (
    <p className="mt-3 flex max-w-prose flex-wrap items-center gap-x-2.5 gap-y-1 text-base/7 text-muted">
      {total > 0 ? (
        <>
          <Fact value={total} label={total === 1 ? "resume" : "resumes"} />
          {tailored > 0 ? (
            <>
              <Dot />
              <Fact value={tailored} label="tailored to a job" />
            </>
          ) : null}
          <span
            aria-hidden
            className="size-1 shrink-0 rounded-full bg-border-strong/50 max-sm:hidden"
          />
        </>
      ) : null}
      <span className="inline-flex items-start gap-1.5 max-sm:basis-full max-sm:text-sm/6">
        <CloudCheck aria-hidden className="mt-1.5 size-4 shrink-0 text-subtle max-sm:mt-1" />
        {storedLine}
      </span>
    </p>
  );
}

function EmptyLibrary({ actions }: { actions: StudioActions }) {
  return (
    <section
      aria-labelledby="empty-library"
      className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20"
    >
      <Otto pose="read" size={128} />
      <h2 id="empty-library" className="mt-6 font-sans text-lg/7 font-medium text-ink">
        Your resumes will live here
      </h2>
      <p className="mt-2 max-w-sm text-sm/6 text-muted">
        Upload the one you have and see what hiring software reads, or start a fresh page.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button onClick={actions.upload}>Upload a resume</Button>
        <Button variant="secondary" onClick={actions.scratch}>
          Start from scratch
        </Button>
        <Button variant="ghost" onClick={actions.sample}>
          Try a sample
        </Button>
      </div>
    </section>
  );
}

function LoadingGrid() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading your resumes
      </span>
      <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex flex-col">
            <Skeleton className="h-8 w-28 rounded-t-xl rounded-b-none" />
            <div className="flex flex-col gap-3 rounded-2xl rounded-tl-none bg-surface p-2">
              <div className={cn("rounded-xl bg-surface-muted", WELL_HEIGHT)} />
              <div className="flex flex-col gap-2 px-2 pt-2 pb-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-3 h-9 w-20 rounded-lg" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
