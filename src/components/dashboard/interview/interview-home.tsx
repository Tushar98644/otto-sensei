"use client";

import { MessagesSquare, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { useMe } from "@/components/account/use-me";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
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
import { offerLabel } from "../plan-slip";
import { LazyPrepareDialog } from "./lazy-prepare-dialog";
import { SamplePack } from "./sample-pack";
import { usePrepPacks } from "./use-prep-packs";
import { interviewDayLine, interviewHref, waitingForPrep } from "./view";

const count = new Intl.NumberFormat("en-US");

export function InterviewHome() {
  const now = useNow();
  const packs = usePrepPacks();
  const applications = useApplications();
  const resumes = useResumeList();
  const pro = useProTools();
  const locked = pro === false;
  const { me, loading: planLoading } = useMe();
  const tryPro = offerLabel(me?.billing.trial === true);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [dialog, setDialog] = useState<{ key: number; open: boolean } | null>(null);
  const openings = useRef(0);

  const waiting = useMemo(
    () => (locked ? [] : waitingForPrep(applications.items, packs.items, now)),
    [locked, applications.items, packs.items, now],
  );
  const ready = packs.status === "ready" && applications.status !== "loading";
  const empty = ready && packs.items.length === 0 && waiting.length === 0;

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
              : "For each interview: likely questions, stories from your own lines and what to ask."}
          </p>
        </div>
        {pro === true && ready && !empty ? (
          <Button variant={waiting.length > 0 ? "secondary" : "primary"} onClick={start}>
            <Plus aria-hidden />
            Prepare for a job
          </Button>
        ) : null}
      </header>

      {locked && ready && packs.items.length > 0 ? (
        <OttoNote live={false} message={OTTO.interview.lockedKept}>
          <Button onClick={() => setUpgradeOpen(true)}>{tryPro}</Button>
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
      ) : !ready || (empty && planLoading) ? (
        <LoadingState />
      ) : empty ? (
        locked ? (
          <SamplePack>
            <OttoNote live={false} message={OTTO.interview.locked}>
              <Button onClick={() => setUpgradeOpen(true)}>{tryPro}</Button>
            </OttoNote>
          </SamplePack>
        ) : (
          <EmptyStart>
            <Button onClick={start}>
              <Plus aria-hidden />
              Prepare for a job
            </Button>
          </EmptyStart>
        )
      ) : (
        <>
          {waiting.length > 0 ? (
            <section aria-labelledby="waiting-heading">
              <h2 id="waiting-heading" className="sr-only">
                Interviews without prep
              </h2>
              <FolderCard
                tab="Interviews without prep"
                tabEnd={<Tally value={waiting.length} />}
                bodyClassName="px-4 py-0 sm:px-6"
              >
                <ul className="divide-y divide-border">
                  {waiting.map((application, index) => (
                    <WaitingRow
                      key={application.id}
                      application={application}
                      now={now}
                      first={index === 0}
                    />
                  ))}
                </ul>
              </FolderCard>
            </section>
          ) : null}

          {packs.items.length > 0 ? (
            <section aria-labelledby="packs-heading">
              <h2 id="packs-heading" className="sr-only">
                Your prep
              </h2>
              <FolderCard
                tab="Your prep"
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

      <LazyPrepareDialog
        key={dialog?.key}
        open={dialog?.open ?? false}
        applications={applications.items}
        resumes={resumes}
        packs={packs.items}
        onClose={() => setDialog((current) => current && { ...current, open: false })}
      />
      <LazyUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} feature="letter" />
    </div>
  );
}

// One row needs no count beside it.
function Tally({ value }: { value: number }) {
  if (value < 2) return null;
  return <span className="text-xs text-subtle tabular-nums">{count.format(value)}</span>;
}

function EmptyStart({ children }: { children: ReactNode }) {
  return (
    <section
      aria-labelledby="interview-empty"
      className="flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center sm:py-16"
    >
      <Otto pose="think" size={112} />
      <h2 id="interview-empty" className="mt-6 font-sans text-lg/7 font-medium text-ink">
        Your interview prep will live here
      </h2>
      <p className="mt-2 max-w-sm text-sm/6 text-pretty text-muted">{OTTO.interview.empty}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>
    </section>
  );
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

function WaitingRow({
  application,
  now,
  first,
}: {
  application: Application;
  now: number;
  first: boolean;
}) {
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
        <p className="mt-1 text-xs/5 text-subtle">{interviewDayLine(application.interviewAt, now)}</p>
      </div>
      <Link
        href={interviewHref(application.id, { start: true })}
        aria-describedby={titleId}
        className={buttonClasses({
          variant: first ? "primary" : "secondary",
          size: "sm",
          className: "self-start md:self-auto",
        })}
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
