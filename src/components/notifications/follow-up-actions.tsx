"use client";

import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { formatDayIn } from "@/components/dashboard/applications/view";
import { Button, buttonClasses } from "@/components/ui/button";
import { ProMark } from "@/components/ui/pro-mark";
import { toast } from "@/components/ui/toast";
import { api, isApiError } from "@/lib/api/client";
import { SNOOZE_DAYS } from "@/lib/applications/follow-up";
import { followUpWritePath } from "@/lib/notifications/links";
import type { FollowUpAction } from "@/lib/notifications/types";
import { getQueryClient } from "@/lib/queries/client";
import { APPLICATIONS } from "@/lib/queries/keys";
import { settleFollowUp } from "./use-notifications";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";

// The follow-up chip's choices on the newest bell row about it; the row's own link stays as it was.
export function FollowUpActions({
  applicationId,
  describedBy,
  onNavigate,
}: {
  applicationId: string;
  describedBy: string;
  onNavigate: () => void;
}) {
  const pro = useProTools();
  const t = useMessages("ui").notifications;
  const app = useMessages("app");
  const format = useFormat();
  const [busy, setBusy] = useState<FollowUpAction | null>(null);

  async function act(action: FollowUpAction) {
    setBusy(action);
    try {
      const result = await api.followUpAction({ a: applicationId, act: action });
      settleFollowUp(applicationId);
      void getQueryClient().invalidateQueries({ queryKey: APPLICATIONS });
      toast({
        title:
          result.followUpAt === null
            ? t.markedDone
            : fmt(t.snoozed, { day: formatDayIn(format, result.followUpAt, Date.now()) }),
        description: result.company,
        variant: "success",
      });
    } catch (error) {
      if (isApiError(error, "not_found")) settleFollowUp(applicationId);
      toast({
        title: t.reminderFailed,
        description: errorMessage(error, app.errors),
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 pr-2.5 pb-2.5 pl-7">
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
          {t.writeIt}
          <ProMark />
        </Button>
      ) : (
        <Link
          href={followUpWritePath(applicationId)}
          onClick={onNavigate}
          aria-describedby={describedBy}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          {t.writeIt}
        </Link>
      )}
      <Button
        variant="ghost"
        size="sm"
        aria-describedby={describedBy}
        loading={busy === "done"}
        disabled={busy !== null}
        onClick={() => void act("done")}
      >
        {t.done}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-label={fmt(t.snoozeDays, { days: SNOOZE_DAYS })}
        aria-describedby={describedBy}
        loading={busy === "snooze"}
        disabled={busy !== null}
        onClick={() => void act("snooze")}
      >
        {t.snooze}
      </Button>
    </div>
  );
}
