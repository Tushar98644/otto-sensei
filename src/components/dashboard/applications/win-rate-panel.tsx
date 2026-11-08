"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ROUTES } from "@/components/site/routes";
import { useNow } from "@/components/studio/use-now";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { NO_REPLY_AFTER_DAYS, waitingTooLong } from "@/lib/applications/nudge";
import {
  countsLine,
  formatCount,
  interviewRate,
  MIN_FOR_RATE,
  swingNote,
  tally,
} from "@/lib/applications/stats";
import { useApplications } from "./use-applications";

// The dashboard home's short version of the win rate: the counts, the rate once there are
// enough applications, and a way to the full page.
export function WinRatePanel() {
  const now = useNow();
  const { status, items } = useApplications();
  const counts = useMemo(() => tally(items), [items]);
  const stale = useMemo(() => (now === 0 ? 0 : waitingTooLong(items, now).length), [items, now]);
  const rate = interviewRate(counts);

  return (
    <FolderCard
      data-tour="dashboard-win-rate"
      tab="Win rate"
      tabEnd={
        <Link
          href={ROUTES.dashboardApplications}
          className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
        >
          Applications
          <ArrowRight
            aria-hidden
            className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      }
      bodyClassName="p-5 sm:p-6"
    >
      {status === "loading" ? (
        <div aria-hidden className="flex flex-col gap-2">
          <Skeleton className="h-6 w-64 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
      ) : status === "error" ? (
        <p className="text-sm/6 text-muted">
          Your applications didn&apos;t load. Open Applications to try again.
        </p>
      ) : counts.applications === 0 ? (
        <div>
          <p className="text-base/6 font-medium text-ink">See which resume gets interviews</p>
          <p className="mt-1 text-sm/6 text-pretty text-muted">
            Log the jobs you apply to and the version you sent. Only your own numbers, never an
            average from anyone else.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-prose min-w-0">
            <p className="text-base/6 font-medium text-ink">{countsLine(counts)}</p>
            <p className="mt-1 text-sm/6 text-pretty text-muted">{swingNote(counts)}</p>
            {stale > 0 ? (
              <p className="mt-1 text-sm/6 text-muted">
                {formatCount(stale, "application has", "applications have")} had no reply in{" "}
                {NO_REPLY_AFTER_DAYS / 7} weeks.
              </p>
            ) : null}
          </div>
          {rate.shown ? (
            <p className="flex items-baseline gap-2 text-sm/5 text-muted">
              <span className="font-display text-4xl/10 font-normal text-ink lining-nums tabular-nums">
                {rate.percent}%
              </span>
              interview rate
            </p>
          ) : (
            <p className="text-sm/5 text-subtle">
              Rate shows from {MIN_FOR_RATE} applications · {rate.needed} to go
            </p>
          )}
        </div>
      )}
    </FolderCard>
  );
}
