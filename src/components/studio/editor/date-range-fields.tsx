"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isPresentDate, PRESENT } from "./edits";
import { CHAR_LIMITS } from "./limits";

export type DateRange = { startDate: string; endDate: string };

export type DateRangeFieldsProps = DateRange & {
  presentLabel: string;
  onChange: (patch: Partial<DateRange>) => void;
  className?: string;
};

export function DateRangeFields({
  startDate,
  endDate,
  presentLabel,
  onChange,
  className,
}: DateRangeFieldsProps) {
  const endRef = useRef<HTMLInputElement>(null);
  const present = isPresentDate(endDate);

  function togglePresent(checked: boolean) {
    if (checked) {
      onChange({ endDate: PRESENT });
      return;
    }
    flushSync(() => onChange({ endDate: "" }));
    endRef.current?.focus();
  }

  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}>
      <Field label="Start date">
        <Input
          value={startDate}
          onChange={(event) => onChange({ startDate: event.target.value })}
          maxLength={CHAR_LIMITS.date}
          placeholder="Jan 2022"
        />
      </Field>
      <Field label="End date">
        <Input
          ref={endRef}
          value={endDate}
          disabled={present}
          onChange={(event) => onChange({ endDate: event.target.value })}
          maxLength={CHAR_LIMITS.date}
          placeholder="Mar 2024"
        />
      </Field>
      <label className="col-start-2 inline-flex min-h-11 items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={present}
          onChange={(event) => togglePresent(event.target.checked)}
          className="size-5 shrink-0 accent-ink"
        />
        {presentLabel}
      </label>
    </div>
  );
}
