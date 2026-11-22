"use client";

import { BellRing, Eye, Mail, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { useMe } from "@/components/account/use-me";
import { useReminderChoice } from "@/components/setup/use-reminder-choice";
import { accountSectionHref } from "@/components/setup/links";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Resume } from "@/lib/resume/schema";
import { reminderPromptShows } from "@/lib/setup/checklist";
import { saveEmailChoices, useEmailChoices, type EmailChoicesData } from "./use-email-choices";

type Answer = "yes" | "not_now";

type OptInCardProps = {
  icon: LucideIcon;
  question: string;
  hint: string;
  // Said once Yes is pressed, such as "The weekly jobs email is on."
  onLine: string;
  onAnswer: (answer: Answer) => Promise<unknown>;
};

const SETTINGS = accountSectionHref("reminders");

// One question, two keys, nothing ticked for the person: Yes turns the email on, Not now rests the card.
export function OptInCard({ icon: Icon, question, hint, onLine, onAnswer }: OptInCardProps) {
  const titleId = useId();
  const [answered, setAnswered] = useState<Answer | null>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);

  // The pressed key goes away, so focus moves to the line that replaces it.
  useEffect(() => {
    if (answered) doneRef.current?.focus();
  }, [answered]);

  async function answer(choice: Answer) {
    setAnswered(choice);
    try {
      await onAnswer(choice);
    } catch (error) {
      setAnswered(null);
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    }
  }

  if (answered) {
    return (
      <p
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl bg-surface px-4 py-4 text-sm/6 text-muted outline-none sm:px-6"
      >
        {answered === "yes" ? `${onLine} ` : "Okay, not now. "}
        Change it any time in{" "}
        <Link href={SETTINGS} className="font-medium text-ink underline">
          your account settings
        </Link>
        .
      </p>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col items-start gap-4 rounded-2xl bg-surface px-4 py-5 motion-safe:animate-fade-in sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <div className="flex min-w-0 gap-3.5">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted"
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="font-sans text-base/6 font-medium text-pretty text-ink">
            {question}
          </h2>
          <p className="mt-1 text-sm/6 text-pretty text-muted">{hint}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:w-full max-sm:pl-12.5">
        <Button variant="ghost" size="sm" onClick={() => void answer("not_now")}>
          Not now
        </Button>
        <Button size="sm" onClick={() => void answer("yes")}>
          Yes
        </Button>
      </div>
    </section>
  );
}

export function hasTailoredCopy(resumes: readonly Resume[]): boolean {
  return resumes.some((resume) => resume.tailor !== null && resume.source !== "sample");
}

export function jobsCardShows(choices: EmailChoicesData | undefined): boolean {
  return Boolean(
    choices?.emailAvailable &&
    !choices.jobEmails &&
    !choices.jobPromptClosed &&
    !choices.jobPromptSnoozed,
  );
}

export function viewsCardShows(choices: EmailChoicesData | undefined): boolean {
  return Boolean(
    choices?.emailAvailable &&
    !choices.viewEmails &&
    !choices.viewPromptClosed &&
    !choices.viewPromptSnoozed,
  );
}

// After the first saved job or tailored copy (the caller knows which happened).
export function JobsEmailOptIn({ userId, moment }: { userId: string | null; moment: boolean }) {
  const { data } = useEmailChoices(userId, moment);
  const [shown] = useAskedOnce(moment && jobsCardShows(data));
  if (!userId || !shown) return null;
  return (
    <OptInCard
      icon={Mail}
      question="Email me new matches once a week?"
      hint="Only jobs that fit your resume, the closest few. Off until you say yes."
      onLine="The weekly jobs email is on."
      onAnswer={(answer) =>
        saveEmailChoices(
          userId,
          answer === "yes" ? { jobEmails: true } : { jobPromptSnoozed: true },
        )
      }
    />
  );
}

// The first time someone opens a share link or the portfolio; the bell always shows it either way.
export function ViewsEmailOptIn({ userId, moment }: { userId: string | null; moment: boolean }) {
  const { data } = useEmailChoices(userId, moment);
  const [shown] = useAskedOnce(moment && viewsCardShows(data));
  if (!userId || !shown) return null;
  return (
    <OptInCard
      icon={Eye}
      question="Email me when someone opens my resume link or portfolio?"
      hint="At most one email a day, with the counts. Never who opened it. Off until you say yes."
      onLine="Views emails are on."
      onAnswer={(answer) =>
        saveEmailChoices(
          userId,
          answer === "yes" ? { viewEmails: true } : { viewPromptSnoozed: true },
        )
      }
    />
  );
}

// After the first application is logged.
export function RemindersEmailOptIn({ applications }: { applications: number }) {
  const pro = useProTools();
  const { user } = useMe();
  const reminders = useReminderChoice(user?.id ?? null, pro === true && applications > 0);
  const [shown] = useAskedOnce(
    reminderPromptShows({ pro: pro === true, applications, reminders: reminders.value }),
  );
  if (!shown) return null;
  return (
    <OptInCard
      icon={BellRing}
      question="Email me when it's time to follow up?"
      hint="Follow-ups and interviews, at most one email a day. The bell shows them either way."
      onLine="Reminder emails are on."
      onAnswer={(answer) =>
        reminders.save(answer === "yes" ? { emailReminders: true } : { snoozePrompt: true })
      }
    />
  );
}

// Once a card is up it stays until it's answered, even while its data refetches.
function useAskedOnce(shows: boolean): [boolean] {
  const [asked, setAsked] = useState(false);
  if (shows && !asked) setAsked(true);
  return [asked || shows];
}
