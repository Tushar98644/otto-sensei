"use client";

import { ArrowLeft, ArrowRight, Lock, Mail, SearchX } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { errorMessage } from "@/components/account/errors";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { saveEmailChoices, useEmailChoices } from "@/components/notifications/use-email-choices";
import { accountSectionHref } from "@/components/setup/links";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { NewResumeMenu } from "../new-resume-menu";
import type { StudioActions } from "../use-studio-actions";
import { JobsArt } from "./jobs-art";
import { splitLead } from "./view";

export function JobsHeader() {
  return (
    <header className="min-w-0">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Jobs
      </h1>
      <p className="mt-2 max-w-prose text-base/7 text-pretty text-muted">
        Open jobs from companies&apos; careers pages and public job feeds, ordered by how closely
        each post matches your resume. Each one links to the original post.
      </p>
    </header>
  );
}

const NUMBER = /(\d[\d,]*)/;

// Numbers in Otto's line read as figures, not words.
function Figures({ text }: { text: string }) {
  return text.split(NUMBER).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="font-medium tabular-nums">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export function JobsSummary({
  tab,
  message,
  meta,
  loading,
  children,
}: {
  tab: string;
  message: string | null;
  meta: string | null;
  loading: boolean;
  children?: ReactNode;
}) {
  const { lead, rest } = splitLead(message ?? "");
  const showArt = message !== null || loading;
  return (
    <FolderCard
      tab={tab}
      className="group/otto motion-safe:animate-fade-in"
      bodyClassName="flex flex-col p-2"
    >
      <div className="flex items-stretch gap-2">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-2 py-2 sm:px-4 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border md:hidden"
            >
              <OttoMark className="size-5" />
            </span>
            <p className="min-w-0 text-sm/5 text-subtle">
              <span className="font-medium text-ink">{BRAND.mascotName}</span>
              {meta ? <span className="tabular-nums"> · {meta}</span> : null}
            </p>
          </div>
          <div aria-live="polite" aria-atomic className="max-w-xl">
            {message ? (
              <p className="text-lg/7 text-pretty text-ink sm:text-xl/8">
                <Figures text={lead} />
                {rest ? (
                  <span className="mt-1 block text-base/7 text-muted">
                    <Figures text={rest} />
                  </span>
                ) : null}
              </p>
            ) : loading ? (
              <div className="flex flex-col gap-2 py-1">
                <Skeleton className="h-5 w-72 max-w-full" />
                <Skeleton className="h-5 w-48 max-w-full" />
              </div>
            ) : null}
          </div>
        </div>
        {showArt ? <JobsArt className="w-72 shrink-0 max-md:hidden" /> : null}
      </div>
      {children ? (
        <div className="mx-2 mt-2 border-t border-border px-0 pt-3 pb-2 sm:px-2">{children}</div>
      ) : null}
    </FolderCard>
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

// Still under the Pro panel: a pulse there would read as loading.
function CardSkeleton({ still = false }: { still?: boolean }) {
  const bar = still ? "animate-none" : undefined;
  return (
    <div aria-hidden className="flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-6">
      <div className="flex gap-3 sm:gap-4">
        <Skeleton className={cn("size-12 shrink-0 rounded-xl", bar)} />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className={cn("h-4 w-24", bar)} />
          <Skeleton className={cn("h-5 w-72 max-w-full", bar)} />
          <Skeleton className={cn("h-4 w-56 max-w-full", bar)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:pl-16">
        <Skeleton className={cn("h-7 w-24 rounded-full", bar)} />
        <Skeleton className={cn("h-7 w-20 rounded-full", bar)} />
        <Skeleton className={cn("h-7 w-28 rounded-full", bar)} />
      </div>
      <div className="flex gap-2 sm:pl-16">
        <Skeleton className={cn("h-9 w-36", bar)} />
        <Skeleton className={cn("h-9 w-20", bar)} />
        <Skeleton className={cn("h-9 w-28", bar)} />
      </div>
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
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function NoFilterMatches({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-4 sm:px-6">
      <p className="flex items-center gap-2.5 text-sm/6 text-muted">
        <SearchX aria-hidden className="size-4 shrink-0 text-subtle" />
        No jobs match these filters.
      </p>
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
    <nav aria-label="Pages" className="mt-2 flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={page <= 1}
        onClick={() => onGo(page - 1)}
        className="[&_svg]:transition-transform hover:[&_svg]:-translate-x-0.5"
      >
        <ArrowLeft aria-hidden />
        Previous
      </Button>
      <p className="text-sm text-subtle tabular-nums">
        Page <span className="font-medium text-ink">{page}</span> of {pages}
      </p>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= pages}
        onClick={() => onGo(page + 1)}
        className="[&_svg]:transition-transform hover:[&_svg]:translate-x-0.5"
      >
        Next
        <ArrowRight aria-hidden />
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
        className="flex flex-col gap-4 mask-[linear-gradient(to_bottom,black,transparent)] opacity-70"
      >
        {[0, 1].map((index) => (
          <CardSkeleton key={index} still />
        ))}
      </div>
      <div className="-mt-28 flex flex-col items-start gap-4 rounded-2xl bg-surface px-4 py-5 shadow-[0_1px_2px_rgb(18_36_29/0.05),0_18px_40px_-20px_rgb(18_36_29/0.3)] ring-1 ring-ink/5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 gap-3.5">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted"
          >
            <Lock className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 id="jobs-more" className="font-sans text-base/6 font-medium text-ink">
              {copy.title}
            </h2>
            <p className="mt-1 max-w-prose text-sm/6 text-pretty text-muted">{copy.body}</p>
          </div>
        </div>
        <Button onClick={() => openUpgradePrompt("jobs")} className="shrink-0 max-sm:w-full">
          {tryPro}
        </Button>
      </div>
    </section>
  );
}

// Asked once: turning it on, or "No thanks", closes it for good (the Account page keeps the switch).
export function WeeklyJobsPrompt({
  userId,
  focusAfter,
}: {
  userId: string;
  focusAfter: RefObject<HTMLElement | null>;
}) {
  const titleId = useId();
  const { data } = useEmailChoices(userId);
  const [on, setOn] = useState(false);
  const doneRef = useRef<HTMLParagraphElement>(null);

  // The pressed button goes away, so focus moves to what replaces it.
  useEffect(() => {
    if (on) doneRef.current?.focus();
  }, [on]);

  if (on) {
    return (
      <p
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl bg-surface px-4 py-4 text-sm/6 text-muted outline-none sm:px-6"
      >
        The weekly jobs email is on. Change it any time in{" "}
        <Link href={accountSectionHref("reminders")} className="font-medium text-ink underline">
          your account settings
        </Link>
        .
      </p>
    );
  }
  if (!data || !data.emailAvailable || data.jobEmails || data.jobPromptClosed) return null;

  // Shown at once; a failed save brings the card back with the reason.
  async function answer(jobEmails: boolean) {
    if (jobEmails) setOn(true);
    else focusAfter.current?.focus();
    try {
      await saveEmailChoices(userId, jobEmails ? { jobEmails: true } : { jobPromptClosed: true });
    } catch (error) {
      setOn(false);
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    }
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col items-start gap-4 rounded-2xl bg-surface px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="flex min-w-0 gap-3.5">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted"
        >
          <Mail className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-sans text-base/6 font-medium text-ink">
            Get new matches by email
          </h2>
          <p className="mt-1 text-sm/6 text-pretty text-muted">
            Once a week, when new jobs match your resume, Otto emails you the closest few. Turn it
            off any time.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => void answer(false)}>
          No thanks
        </Button>
        <Button size="sm" onClick={() => void answer(true)}>
          Email me weekly
        </Button>
      </div>
    </section>
  );
}
