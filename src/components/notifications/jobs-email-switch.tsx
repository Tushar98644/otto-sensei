"use client";

import { useId } from "react";
import { errorMessage } from "@/components/account/errors";
import { toast } from "@/components/ui/toast";
import { saveEmailChoices, useEmailChoices } from "./use-email-choices";

// The weekly jobs email, offered beside the reminder choice: off until the person flips it.
export function JobsEmailSwitch({ userId, className }: { userId: string; className?: string }) {
  const query = useEmailChoices(userId);
  const labelId = useId();
  const hintId = useId();
  const choices = query.data;
  if (!choices?.emailAvailable) return null;
  const on = choices.jobEmails;

  async function flip() {
    try {
      const saved = await saveEmailChoices(userId, { jobEmails: !on });
      toast({
        title: saved.jobEmails ? "Weekly jobs email is on." : "Weekly jobs email is off.",
        variant: "success",
      });
    } catch (error) {
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={labelId}
        aria-describedby={hintId}
        onClick={() => void flip()}
        className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg text-left"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span id={labelId} className="text-sm font-medium text-ink">
            Also email me new jobs each week
          </span>
          <span id={hintId} className="text-sm text-pretty text-muted">
            Only ones that match your resume. Off until you turn it on.
          </span>
        </span>
        <span
          aria-hidden
          className="flex h-6 w-10 shrink-0 items-center rounded-full bg-surface-strong p-0.5 transition-colors group-aria-checked:bg-primary"
        >
          <span className="size-5 rounded-full bg-surface shadow-control transition-transform group-aria-checked:translate-x-4 motion-reduce:transition-none" />
        </span>
      </button>
    </div>
  );
}
