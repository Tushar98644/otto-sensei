"use client";

import { BellRing, Check, Clock, X } from "lucide-react";
import { errorMessage } from "@/components/account/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { followUpState, SNOOZE_DAYS, snoozedUntil } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import { changeApplication } from "./use-applications";
import { formatDay } from "./view";

export function FollowUpChip({
  application,
  now,
  describedBy,
}: {
  application: Application;
  now: number;
  describedBy?: string;
}) {
  const state = now === 0 ? "none" : followUpState(application, now);
  if (state === "none" || application.followUpAt === null) return null;
  const previous = application.followUpAt;
  const name = application.company;

  function change(followUpAt: number | null, title: string) {
    changeApplication(application, { followUpAt })
      .then((saved) => {
        undoToast({
          title,
          description: name,
          onUndo: () => {
            changeApplication(saved, { followUpAt: previous }).catch((error: unknown) =>
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
    return (
      <div className="flex flex-wrap items-center gap-1">
        <Badge variant="warn">
          <BellRing aria-hidden className="text-warn" />
          Follow up now
        </Badge>
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
