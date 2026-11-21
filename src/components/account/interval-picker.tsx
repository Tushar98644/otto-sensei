"use client";

import { useId } from "react";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { INTERVAL_NAMES, priceSentence } from "@/lib/billing/prices";
import { cn } from "@/lib/utils";

export type IntervalPickerProps = {
  plan?: PaidPlanId;
  intervals: readonly BillingInterval[] | undefined;
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  className?: string;
};

export function IntervalPicker({ plan, intervals, value, onChange, className }: IntervalPickerProps) {
  const name = useId();
  const noteId = `${name}-note`;
  if (!intervals || intervals.length < 2) return null;
  return (
    <fieldset
      className={cn("flex flex-col gap-2", className)}
      aria-describedby={plan ? noteId : undefined}
    >
      <legend className="sr-only">How often to pay</legend>
      <div className="flex gap-1 rounded-xl bg-surface-muted p-1 sm:w-fit">
        {intervals.map((interval) => (
          <label key={interval} className="relative min-w-0 flex-1 sm:flex-none">
            <input
              type="radio"
              name={name}
              value={interval}
              checked={value === interval}
              onChange={() => onChange(interval)}
              className="peer sr-only"
            />
            <span className="flex h-9 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-muted transition-colors pointer-coarse:h-11 peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
              {INTERVAL_NAMES[interval]}
            </span>
          </label>
        ))}
      </div>
      {plan ? (
        <p id={noteId} className="text-sm/6 text-muted" aria-live="polite">
          {priceSentence(plan, value)}
        </p>
      ) : null}
    </fieldset>
  );
}
