"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { errorMessage } from "@/components/account/errors";
import { useSessionUserId } from "@/components/account/session-user";
import { SECTION_SCROLL } from "@/components/settings/sections";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";
import { splitDate } from "@/lib/career-log/month";
import type { LocalDate } from "@/lib/career-log/types";
import type { SettingsChangeBody } from "@/lib/career-log/validation";
import { cn } from "@/lib/utils";
import { browserTimeZone, saveSettings, useCareerLog } from "./use-career-log";

const SEGMENT = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-sm text-muted pointer-coarse:h-11",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
);

type LogWords = Messages["account"]["careerLog"];

// Monday first, as most calendars outside the US show it.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKS = ["first", "second", "third", "fourth", "last"] as const;
const DAY = { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" } as const;
const WEEKDAY = { weekday: "long", timeZone: "UTC" } as const;

// "Mon, Nov 3", as lib/career-log/month's dayLabel writes it in English.
function dayLabel(format: Format, date: LocalDate): string {
  const { year, month, day } = splitDate(date);
  return format.date(Date.UTC(year, month - 1, day), DAY);
}

// 4 Jan 1970 was a Sunday, so weekday 0 to 6 lands on Sunday to Saturday.
function weekdayName(format: Format, weekday: number): string {
  return format.date(Date.UTC(1970, 0, 4 + weekday), WEEKDAY);
}

function savedTitle(words: LogWords, change: SettingsChangeBody): string {
  if (change.checkins !== undefined) return change.checkins ? words.checkinsOn : words.checkinsOff;
  if (change.emails !== undefined) return change.emails ? words.emailsOn : words.emailsOff;
  if (change.pauseMonths !== undefined) {
    return change.pauseMonths === 0 ? words.resumed : words.paused;
  }
  return words.daySaved;
}

// In Account: free on every plan, so it shows for everyone.
export function CareerLogSettingsCard() {
  const account = useMessages("account");
  const words = account.careerLog;
  const format = useFormat();
  const userId = useSessionUserId();
  const titleId = useId();
  const ids = useId();
  const query = useCareerLog(userId);
  if (!userId) return null;
  const data = query.data;

  async function save(change: SettingsChangeBody) {
    if (!userId) return;
    try {
      await saveSettings(userId, change);
      toast({ title: savedTitle(words, change), variant: "success" });
    } catch (error) {
      toast({ title: account.saveFailed, description: errorMessage(error), variant: "error" });
    }
  }

  const settings = data?.settings;
  return (
    <Card
      id={ACCOUNT_SECTIONS.careerLog}
      aria-labelledby={titleId}
      role="region"
      className={SECTION_SCROLL}
    >
      <CardHeader>
        <CardTitle as="h3" id={titleId}>
          {words.title}
        </CardTitle>
        <CardDescription>{words.intro}</CardDescription>
      </CardHeader>
      {settings && data ? (
        <div className="flex flex-col gap-5">
          <Toggle
            words={words}
            label={words.monthly}
            hint={words.monthlyHint}
            value={settings.checkins}
            onChange={(checkins) =>
              void save(checkins ? { checkins, timeZone: browserTimeZone() } : { checkins })
            }
          />
          {settings.checkins ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-col gap-0.5">
                  <span id={`${ids}-day`} className="text-sm font-medium text-ink">
                    {words.askOn}
                  </span>
                  <span className="text-sm text-muted">
                    {settings.nextCheckinOn
                      ? fmt(words.next, { day: dayLabel(format, settings.nextCheckinOn) })
                      : words.onceAMonth}
                  </span>
                </div>
                <div
                  role="group"
                  aria-labelledby={`${ids}-day`}
                  className="grid grid-cols-2 gap-2 sm:w-72"
                >
                  <Select
                    aria-label={words.week}
                    value={String(settings.day.week)}
                    onChange={(event) =>
                      void save({
                        day: { week: Number(event.target.value), weekday: settings.day.weekday },
                        timeZone: browserTimeZone(),
                      })
                    }
                  >
                    {WEEKS.map((name, index) => (
                      <option key={name} value={index + 1}>
                        {words.weeks[name]}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label={words.weekday}
                    value={String(settings.day.weekday)}
                    onChange={(event) =>
                      void save({
                        day: { week: settings.day.week, weekday: Number(event.target.value) },
                        timeZone: browserTimeZone(),
                      })
                    }
                  >
                    {WEEKDAY_ORDER.map((weekday) => (
                      <option key={weekday} value={weekday}>
                        {weekdayName(format, weekday)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-col gap-0.5">
                  <label htmlFor={`${ids}-pause`} className="text-sm font-medium text-ink">
                    {words.pause}
                  </label>
                  <span className="text-sm text-muted">
                    {settings.pausedUntil
                      ? fmt(words.pausedUntil, { day: dayLabel(format, settings.pausedUntil) })
                      : words.busy}
                  </span>
                </div>
                <Select
                  id={`${ids}-pause`}
                  value={settings.pausedUntil ? "paused" : "0"}
                  onChange={(event) => {
                    const months = Number(event.target.value);
                    if (months === 0 || months === 1 || months === 3)
                      void save({ pauseMonths: months });
                  }}
                  className="sm:w-72"
                >
                  {settings.pausedUntil ? (
                    <option value="paused" disabled>
                      {fmt(words.pausedOption, { day: dayLabel(format, settings.pausedUntil) })}
                    </option>
                  ) : null}
                  <option value="0">
                    {settings.pausedUntil ? words.resumeNow : words.notPaused}
                  </option>
                  <option value="1">{words.pauseMonth}</option>
                  <option value="3">{words.pauseThree}</option>
                </Select>
              </div>
              {data.emailAvailable ? (
                <Toggle
                  words={words}
                  label={words.email}
                  hint={words.emailHint}
                  value={settings.emails}
                  onChange={(emails) => void save({ emails })}
                />
              ) : null}
            </>
          ) : null}
          <div className="border-t border-border pt-4">
            <Link
              href={CAREER_LOG_ROUTE}
              className="group inline-flex items-center gap-1 text-sm font-medium text-ink"
            >
              {words.open}
              <ArrowRight
                aria-hidden
                className="size-4 text-muted transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
      ) : query.isError && query.fetchStatus === "idle" ? (
        <Alert
          variant="error"
          title={words.loadFailed}
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              {account.tryAgain}
            </Button>
          }
        >
          {account.checkConnection}
        </Alert>
      ) : (
        <Skeleton className="h-11 w-full" />
      )}
    </Card>
  );
}

function Toggle({
  words,
  label,
  hint,
  value,
  onChange,
}: {
  words: LogWords;
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-medium text-ink">
          {label}
        </span>
        <span id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 sm:w-48"
      >
        {[
          { on: true, label: words.on },
          { on: false, label: words.off },
        ].map((choice) => (
          <label key={choice.label} className={SEGMENT}>
            <input
              type="radio"
              name={`${id}-choice`}
              className="sr-only"
              checked={value === choice.on}
              onChange={() => onChange(choice.on)}
            />
            {choice.label}
          </label>
        ))}
      </div>
    </div>
  );
}
