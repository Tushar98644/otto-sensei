"use client";

import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { keepApplication } from "@/components/dashboard/applications/use-applications";
import { formatDayIn } from "@/components/dashboard/applications/view";
import { Button, buttonClasses } from "@/components/ui/button";
import { ProMark } from "@/components/ui/pro-mark";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import type { Application } from "@/lib/applications/schema";
import { thankYouWritePath } from "@/lib/notifications/links";
import type { InterviewOutcome } from "@/lib/notifications/types";
import { settleOutcome } from "./use-notifications";
import { useFormat, useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import EN_APP from "@/i18n/messages/en/app";
import EN_UI from "@/i18n/messages/en/ui";

const ANSWERS: readonly InterviewOutcome[] = ["next_round", "waiting", "rejected"];

type NotificationWords = (typeof EN_UI)["notifications"];

function answeredToast(
  outcome: InterviewOutcome,
  application: Application,
  t: NotificationWords,
  format: Format,
) {
  const company = application.company;
  if (outcome === "next_round") {
    return { title: fmt(t.nextRound, { company }), description: t.nextRoundNote };
  }
  if (outcome === "rejected") {
    return { title: t.closed, description: fmt(t.closedNote, { company }) };
  }
  return {
    title: t.waiting,
    description:
      application.followUpAt === null
        ? company
        : fmt(t.remind, {
            company,
            day: formatDayIn(format, application.followUpAt, Date.now()),
          }),
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
  const t = useMessagesOr("ui", EN_UI).notifications;
  const app = useMessagesOr("app", EN_APP);
  const format = useFormat();
  const [busy, setBusy] = useState<InterviewOutcome | null>(null);

  async function answer(outcome: InterviewOutcome) {
    setBusy(outcome);
    try {
      const { application } = await api.interviewOutcome(applicationId, { outcome });
      settleOutcome(applicationId);
      keepApplication(application);
      toast({ ...answeredToast(outcome, application, t, format), variant: "success" });
    } catch (error) {
      if (isApiError(error, "not_found")) settleOutcome(applicationId);
      toast({
        title: t.saveFailed,
        description: errorMessage(error, app.errors),
        variant: "error",
      });
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
          {t.thankYou}
          <ProMark />
        </Button>
      ) : (
        <Link
          href={thankYouWritePath(applicationId)}
          onClick={onNavigate}
          aria-describedby={describedBy}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          {t.thankYou}
        </Link>
      )}
      <div role="group" aria-label={t.howItWent} className="-ml-1 flex flex-wrap gap-1">
        {ANSWERS.map((outcome) => (
          <Button
            key={outcome}
            variant="ghost"
            size="sm"
            aria-describedby={describedBy}
            loading={busy === outcome}
            disabled={busy !== null}
            onClick={() => void answer(outcome)}
          >
            {t.outcomes[outcome]}
          </Button>
        ))}
      </div>
    </div>
  );
}
