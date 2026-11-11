"use client";

import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { reminderPromptShows } from "@/lib/setup/checklist";
import { useReminderChoice } from "./use-reminder-choice";

// Applications, once something is logged: one inline offer of reminder emails, until the person
// answers it either way (the answer is the Account page's switch, so it never asks again).
export function ReminderPrompt({ applications }: { applications: number }) {
  const pro = useProTools();
  const { user } = useMe();
  const reminders = useReminderChoice(user?.id ?? null, pro === true && applications > 0);
  const [saving, setSaving] = useState<boolean | null>(null);

  if (!reminderPromptShows({ pro: pro === true, applications, reminders: reminders.value })) {
    return null;
  }

  async function answer(on: boolean) {
    setSaving(on);
    try {
      await reminders.save({ emailReminders: on });
      if (on) toast({ title: "Reminder emails are on.", variant: "success" });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-5 sm:p-6">
      <OttoNote
        live={false}
        message="Want me to email you when it's time to follow up? At most one email a day."
      >
        <Button variant="secondary" loading={saving === true} disabled={saving !== null} onClick={() => void answer(true)}>
          Email me reminders
        </Button>
        <Button variant="ghost" loading={saving === false} disabled={saving !== null} onClick={() => void answer(false)}>
          No thanks
        </Button>
      </OttoNote>
    </div>
  );
}
