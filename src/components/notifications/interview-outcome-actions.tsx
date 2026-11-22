"use client";

import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { keepApplication } from "@/components/dashboard/applications/use-applications";
import { formatDay } from "@/components/dashboard/applications/view";
import { Button, buttonClasses } from "@/components/ui/button";
import { ProMark } from "@/components/ui/pro-mark";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { Application } from "@/lib/applications/schema";
import { thankYouWritePath } from "@/lib/notifications/links";
import type { InterviewOutcome } from "@/lib/notifications/types";
import { settleOutcome } from "./use-notifications";

const ANSWERS: { outcome: InterviewOutcome; label: string }[] = [
  { outcome: "next_round", label: "Next round" },
  { outcome: "waiting", label: "Waiting" },
  { outcome: "rejected", label: "Rejected" },
];

function answeredToast(outcome: InterviewOutcome, application: Application) {
  const company = application.company;
  if (outcome === "next_round") {
    return {
      title: `On to the next round with ${company}`,
      description: "Add its day on the card when you know it.",
    };
  }
  if (outcome === "rejected") {
    return {
      title: "Moved to Closed",
      description: `${company}. It still counts in your record of what works.`,
    };
  }
  return {
    title: "Waiting to hear back",
    description:
      application.followUpAt === null
        ? company
        : `I'll remind you to follow up with ${company} on ${formatDay(application.followUpAt, Date.now())}.`,
  };
}

// "How did it go?" on the newest bell row about an interview: a thank-you, then one tap for how it stands.
export function InterviewOutcomeActions({
  applicationId,
  describedBy,
  onNavigate,
}: {
  applicationId: string;
  describedBy: string;
  onNavigate: () => void;
}) {
  const pro = useProTools();
  const [busy, setBusy] = useState<InterviewOutcome | null>(null);

  async function answer(outcome: InterviewOutcome) {
    setBusy(outcome);
    try {
      const { application } = await api.interviewOutcome(applicationId, { outcome });
      settleOutcome(applicationId);
      keepApplication(application);
      toast({ ...answeredToast(outcome, application), variant: "success" });
    } catch (error) {
      if (isApiError(error, "not_found")) settleOutcome(applicationId);
      toast({ title: "Couldn't save that", description: errorMessage(error), variant: "error" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1 pr-2.5 pb-2.5 pl-7">
      {pro === false ? (
        <Button
          variant="secondary"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => {
            onNavigate();
            openFeaturePrompt("letter");
          }}
        >
          Write a thank-you
          <ProMark />
        </Button>
      ) : (
        <Link
          href={thankYouWritePath(applicationId)}
          onClick={onNavigate}
          aria-describedby={describedBy}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          Write a thank-you
        </Link>
      )}
      <div role="group" aria-label="How it went" className="-ml-1 flex flex-wrap gap-1">
        {ANSWERS.map(({ outcome, label }) => (
          <Button
            key={outcome}
            variant="ghost"
            size="sm"
            aria-describedby={describedBy}
            loading={busy === outcome}
            disabled={busy !== null}
            onClick={() => void answer(outcome)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
