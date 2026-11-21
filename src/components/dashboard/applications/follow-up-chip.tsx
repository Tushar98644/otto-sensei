"use client";

import { BellRing, Check, Clock, PenLine, X } from "lucide-react";
import Link from "next/link";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { openFeaturePrompt } from "@/components/account/upgrade-prompt";
import { reloadNotifications, settleFollowUp } from "@/components/notifications/use-notifications";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { ProMark } from "@/components/ui/pro-mark";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { followUpState, SNOOZE_DAYS, snoozedUntil } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import { followUpWritePath } from "@/lib/notifications/links";
import { changeApplication } from "./use-applications";
import { formatDay } from "./view";

export function FollowUpChip({
  application,
  now,
  describedBy,
  onWrite,
}: {
  application: Application;
  now: number;
  describedBy?: string;
  // Opens the writer in place; without it, the button goes to the application's page.
  onWrite?: () => void;
}) {
  const pro = useProTools();
  const state = now === 0 ? "none" : followUpState(application, now);
  if (state === "none" || application.followUpAt === null) return null;
  const previous = application.followUpAt;
  const name = application.company;

  function change(followUpAt: number | null, title: string) {
    changeApplication(application, { followUpAt })
      .then((saved) => {
        settleFollowUp(application.id);
        undoToast({
          title,
          description: name,
          onUndo: () => {
            changeApplication(saved, { followUpAt: previous }).then(
              reloadNotifications,
              (error: unknown) =>
                toast({
                  title: "Couldn't undo that",
                  description: errorMessage(error),
                  variant: "error",
                }),
            );
          },
        });
      })
      .catch((error: unknown) =>
        toast({
          title: "Couldn't change the reminder",
          description: errorMessage(error),
          variant: "error",
        }),
      );
  }

  if (state === "due") {
    const write = (
      <>
        <PenLine aria-hidden />
        Write it for me
        {pro === false ? <ProMark /> : null}
      </>
    );
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="warn">
          <BellRing aria-hidden className="text-warn" />
          Follow up now
        </Badge>
        {onWrite || pro === false ? (
          <Button
            variant="secondary"
            size="sm"
            aria-describedby={describedBy}
            onClick={onWrite ?? (() => openFeaturePrompt("letter"))}
          >
            {write}
          </Button>
        ) : (
          <Link
            href={followUpWritePath(application.id)}
            aria-describedby={describedBy}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {write}
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => change(null, "Follow-up marked done")}
        >
          <Check aria-hidden />
          Done
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => {
            const until = snoozedUntil(Date.now());
            change(until, `Snoozed until ${formatDay(until, until)}`);
          }}
        >
          <Clock aria-hidden />
          Snooze {SNOOZE_DAYS} days
        </Button>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs/5 text-subtle">
      <BellRing aria-hidden className="size-3.5" />
      Follow-up reminder {formatDay(previous, now)}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Remove the follow-up reminder for ${name}`}
        onClick={() => change(null, "Reminder removed")}
        className="-my-2 text-subtle hover:text-ink"
      >
        <X aria-hidden />
      </Button>
    </span>
  );
}
