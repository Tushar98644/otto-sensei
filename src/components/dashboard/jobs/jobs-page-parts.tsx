"use client";

import { Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { errorMessage } from "@/components/account/errors";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoMark } from "@/components/site/otto-mark";
import { saveEmailChoices, useEmailChoices } from "@/components/notifications/use-email-choices";
import { accountSectionHref } from "@/components/setup/links";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { NewResumeMenu } from "../new-resume-menu";
import type { StudioActions } from "../use-studio-actions";

export function JobsHeader({
  message = null,
  loading = false,
}: {
  message?: string | null;
  loading?: boolean;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-3">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Jobs
      </h1>
      {/* Mounted from the skeleton on, so a changed count is read out. */}
      {message || loading ? (
        <div aria-live="polite" aria-atomic>
          {message ? (
            <p className="flex items-start gap-2.5 text-base/7 text-pretty text-muted">
              <span
                aria-hidden
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface ring-1 ring-border"
              >
                <OttoMark className="size-4.5" />
              </span>
              <span>
                <span className="sr-only">Otto: </span>
                {message}
              </span>
            </p>
          ) : (
            <Skeleton className="h-7 w-96 max-w-full rounded-lg" />
          )}
        </div>
      ) : null}
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
        <div key={index} aria-hidden className="flex gap-4 rounded-2xl bg-surface p-5 sm:p-6">
          <Skeleton className="hidden size-10 shrink-0 rounded-xl sm:block" />
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-between">
                <Skeleton className="h-7 w-28 rounded-full" />
                <div className="flex flex-col gap-1.5 py-0.5">
                  <Skeleton className="h-5 w-64 max-w-full" />
                  <Skeleton className="h-4 w-80 max-w-full" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-40 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Otto's line above already says why the list is empty, so this holds only the way back.
export function EmptyListAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div>
      <Button variant="secondary" onClick={onClick}>
        {label}
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
    <section aria-labelledby="jobs-more" className="flex flex-col">
      {/* The edges of the cards Pro would show, stacked behind this one. */}
      <div aria-hidden className="mx-8 h-2 rounded-t-2xl bg-surface/45" />
      <div aria-hidden className="mx-4 h-2 rounded-t-2xl bg-surface/70" />
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-4">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted"
          >
            <Lock className="size-4 text-muted" />
          </span>
          <div className="min-w-0">
            <h2 id="jobs-more" className="font-sans text-base/6 font-semibold text-ink">
              {copy.title}
            </h2>
            <p className="mt-0.5 max-w-prose text-sm/6 text-pretty text-muted">{copy.body}</p>
          </div>
        </div>
        <Button onClick={() => openUpgradePrompt("jobs")} className="w-full shrink-0 sm:w-auto">
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
        className="rounded-2xl bg-surface px-5 py-4 text-sm/6 text-muted outline-none sm:px-6"
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
      className="flex flex-col items-start gap-4 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 gap-4">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted"
        >
          <Mail className="size-4 text-muted" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-sans text-base/6 font-semibold text-ink">
            Get new matches by email
          </h2>
          <p className="mt-0.5 max-w-prose text-sm/6 text-pretty text-muted">
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
