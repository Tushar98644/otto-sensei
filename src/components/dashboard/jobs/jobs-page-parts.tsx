"use client";

import { Lock } from "lucide-react";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewResumeMenu } from "../new-resume-menu";
import type { StudioActions } from "../use-studio-actions";

export function JobsHeader() {
  return (
    <header className="min-w-0">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Jobs
      </h1>
      <p className="mt-2 max-w-prose text-base/7 text-muted">
        Open jobs from company job boards and remote job sites, ordered by how closely each post
        matches your resume. Each one links to the original post.
      </p>
    </header>
  );
}

export function NoResumeYet({ actions }: { actions: StudioActions }) {
  return (
    <div className="flex flex-col gap-8">
      <JobsHeader />
      <section
        aria-labelledby="jobs-empty"
        className="flex flex-col items-center rounded-3xl bg-surface px-6 py-14 text-center sm:py-20"
      >
        <Otto pose="read" size={128} />
        <h2 id="jobs-empty" className="mt-6 font-sans text-lg/7 font-medium text-ink">
          Jobs that fit your resume will show up here
        </h2>
        <p className="mt-2 max-w-sm text-sm/6 text-pretty text-muted">{OTTO.jobs.noResume}</p>
        <div className="mt-6">
          <NewResumeMenu actions={actions} />
        </div>
      </section>
    </div>
  );
}

export function LoadingCards() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading jobs
      </span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          aria-hidden
          className="flex flex-col gap-3 rounded-2xl bg-surface p-4 sm:p-6"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NoFilterMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-5 sm:px-6">
      <p className="text-sm/6 text-muted">No jobs match these filters.</p>
      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

export function JobsPager({
  page,
  pages,
  onGo,
}: {
  page: number;
  pages: number;
  onGo: (page: number) => void;
}) {
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onGo(page - 1)}>
        Previous
      </Button>
      <p className="text-sm text-subtle tabular-nums">
        Page {page} of {pages}
      </p>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onGo(page + 1)}>
        Next
      </Button>
    </nav>
  );
}

export function MoreWithPro({
  copy,
  tryPro,
}: {
  copy: { title: string; body: string };
  tryPro: string;
}) {
  return (
    <section aria-labelledby="jobs-more" className="relative flex flex-col">
      <div
        aria-hidden
        className="flex flex-col gap-4 mask-[linear-gradient(to_bottom,black,transparent)]"
      >
        {[0, 1].map((index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-2xl bg-surface p-4 opacity-70 sm:p-6"
          >
            <div className="h-4 w-32 rounded-full bg-surface-muted" />
            <div className="h-5 w-64 max-w-full rounded-full bg-surface-muted" />
            <div className="h-4 w-48 rounded-full bg-surface-muted" />
          </div>
        ))}
      </div>
      <div className="-mt-16 flex flex-col items-start gap-4 rounded-2xl bg-surface px-4 py-6 shadow-sm ring-1 ring-border sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 gap-3">
          <Lock className="mt-1 size-4 shrink-0 text-subtle" aria-hidden />
          <div className="min-w-0">
            <h2 id="jobs-more" className="text-base/6 font-medium text-ink">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm/6 text-pretty text-muted">{copy.body}</p>
          </div>
        </div>
        <Button onClick={() => openUpgradePrompt("jobs")} className="shrink-0">
          {tryPro}
        </Button>
      </div>
    </section>
  );
}
