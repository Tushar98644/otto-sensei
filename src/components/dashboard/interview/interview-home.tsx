"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useProTools, useTryProLabel } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { useMe } from "@/components/account/use-me";
import { CalendarFeed } from "@/components/calendar/calendar-feed";
import { OTTO } from "@/components/mascot/lines";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FolderCard } from "@/components/ui/folder-card";
import { preload, useLazy } from "@/components/ui/lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { useResumeList } from "@/lib/store/resume-store";
import { cn, pluralize } from "@/lib/utils";
import { dayOffset } from "../applications/board/card/when";
import { prepAllowance } from "../applications/prep/prep-start";
import { useApplications } from "../applications/use-applications";
import { interviewSections } from "../page-code";
import type { PrepareAction } from "./interview-cards";
import { LazyPrepareDialog } from "./lazy-prepare-dialog";
import { usePrepPacks } from "./use-prep-packs";
import { interviewEntries } from "./view";

preload(interviewSections);

type Sections = typeof import("./interview-sections");

const count = new Intl.NumberFormat("en-US");
const TAB_HEADING = "font-sans text-xs/4 font-medium";

function Tally({ value, noun }: { value: number; noun: [string, string] }) {
  return (
    <span className="text-xs text-subtle tabular-nums">
      {count.format(value)} {value === 1 ? noun[0] : noun[1]}
    </span>
  );
}

// Empty and locked states share the featured layout, so they feel like the same place.
function Invitation({
  art: CueCardsArt,
  eyebrow,
  title,
  detail,
  children,
}: {
  art: Sections["CueCardsArt"];
  eyebrow: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="group/art group/otto grid gap-2 motion-safe:animate-fade-in sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[17rem_minmax(0,1fr)]">
      <CueCardsArt className="h-40 sm:h-full sm:min-h-48" />
      <div className="flex min-w-0 flex-col items-start gap-4 px-2 pt-2 pb-2 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
        <div className="flex flex-col gap-2">
          <Eyebrow>{eyebrow}</Eyebrow>
          <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
            {title}
          </p>
          <p className="max-w-prose text-sm/6 text-pretty text-muted">{detail}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

export function InterviewHome() {
  const now = useNow();
  const packs = usePrepPacks();
  const applications = useApplications();
  const resumes = useResumeList();
  const pro = useProTools();
  const locked = pro === false;
  const { me, loading: planLoading } = useMe();
  const tryPro = useTryProLabel();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [dialog, setDialog] = useState<{ key: number; open: boolean } | null>(null);
  const openings = useRef(0);

  const entries = useMemo(
    () => interviewEntries(applications.items, packs.items, now),
    [applications.items, packs.items, now],
  );
  const shown = useMemo(() => new Set(entries.map((entry) => entry.application.id)), [entries]);
  const otherPacks = useMemo(
    () => packs.items.filter((pack) => !shown.has(pack.applicationId)),
    [packs.items, shown],
  );
  const parts = useLazy(interviewSections, true);
  const ready = packs.status === "ready" && applications.status !== "loading" && parts !== null;
  const empty = ready && packs.items.length === 0 && entries.length === 0;
  const action: PrepareAction = { locked, onLocked: () => setUpgradeOpen(true) };
  const allowance = prepAllowance(me?.usage?.letter, me?.period);
  const [first, ...rest] = entries;
  const firstAt = first?.application.interviewAt ?? null;
  const ahead = firstAt !== null && now > 0 && new Date(firstAt).setHours(23, 59, 59, 999) >= now;
  const briefToday =
    Boolean(first?.pack) && firstAt !== null && now > 0 && dayOffset(firstAt, now) === 0;

  function start() {
    if (locked) {
      setUpgradeOpen(true);
      return;
    }
    openings.current += 1;
    setDialog({ key: openings.current, open: true });
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Interview prep
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-pretty text-muted">
            {ready && packs.items.length > 0
              ? `${pluralize(packs.items.length, "prep pack")}, one per job, built from your own resume lines.`
              : "For each job you interview for: likely questions, stories from your own resume lines, and questions to ask them."}
          </p>
        </div>
        {pro === true && ready && !empty ? (
          <Button variant="secondary" onClick={start}>
            <Plus aria-hidden />
            Prepare for a job
          </Button>
        ) : null}
      </header>

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
      ) : !parts || !ready || (empty && planLoading) ? (
        <LoadingState />
      ) : (
        <>
          {locked ? (
            <FolderCard
              tab={<h2 className={TAB_HEADING}>Interview prep</h2>}
              tone="lavender"
              bodyClassName="p-2"
            >
              <Invitation
                art={parts.CueCardsArt}
                eyebrow="Comes with Pro"
                title="Practise every interview before it happens"
                detail={packs.items.length > 0 ? OTTO.interview.lockedKept : OTTO.interview.locked}
              >
                <Button onClick={() => setUpgradeOpen(true)} className="max-sm:flex-1">
                  {tryPro}
                  <ArrowRight aria-hidden />
                </Button>
              </Invitation>
            </FolderCard>
          ) : empty ? (
            <FolderCard
              tab={<h2 className={TAB_HEADING}>Interview prep</h2>}
              tone="lavender"
              bodyClassName="p-2"
            >
              <Invitation
                art={parts.CueCardsArt}
                eyebrow="No interviews yet"
                title="Your next interview, prepped in one click"
                detail="When an application reaches the interview stage, it waits here with a Prepare key. Or prep for any job now from its link."
              >
                <Button onClick={start} className="max-sm:flex-1">
                  <Plus aria-hidden />
                  Prepare for a job
                </Button>
              </Invitation>
            </FolderCard>
          ) : null}

          {first ? (
            <section aria-labelledby="interviews-heading" className="flex flex-col gap-4">
              <FolderCard
                tab={
                  <h2 id="interviews-heading" className={TAB_HEADING}>
                    {ahead ? "Next interview" : "At the interview stage"}
                  </h2>
                }
                tone={locked ? "plain" : "lavender"}
                tabEnd={
                  entries.length > 1 ? (
                    <Tally value={entries.length} noun={["interview", "interviews"]} />
                  ) : null
                }
                bodyClassName="p-2"
              >
                <parts.FeaturedInterview
                  entry={first}
                  now={now}
                  action={action}
                  allowance={allowance}
                />
                {briefToday ? (
                  <parts.TodayBrief
                    applicationId={first.application.id}
                    className="mx-2 mb-2 border-t border-border px-2 pt-5 pb-2 sm:px-4 lg:px-6"
                  />
                ) : null}
              </FolderCard>
              {rest.length > 0 ? (
                <ul
                  aria-label="More interviews"
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {rest.map((entry, index) => (
                    <parts.InterviewTile
                      key={entry.application.id}
                      entry={entry}
                      now={now}
                      action={action}
                      index={index}
                    />
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {first ? (
            <FolderCard
              tab={<h2 className={TAB_HEADING}>In your calendar</h2>}
              bodyClassName="p-4 sm:p-6"
            >
              <CalendarFeed />
            </FolderCard>
          ) : null}

          {otherPacks.length > 0 ? (
            <section aria-labelledby="packs-heading" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <h2 id="packs-heading" className="font-sans text-lg/7 font-medium text-ink">
                  {first ? "More prep packs" : "Your prep packs"}
                </h2>
                <Tally value={otherPacks.length} noun={["pack", "packs"]} />
              </div>
              <ul
                className={cn(
                  "grid gap-x-5 gap-y-8 sm:grid-cols-2",
                  otherPacks.length > 2 && "xl:grid-cols-3",
                )}
              >
                {otherPacks.map((pack, index) => (
                  <parts.PackCard key={pack.applicationId} pack={pack} now={now} index={index} />
                ))}
              </ul>
            </section>
          ) : null}

          {locked && packs.items.length === 0 ? <parts.SamplePack /> : null}
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

function LoadingState() {
  return (
    <div aria-busy className="flex flex-col">
      <span className="sr-only" role="status">
        Loading your interview prep
      </span>
      <Skeleton aria-hidden className="h-8 w-40 rounded-t-xl rounded-b-none" />
      <Skeleton aria-hidden className="h-56 rounded-2xl rounded-tl-none bg-surface" />
    </div>
  );
}
