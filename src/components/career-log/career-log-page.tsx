"use client";

import { Download, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useSessionUserId } from "@/components/account/session-user";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { careerLogText } from "@/lib/career-log/export";
import { checkinPath } from "@/lib/career-log/links";
import { addMonths, monthLabel } from "@/lib/career-log/month";
import { coveredMonth, localDate } from "@/lib/career-log/schedule";
import type { CareerLogEntry, Month } from "@/lib/career-log/types";
import { CheckinFolder } from "./checkin-folder";
import { EntryCard } from "./entry-card";
import { LinesFolder } from "./lines-folder";
import {
  browserTimeZone,
  deleteEntry,
  hideEntry,
  restoreEntry,
  useCareerLog,
} from "./use-career-log";

const ADD_MONTHS_BACK = 36;

function download(entries: readonly CareerLogEntry[], today: string): void {
  const blob = new Blob([careerLogText(entries, today)], { type: "text/plain;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `career-log-${today}.txt`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

// A month being added sits in its place in the list from the start, so saving it never redraws the editor.
function listed(entries: readonly CareerLogEntry[], adding: Month | null): Month[] {
  const months = entries.map((entry) => entry.month);
  if (adding && !months.includes(adding)) months.push(adding);
  return months.sort().reverse();
}

export function CareerLogPage() {
  const userId = useSessionUserId();
  const now = useNow();
  const query = useCareerLog(userId);
  const [adding, setAdding] = useState<Month | null>(null);
  const data = query.data;
  const timeZone = data?.settings.timeZone ?? browserTimeZone() ?? "UTC";
  const today = now === 0 ? null : localDate(timeZone, now);
  const entries = useMemo(() => data?.entries ?? [], [data]);

  function remove(month: Month) {
    if (!userId) return;
    const entry = hideEntry(userId, month);
    if (!entry) return;
    undoToast({
      title: `${monthLabel(month)} deleted`,
      onUndo: () => restoreEntry(userId, entry),
      onCommit: () => {
        deleteEntry(userId, month).catch((error: unknown) => {
          restoreEntry(userId, entry);
          toast({
            title: "Couldn't delete it",
            description: errorMessage(error),
            variant: "error",
          });
        });
      },
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
            Career log
          </h1>
          <p className="mt-2 max-w-prose text-base/7 text-pretty text-muted">
            A one-minute note each month on what you shipped. Free on every plan, so your next
            resume writes itself.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          {entries.length > 0 && today ? (
            <Button
              variant="ghost"
              onClick={() => download(entries, today)}
              className="max-sm:flex-1"
            >
              <Download aria-hidden />
              Download
            </Button>
          ) : null}
          <Link
            href={checkinPath(today ? coveredMonth(today) : null)}
            className={buttonClasses({ className: "max-sm:flex-1" })}
          >
            <PenLine aria-hidden />
            Write this month
          </Link>
        </div>
      </header>

      {query.isError && !data ? (
        <Alert
          variant="error"
          title="Your career log didn't load"
          action={
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : data && userId && today ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <CheckinFolder
              userId={userId}
              settings={data.settings}
              emailAvailable={data.emailAvailable}
              today={today}
            />
            <LinesFolder entries={entries} />
          </div>

          <FolderCard
            tab="Your months"
            tabEnd={
              <span className="text-xs text-subtle tabular-nums">
                {entries.length} {entries.length === 1 ? "month" : "months"}
              </span>
            }
            bodyClassName="px-4 py-2 sm:px-6"
          >
            <AddMonth
              thisMonth={today.slice(0, 7)}
              taken={entries.map((entry) => entry.month)}
              onAdd={setAdding}
            />
            <ul className="divide-y divide-border">
              {listed(entries, adding).map((month) => (
                <li key={month}>
                  <EntryCard
                    userId={userId}
                    month={month}
                    entry={entries.find((entry) => entry.month === month) ?? null}
                    editing={adding === month}
                    onDone={() => setAdding(null)}
                    onDelete={() => remove(month)}
                  />
                </li>
              ))}
            </ul>
            {entries.length === 0 && !adding ? (
              <div className="flex flex-col items-start gap-3 py-6">
                <p className="max-w-prose text-sm/6 text-pretty text-muted">
                  Nothing here yet. Write about this month, or add an earlier one you remember.
                </p>
                <Link
                  href={checkinPath(coveredMonth(today))}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  Write this month&apos;s note
                </Link>
              </div>
            ) : null}
          </FolderCard>
        </>
      ) : (
        <LogSkeleton />
      )}
    </div>
  );
}

function AddMonth({
  thisMonth,
  taken,
  onAdd,
}: {
  thisMonth: Month;
  taken: readonly Month[];
  onAdd: (month: Month) => void;
}) {
  const id = useId();
  const open = Array.from({ length: ADD_MONTHS_BACK }, (_, index) =>
    addMonths(thisMonth, -index),
  ).filter((month) => !taken.includes(month));
  const [month, setMonth] = useState<Month>("");
  const chosen = open.includes(month) ? month : (open[0] ?? "");
  if (open.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between">
      <label htmlFor={id} className="text-sm/6 text-muted">
        Add a month you remember
      </label>
      <div className="flex gap-2">
        <Select
          id={id}
          value={chosen}
          onChange={(event) => setMonth(event.target.value)}
          className="min-w-0 flex-1 sm:w-52"
        >
          {open.map((option) => (
            <option key={option} value={option}>
              {monthLabel(option)}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={() => chosen && onAdd(chosen)}>
          <Plus aria-hidden />
          Add
        </Button>
      </div>
    </div>
  );
}

function LogSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading your career log
      </span>
      <div aria-hidden className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl bg-surface" />
        <Skeleton className="h-64 rounded-2xl bg-surface" />
      </div>
      <Skeleton aria-hidden className="h-72 rounded-2xl bg-surface" />
    </div>
  );
}
