"use client";

import { MessagesSquare, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Application } from "@/lib/applications/schema";
import { applicationHref } from "@/lib/applications/thread";
import type { PrepSummary } from "@/lib/insights/prep";
import { useResumeList } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import { useApplications } from "../applications/use-applications";
import { formatDay } from "../applications/view";
import { PrepareDialog } from "./prepare-dialog";
import { usePrepPacks } from "./use-prep-packs";
import { interviewHref, waitingForPrep } from "./view";

const count = new Intl.NumberFormat("en-US");

// The home for interview prep, which otherwise lives inside one application at a time: every pack
// made so far, the interviews still without one, and a way to start prep for any job.
export function InterviewHome() {
  const now = useNow();
  const packs = usePrepPacks();
  const applications = useApplications();
  const resumes = useResumeList();
  // Prep is AI help, which Free doesn't have. Packs made on Pro or the trial stay readable here.
  const locked = useProTools() === false;
  const tryPro = useTryProLabel();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [dialog, setDialog] = useState<{ key: number; open: boolean } | null>(null);
  const openings = useRef(0);

  const waiting = useMemo(
    () => (locked ? [] : waitingForPrep(applications.items, packs.items)),
    [locked, applications.items, packs.items],
  );
  const ready = packs.status === "ready" && applications.status !== "loading";

  function start() {
    if (locked) {
      setUpgradeOpen(true);
      return;
    }
    openings.current += 1;
    setDialog({ key: openings.current, open: true });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Interview prep
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-muted">
            {ready && packs.items.length > 0
              ? `${pluralize(packs.items.length, "prep pack")}, one per job, built from your own resume lines.`
              : "For each job you interview for: likely questions, stories from your own resume lines, and questions to ask them."}
          </p>
        </div>
        <Button onClick={start}>
          <Plus aria-hidden />
          Prepare for a job
        </Button>
      </header>

      {locked ? (
        <OttoNote live={false} message={OTTO.limit.none("letter", false)}>
          <Button onClick={() => setUpgradeOpen(true)}>{tryPro}</Button>
          {packs.items.length > 0 ? (
            <p className="text-sm/6 text-muted">The prep you made before stays here to read.</p>
          ) : null}
        </OttoNote>
      ) : null}

      {packs.status === "error" ? (
        <Alert
          variant="error"
          title="Your interview prep didn't load"
          action={
            <Button variant="secondary" size="sm" onClick={packs.retry}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : !ready ? (
        <LoadingState />
      ) : packs.items.length === 0 && waiting.length === 0 ? (
        // On Free the note above already says what this is and offers the trial.
        locked ? null : (
          <div className="rounded-2xl bg-surface p-6 sm:p-8">
            <OttoNote live={false} message={OTTO.interview.empty}>
              <Button onClick={start}>
                <Plus aria-hidden />
                Prepare for a job
              </Button>
            </OttoNote>
          </div>
        )
      ) : (
        <>
          {waiting.length > 0 ? (
            <section aria-labelledby="waiting-heading" className="flex flex-col gap-4">
              <h2 id="waiting-heading" className="font-sans text-lg/7 font-medium text-ink">
                Interviews without prep
              </h2>
              <FolderCard
                tab="Interview stage"
                tabEnd={<Tally value={waiting.length} />}
                bodyClassName="px-4 py-0 sm:px-6"
              >
                <ul className="divide-y divide-border">
                  {waiting.map((application) => (
                    <WaitingRow key={application.id} application={application} now={now} />
                  ))}
                </ul>
              </FolderCard>
            </section>
          ) : null}

          {packs.items.length > 0 ? (
            <section aria-labelledby="packs-heading" className="flex flex-col gap-4">
              <h2 id="packs-heading" className="font-sans text-lg/7 font-medium text-ink">
                Your prep
              </h2>
              <FolderCard
                tab="Prep packs"
                tabEnd={<Tally value={packs.items.length} />}
                bodyClassName="px-4 py-0 sm:px-6"
              >
                <ul className="divide-y divide-border">
                  {packs.items.map((pack) => (
                    <PackRow key={pack.applicationId} pack={pack} now={now} />
                  ))}
                </ul>
              </FolderCard>
            </section>
          ) : null}
        </>
      )}

      {dialog ? (
        <PrepareDialog
          key={dialog.key}
          open={dialog.open}
          applications={applications.items}
          resumes={resumes}
          packs={packs.items}
          onClose={() => setDialog({ ...dialog, open: false })}
        />
      ) : null}
      <LazyUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="letter" />
    </div>
  );
}

function Tally({ value }: { value: number }) {
  return <span className="text-xs text-subtle tabular-nums">{count.format(value)}</span>;
}

function PackRow({ pack, now }: { pack: PrepSummary; now: number }) {
  const titleId = useId();
  const meta = [
    pluralize(pack.questions, "question"),
    pluralize(pack.stories, "story", "stories"),
    `Made ${formatDay(pack.createdAt, now)}`,
  ].join(" · ");
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 id={titleId} className="truncate text-base/6 font-medium text-ink">
            {pack.company}
          </h3>
          {/* Made without the AI, from common questions: never mistaken for a real pack. */}
          {pack.demo ? <Badge className="shrink-0">Demo</Badge> : null}
        </div>
        {pack.role ? <p className="truncate text-sm/5 text-muted">{pack.role}</p> : null}
        <p className="mt-1 text-xs/5 text-subtle">{meta}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={interviewHref(pack.applicationId)}
          aria-describedby={titleId}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          Open
        </Link>
        <Link
          href={applicationHref(pack.applicationId)}
          aria-describedby={titleId}
          className={buttonClasses({ variant: "ghost", size: "sm", className: "text-muted hover:text-ink" })}
        >
          Application
        </Link>
      </div>
    </li>
  );
}

function WaitingRow({ application, now }: { application: Application; now: number }) {
  const titleId = useId();
  return (
    <li className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:gap-6">
      <div className="min-w-0 flex-1">
        <h3 id={titleId} className="truncate text-base/6 font-medium text-ink">
          {application.company}
        </h3>
        {application.role ? (
          <p className="truncate text-sm/5 text-muted">{application.role}</p>
        ) : null}
        <p className="mt-1 text-xs/5 text-subtle">
          Moved to interview {formatDay(application.statusChangedAt, now)}
        </p>
      </div>
      <Link
        href={interviewHref(application.id)}
        aria-describedby={titleId}
        className={buttonClasses({ size: "sm", className: "self-start md:self-auto" })}
      >
        <MessagesSquare aria-hidden />
        Prepare
      </Link>
    </li>
  );
}

function LoadingState() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading your interview prep
      </span>
      <Skeleton aria-hidden className="h-8 w-40 rounded-t-xl rounded-b-none" />
      <Skeleton aria-hidden className="h-48 rounded-2xl bg-surface" />
    </div>
  );
}
