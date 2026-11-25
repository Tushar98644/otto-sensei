"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { OttoCheer } from "@/components/mascot/otto-cheer";
import { useNow } from "@/components/studio/use-now";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";
import { addMonths, dayLabel, monthLabel, monthName, shortMonth } from "@/lib/career-log/month";
import { coveredMonth, localDate } from "@/lib/career-log/schedule";
import type { CareerLogEntry, LocalDate, Month } from "@/lib/career-log/types";
import { EntryFields } from "./entry-fields";
import { NotebookArt } from "./log-art";
import { SaveStatus } from "./save-status";
import { browserTimeZone, useCareerLog } from "./use-career-log";
import { useEntryDraft } from "./use-entry-draft";

const MONTHS_BACK = 12;

export function CheckinPage({ month: linked }: { month: Month | null }) {
  const userId = useSessionUserId();
  const now = useNow();
  const query = useCareerLog(userId);
  const [picked, setPicked] = useState<Month | null>(null);
  const timeZone = query.data?.settings.timeZone ?? browserTimeZone() ?? "UTC";
  const thisMonth = now === 0 ? null : localDate(timeZone, now).slice(0, 7);
  const fallback = now === 0 ? null : coveredMonth(localDate(timeZone, now));
  const month = picked ?? linked ?? fallback;
  const t = useMessages("careerLog");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href={CAREER_LOG_ROUTE}
        className="group inline-flex w-fit items-center gap-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        {t.title}
      </Link>
      {query.isError && !query.data ? (
        <Alert
          variant="error"
          title={t.checkinPage.loadFailed}
          action={
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              {t.tryAgain}
            </Button>
          }
        >
          {t.checkConnection}
        </Alert>
      ) : query.data && month && thisMonth ? (
        <Checkin
          key={month}
          userId={userId}
          month={month}
          thisMonth={thisMonth}
          entry={query.data.entries.find((item) => item.month === month) ?? null}
          next={query.data.settings.checkins ? query.data.settings.nextCheckinOn : null}
          onPick={setPicked}
        />
      ) : (
        <CheckinSkeleton />
      )}
    </div>
  );
}

function Checkin({
  userId,
  month,
  thisMonth,
  entry,
  next,
  onPick,
}: {
  userId: string | null;
  month: Month;
  thisMonth: Month;
  entry: CareerLogEntry | null;
  next: LocalDate | null;
  onPick: (month: Month) => void;
}) {
  const draft = useEntryDraft(userId, month, entry);
  const [done, setDone] = useState(false);
  const pickId = useId();
  const words = useMessages("careerLog");
  const t = words.checkinPage;
  const format = useFormat();
  const months = Array.from({ length: MONTHS_BACK }, (_, index) => addMonths(thisMonth, -index));
  if (!months.includes(month)) months.push(month);

  async function finish(nothingNew: boolean) {
    await (nothingNew ? draft.markNothingNew() : draft.flush());
    setDone(true);
  }

  if (done && draft.state !== "error") {
    return (
      <Done month={month} nothingNew={draft.empty} next={next} onEdit={() => setDone(false)} />
    );
  }

  return (
    <>
      <header className="flex flex-col gap-2">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 className="font-display text-4xl/10 font-normal tracking-tight text-pretty text-ink sm:text-5xl/13">
          {fmt(words.home.title, { month: monthName(month, format) })}
        </h1>
        <p className="max-w-prose text-base/7 text-pretty text-muted">{t.intro}</p>
      </header>

      <section
        aria-label={fmt(t.note, { month: monthLabel(month, format) })}
        className="flex flex-col gap-6 rounded-3xl bg-surface p-4 sm:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-6">
          <NotebookArt label={shortMonth(month, format)} className="h-32" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor={pickId} className="text-sm font-medium text-muted">
              {t.writingAbout}
            </label>
            <Select
              id={pickId}
              value={month}
              onChange={(event) => onPick(event.target.value)}
              className="sm:max-w-56"
            >
              {months.map((option) => (
                <option key={option} value={option}>
                  {monthLabel(option, format)}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-sm/6 text-pretty text-subtle">{t.rough}</p>
          </div>
        </div>

        <EntryFields
          draft={draft.draft}
          onChange={draft.change}
          onBlur={() => void draft.flush()}
          numbered
        />

        <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <SaveStatus state={draft.state} onRetry={() => void draft.flush()} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {draft.empty ? (
              <Button
                variant="secondary"
                onClick={() => void finish(true)}
                className="max-sm:w-full"
              >
                {t.nothingNew}
              </Button>
            ) : null}
            <Button
              onClick={() => void finish(false)}
              disabled={draft.empty}
              className="max-sm:w-full"
            >
              <Check aria-hidden />
              {words.entry.done}
            </Button>
          </div>
        </div>
      </section>

      <p className="text-sm/6 text-pretty text-subtle">{t.free}</p>
    </>
  );
}

function Done({
  month,
  nothingNew,
  next,
  onEdit,
}: {
  month: Month;
  nothingNew: boolean;
  next: LocalDate | null;
  onEdit: () => void;
}) {
  const words = useMessages("careerLog");
  const t = words.checkinPage;
  const format = useFormat();
  const again = next ? fmt(words.askAgain, { day: dayLabel(next, format) }) : words.seeYou;
  return (
    <section
      aria-labelledby="checkin-done"
      className="flex flex-col items-center rounded-3xl bg-surface px-6 py-12 text-center sm:py-16"
    >
      <OttoCheer />
      <h1
        id="checkin-done"
        tabIndex={-1}
        className="mt-5 font-display text-3xl/9 font-normal tracking-tight text-pretty text-ink outline-none sm:text-4xl/10"
      >
        {nothingNew ? t.notedNothing : fmt(t.inYourLog, { month: monthName(month, format) })}
      </h1>
      <p role="status" className="mt-2 max-w-sm text-base/7 text-pretty text-muted">
        {nothingNew ? again : fmt(t.savedAgain, { again })}
      </p>
      <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
        <Link href={CAREER_LOG_ROUTE} className={buttonClasses({ className: "max-sm:w-full" })}>
          {t.seeLog}
        </Link>
        <Button variant="ghost" onClick={onEdit} className="max-sm:w-full">
          {t.editMonth}
        </Button>
      </div>
    </section>
  );
}

function CheckinSkeleton() {
  const t = useMessages("careerLog").checkinPage;
  return (
    <div aria-busy className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        {t.loading}
      </span>
      <div aria-hidden className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-12 w-80 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Skeleton aria-hidden className="h-112 rounded-3xl bg-surface" />
    </div>
  );
}
