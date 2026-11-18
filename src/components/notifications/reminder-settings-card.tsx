"use client";

import { useId } from "react";
import { errorMessage } from "@/components/account/errors";
import { useMe } from "@/components/account/use-me";
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
import { cn } from "@/lib/utils";
import { saveEmailChoices, useEmailChoices, type EmailChoicesData } from "./use-email-choices";
import { saveReminderSettings, useReminderSettings } from "./use-reminder-settings";

const SEGMENT = cn(
  "flex h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-sm text-muted pointer-coarse:h-11",
  "hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-ink",
  "has-checked:shadow-control has-checked:ring-1 has-checked:ring-ink/5",
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink",
);

export function ReminderSettingsCard() {
  const { user } = useMe();
  const userId = user?.id ?? null;
  const titleId = useId();
  const query = useReminderSettings(userId);

  if (!userId) return null;
  const settings = query.data;

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
    <Card
      id={ACCOUNT_SECTIONS.reminders}
      aria-labelledby={titleId}
      role="region"
      className={SECTION_SCROLL}
    >
      <CardHeader>
        <CardTitle as="h3" id={titleId}>
          Reminders and emails
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
            <OnOffChoice
              label="Email me follow-up reminders"
              hint="Off until you turn it on. At most one email a day, with one-click Done, Snooze and Unsubscribe."
              value={settings.emailReminders}
              onChange={(emailReminders) => void save({ emailReminders })}
            />
          ) : null}
          <OtherEmails userId={userId} />
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

type ListChange = Partial<Pick<EmailChoicesData, "jobEmails" | "tipEmails">>;

function savedTitle(change: ListChange, saved: EmailChoicesData): string {
  if (change.jobEmails !== undefined) {
    return saved.jobEmails ? "Weekly jobs email is on." : "Weekly jobs email is off.";
  }
  return saved.tipEmails ? "Tips and reminders are on." : "Tips and reminders are off.";
}

function OtherEmails({ userId }: { userId: string }) {
  const query = useEmailChoices(userId);
  const choices = query.data;

  async function save(change: ListChange) {
    try {
      const saved = await saveEmailChoices(userId, change);
      toast({ title: savedTitle(change, saved), variant: "success" });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    }
  }

  if (choices) {
    if (!choices.emailAvailable) return null;
    return (
      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <OnOffChoice
          label="Weekly jobs email"
          hint="New jobs that match your resume, at most once a week. Off until you turn it on."
          value={choices.jobEmails}
          onChange={(jobEmails) => void save({ jobEmails })}
        />
        <OnOffChoice
          label="Tips and reminders"
          hint="A few short emails, like when Free's line fixes come back or after a trial ends. On until you turn it off."
          value={choices.tipEmails}
          onChange={(tipEmails) => void save({ tipEmails })}
        />
      </div>
    );
  }
  if (query.isError && query.fetchStatus === "idle") {
    return (
      <Alert
        variant="error"
        title="Couldn't load your email settings"
        action={
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      >
        Check your connection, then try again.
      </Alert>
    );
  }
  return (
    <div className="flex flex-col gap-5 border-t border-border pt-5">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

function OnOffChoice({
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
