"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { NOT_FIT_LABELS, NOT_FIT_REASONS, type NotFitReason } from "@/lib/job-feed/types";

export function NotFitQuestion({
  title,
  onPick,
  onCancel,
}: {
  title: string;
  onPick: (reason: NotFitReason) => void;
  onCancel: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);

  // Opened from the ⋯ menu, which hands focus back to its trigger first.
  useEffect(() => {
    first.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-label={`Why ${title} isn't a fit`}
      className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4"
    >
      <p className="text-sm/6 font-medium text-ink">Why isn&apos;t it a fit?</p>
      <div className="flex flex-wrap gap-2">
        {NOT_FIT_REASONS.map((reason, index) => (
          <Button
            key={reason}
            ref={index === 0 ? first : undefined}
            variant="secondary"
            size="sm"
            onClick={() => onPick(reason)}
          >
            {NOT_FIT_LABELS[reason]}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted hover:text-ink">
          Cancel
        </Button>
      </div>
    </div>
  );
}
