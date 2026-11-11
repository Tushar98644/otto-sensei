"use client";

import { useId } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { FOLLOW_UP_DAY_CHOICES, SNOOZE_DAYS } from "@/lib/applications/follow-up";
import type { ReminderSettings } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";
import { saveReminderSettings, useReminderSettings } from "./use-reminder-settings";

// Native radios under the segmented look, so arrow keys and screen readers behave as usual.
const SEGMENT = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-sm text-muted pointer-coarse:h-11",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
);

// Marking a job applied always sets a reminder in the bell; these only set the delay and email
// (hidden when this server can't send email). Signed-out visitors see nothing.
export function ReminderSettingsCard() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const titleId = useId();
  const query = useReminderSettings(userId);

  if (!userId) return null;
  const settings = query.data;

  // Shows at once; put back with a note if the server says no.
  async function save(change: Partial<ReminderSettings>) {
    if (!userId) return;
    try {
      const res = await saveReminderSettings(userId, change);
      toast({
        title:
          change.followUpDays !== undefined
            ? `Reminders now come ${res.followUpDays} days after you apply.`
            : res.emailReminders
              ? "Reminder emails are on."
              : "Reminder emails are off.",
        variant: "success",
      });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    }
  }

  return (
    <Card id="reminders" aria-labelledby={titleId} role="region" className="scroll-mt-24">
      <CardHeader>
        <CardTitle as="h2" id={titleId}>
          Reminders
        </CardTitle>
        <CardDescription>
          When you mark a job applied, Otto sets a reminder to follow up and shows it in the bell
          on your dashboard. Each one has Done and Snooze {SNOOZE_DAYS} days.
        </CardDescription>
      </CardHeader>
      {settings ? (
        <div className="flex flex-col gap-5">
          <DelayChoice
            value={settings.followUpDays}
            onChange={(followUpDays) => void save({ followUpDays })}
          />
          {settings.emailAvailable ? (
            <EmailChoice
              value={settings.emailReminders}
              onChange={(emailReminders) => void save({ emailReminders })}
            />
          ) : null}
        </div>
      ) : query.isError && query.fetchStatus === "idle" ? (
        <Alert
          variant="error"
          title="Couldn't load your reminder settings"
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
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
  // A value set some other way (an older choice list) still shows as itself.
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

function EmailChoice({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <span id={`${id}-label`} className="text-sm font-medium text-ink">
          Email me too
        </span>
        <span id={`${id}-hint`} className="text-sm text-muted">
          Off until you turn it on. At most one email a day, with one-click Done, Snooze and
          Unsubscribe.
        </span>
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-hint`}
        className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 sm:w-48"
      >
        {[
          { on: true, label: "On" },
          { on: false, label: "Off" },
        ].map((choice) => (
          <label key={choice.label} className={SEGMENT}>
            <input
              type="radio"
              name={`${id}-email`}
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
