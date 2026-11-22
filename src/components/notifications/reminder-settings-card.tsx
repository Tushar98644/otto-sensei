"use client";

import { useId } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
import { CalendarFeed } from "@/components/calendar/calendar-feed";
import { SECTION_SCROLL } from "@/components/settings/sections";
import { ACCOUNT_SECTIONS } from "@/components/setup/links";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { FOLLOW_UP_DAY_CHOICES, SNOOZE_DAYS } from "@/lib/applications/follow-up";
import type { ReminderSettings } from "@/lib/notifications/types";
import { saveReminderSettings, useReminderSettings } from "./use-reminder-settings";

// Account's "Reminders" group: these settings, then the calendar link.
export function ReminderSettingsCard() {
  return (
    <>
      <RemindersCard />
      <CalendarCard />
    </>
  );
}

function CalendarCard() {
  const titleId = useId();
  return (
    <Card id="calendar" aria-labelledby={titleId} role="region" className={SECTION_SCROLL}>
      <CardHeader className="sr-only">
        <CardTitle as="h3" id={titleId}>
          Calendar
        </CardTitle>
      </CardHeader>
      <CalendarFeed renewable />
    </Card>
  );
}

function RemindersCard() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const titleId = useId();
  const query = useReminderSettings(userId);

  if (!userId) return null;
  const settings = query.data;

  async function save(change: Pick<ReminderSettings, "followUpDays">) {
    if (!userId) return;
    try {
      const res = await saveReminderSettings(userId, change);
      toast({
        title: `Reminders now come ${res.followUpDays} days after you apply.`,
        variant: "success",
      });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    }
  }

  return (
    <Card
      id={ACCOUNT_SECTIONS.reminders}
      aria-labelledby={titleId}
      role="region"
      className={SECTION_SCROLL}
    >
      <CardHeader>
        <CardTitle as="h3" id={titleId}>
          Follow-up reminders
        </CardTitle>
        <CardDescription>
          When you mark a job applied, Otto sets a reminder to follow up and shows it in the bell on
          your dashboard, with Done and Snooze {SNOOZE_DAYS} days. The day before an interview and
          on its morning, Otto reminds you there too, and the morning after asks how it went. New
          matches and views of your links show there as well.
        </CardDescription>
      </CardHeader>
      {settings ? (
        <div className="flex flex-col gap-5">
          <DelayChoice
            value={settings.followUpDays}
            onChange={(followUpDays) => void save({ followUpDays })}
          />
        </div>
      ) : query.isError && query.fetchStatus === "idle" ? (
        <Alert
          variant="error"
          title="Couldn't load your reminder settings"
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

function DelayChoice({ value, onChange }: { value: number; onChange: (days: number) => void }) {
  const id = useId();
  const choices = [...new Set<number>([...FOLLOW_UP_DAY_CHOICES, value])].sort((a, b) => a - b);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          Remind me to follow up after
        </label>
        <span className="text-sm text-muted">Counted from the day you applied.</span>
      </div>
      <Select
        id={id}
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="sm:w-48"
      >
        {choices.map((days) => (
          <option key={days} value={days}>
            {days} days
          </option>
        ))}
      </Select>
    </div>
  );
}
