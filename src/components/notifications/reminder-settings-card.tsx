"use client";

import { useEffect, useId, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { FOLLOW_UP_DAY_CHOICES, SNOOZE_DAYS } from "@/lib/applications/follow-up";
import type { ReminderSettings } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type Settings = ReminderSettings & { emailAvailable: boolean };

type Load =
  | { userId: string; status: "loading" }
  | { userId: string; status: "error" }
  | { userId: string; status: "ready"; settings: Settings };

// Native radios under the segmented look, so arrow keys and screen readers behave as usual.
const SEGMENT = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-sm text-muted pointer-coarse:h-11",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
  "has-disabled:cursor-default has-disabled:opacity-60",
);

// The Account page's reminder defaults. Marking a job applied always sets a reminder in the bell;
// these only change after how many days, and whether it is emailed too (off until turned on; the
// switch is hidden when this server can't send email). Every change saves at once. Signed-out
// visitors see nothing: the account view above already asks them to sign in.
export function ReminderSettingsCard() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const titleId = useId();
  const [load, setLoad] = useState<Load | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    api
      .reminderSettings()
      .then((res) => {
        if (!cancelled) {
          setLoad({ userId, status: "ready", settings: settingsFrom(res) });
        }
      })
      .catch(() => {
        if (!cancelled) setLoad({ userId, status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  if (!userId) return null;
  // A result for another account (signed in as someone else since) counts as still loading.
  const current: Load = load?.userId === userId ? load : { userId, status: "loading" };

  async function save(change: Partial<ReminderSettings>) {
    if (current.status !== "ready" || saving) return;
    const before = current.settings;
    setSaving(true);
    setLoad({ userId: current.userId, status: "ready", settings: { ...before, ...change } });
    try {
      const res = await api.saveReminderSettings(change);
      setLoad({ userId: current.userId, status: "ready", settings: settingsFrom(res) });
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
      setLoad({ userId: current.userId, status: "ready", settings: before });
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(false);
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
      {current.status === "loading" ? (
        <Skeleton className="h-11 w-full" />
      ) : current.status === "error" ? (
        <Alert
          variant="error"
          title="Couldn't load your reminder settings"
          action={
            <Button
              variant="outline"
              onClick={() => {
                setLoad(null);
                setAttempt((count) => count + 1);
              }}
            >
              Try again
            </Button>
          }
        >
          Check your connection, then try again.
        </Alert>
      ) : (
        <div className="flex flex-col gap-5">
          <DelayChoice
            value={current.settings.followUpDays}
            disabled={saving}
            onChange={(followUpDays) => void save({ followUpDays })}
          />
          {current.settings.emailAvailable ? (
            <EmailChoice
              value={current.settings.emailReminders}
              disabled={saving}
              onChange={(emailReminders) => void save({ emailReminders })}
            />
          ) : null}
        </div>
      )}
    </Card>
  );
}

function settingsFrom(res: Settings): Settings {
  return {
    emailReminders: res.emailReminders,
    followUpDays: res.followUpDays,
    emailAvailable: res.emailAvailable,
  };
}

function DelayChoice({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (days: number) => void;
}) {
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
        disabled={disabled}
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
  disabled,
  onChange,
}: {
  value: boolean;
  disabled: boolean;
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
        aria-busy={disabled || undefined}
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
              disabled={disabled}
              onChange={() => onChange(choice.on)}
            />
            {choice.label}
          </label>
        ))}
      </div>
    </div>
  );
}
