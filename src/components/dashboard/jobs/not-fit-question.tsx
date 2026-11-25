"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { NOT_FIT_REASONS, type NotFitReason } from "@/lib/job-feed/types";

export function NotFitQuestion({
  title,
  onPick,
  onCancel,
}: {
  title: string;
  onPick: (reason: NotFitReason) => void;
  onCancel: () => void;
}) {
  const { notFit } = useMessages("jobs");
  const first = useRef<HTMLButtonElement>(null);

  // Opened from the ⋯ menu, which hands focus back to its trigger first.
  useEffect(() => {
    first.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-label={fmt(notFit.label, { title })}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4"
    >
      <p className="text-sm/6 font-medium text-ink">{notFit.question}</p>
      <div className="flex flex-wrap gap-2">
        {NOT_FIT_REASONS.map((reason, index) => (
          <Button
            key={reason}
            ref={index === 0 ? first : undefined}
            variant="secondary"
            size="sm"
            onClick={() => onPick(reason)}
          >
            {notFit.reasons[reason]}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted hover:text-ink">
          {notFit.cancel}
        </Button>
      </div>
    </div>
  );
}
