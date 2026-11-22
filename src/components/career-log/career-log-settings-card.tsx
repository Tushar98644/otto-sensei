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
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";
import { dayLabel } from "@/lib/career-log/month";
import { WEEK_NAMES, WEEKDAY_NAMES } from "@/lib/career-log/schedule";
import type { SettingsChangeBody } from "@/lib/career-log/validation";
import { cn } from "@/lib/utils";
import { browserTimeZone, saveSettings, useCareerLog } from "./use-career-log";

const SEGMENT = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-sm text-muted pointer-coarse:h-11",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
);

// Monday first, as most calendars outside the US show it.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function savedTitle(change: SettingsChangeBody): string {
  if (change.checkins !== undefined) {
    return change.checkins ? "Monthly check-ins are on." : "Monthly check-ins are off.";
  }
  if (change.emails !== undefined) {
    return change.emails ? "Check-in emails are on." : "Check-in emails are off.";
  }
  if (change.pauseMonths !== undefined) {
    return change.pauseMonths === 0 ? "Check-ins are back on." : "Check-ins are paused.";
  }
  return "Check-in day saved.";
}

// In Account: free on every plan, so it shows for everyone.
export function CareerLogSettingsCard() {
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
      toast({ title: savedTitle(change), variant: "success" });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
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
          Career log
        </CardTitle>
        <CardDescription>
          A one-minute note each month on what you shipped, so your next resume writes itself. Free
          on every plan, even if you stop paying.
        </CardDescription>
      </CardHeader>
      {settings && data ? (
        <div className="flex flex-col gap-5">
          <Toggle
            label="Monthly check-in"
            hint="Three quick questions once a month, in the bell and on Home. Off until you turn it on."
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
                    Ask me on
                  </span>
                  <span className="text-sm text-muted">
                    {settings.nextCheckinOn
                      ? `Next: ${dayLabel(settings.nextCheckinOn)}.`
                      : "Once a month."}
                  </span>
                </div>
                <div
                  role="group"
                  aria-labelledby={`${ids}-day`}
                  className="grid grid-cols-2 gap-2 sm:w-72"
                >
                  <Select
                    aria-label="Week of the month"
                    value={String(settings.day.week)}
                    onChange={(event) =>
                      void save({
                        day: { week: Number(event.target.value), weekday: settings.day.weekday },
                        timeZone: browserTimeZone(),
                      })
                    }
                  >
                    {WEEK_NAMES.map((name, index) => (
                      <option key={name} value={index + 1}>
                        The {name}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label="Day of the week"
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
                        {WEEKDAY_NAMES[weekday]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex flex-col gap-0.5">
                  <label htmlFor={`${ids}-pause`} className="text-sm font-medium text-ink">
                    Pause
                  </label>
                  <span className="text-sm text-muted">
                    {settings.pausedUntil
                      ? `Paused until ${dayLabel(settings.pausedUntil)}.`
                      : "Busy month? Skip a check-in or three."}
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
                      Paused until {dayLabel(settings.pausedUntil)}
                    </option>
                  ) : null}
                  <option value="0">{settings.pausedUntil ? "Resume now" : "Not paused"}</option>
                  <option value="1">Pause for a month</option>
                  <option value="3">Pause for 3 months</option>
                </Select>
              </div>
              {data.emailAvailable ? (
                <Toggle
                  label="Check-in email"
                  hint="One short email on the day, never more than one a month. The bell and Home ask either way."
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
              Open your career log
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
          title="Couldn't load your career log settings"
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : (
        <Skeleton className="h-11 w-full" />
      )}
    </Card>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
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
          { on: true, label: "On" },
          { on: false, label: "Off" },
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
