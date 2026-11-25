"use client";

import { BellRing, Check, Clock, X } from "lucide-react";
import { errorMessage } from "@/components/account/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { followUpState, SNOOZE_DAYS, snoozedUntil } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import { changeApplication } from "./use-applications";
import { formatDay } from "../i18n";

export function FollowUpChip({
  application,
  now,
  describedBy,
}: {
  application: Application;
  now: number;
  describedBy?: string;
}) {
  const { followUp: t } = useMessages("applications");
  const format = useFormat();
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
                title: t.cantUndo,
                description: errorMessage(error),
                variant: "error",
              }),
            );
          },
        });
      })
      .catch((error: unknown) =>
        toast({
          title: t.cantChange,
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
          {t.now}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => change(null, t.marked)}
        >
          <Check aria-hidden />
          {t.done}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-describedby={describedBy}
          onClick={() => {
            const until = snoozedUntil(Date.now());
            change(until, fmt(t.snoozed, { day: formatDay(format, until, until) }));
          }}
        >
          <Clock aria-hidden />
          {format.plural(t.snooze, SNOOZE_DAYS)}
        </Button>
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs/5 text-subtle">
      <BellRing aria-hidden className="size-3.5" />
      {fmt(t.reminder, { day: formatDay(format, previous, now) })}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={fmt(t.remove, { name })}
        onClick={() => change(null, t.removed)}
        className="-my-2 text-subtle hover:text-ink"
      >
        <X aria-hidden />
      </Button>
    </span>
  );
}
