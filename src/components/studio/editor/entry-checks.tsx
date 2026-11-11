"use client";

import { Check, ChevronDown, Info, ListChecks, TriangleExclamationPoint } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { entryChecks, type CheckedLine, type EntryCheck } from "@/lib/lint/entry-checks";
import { cn, pluralize } from "@/lib/utils";
import { useLineStepper } from "./entry-lines";

export type EntryChecksProps = {
  lines: readonly CheckedLine[];
  ownerHeadingId: string;
  // The job has an end date, so its lines are checked for past tense.
  ended: boolean;
};

export function EntryChecks({ lines, ownerHeadingId, ended }: EntryChecksProps) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const checks = useMemo(() => entryChecks(lines, ended), [lines, ended]);
  if (checks.length === 0) return null;
  const passed = checks.filter((check) => check.lineIds.length === 0).length;

  return (
    <div className="flex flex-col">
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={listId}
        aria-describedby={ownerHeadingId}
        onClick={() => setOpen((value) => !value)}
        data-entry-checks
        className="-ml-3 self-start text-muted hover:text-ink max-sm:h-11"
      >
        <ListChecks />
        {`${passed} of ${checks.length} checks passed`}
        <span aria-hidden className="text-subtle">
          ·
        </span>
        {open ? "Hide" : "Show"}
        <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
      </Button>
      <ul id={listId} hidden={!open} className="mt-1 grid sm:grid-cols-2 sm:gap-x-6">
        {open ? checks.map((check) => <CheckRow key={check.id} check={check} />) : null}
      </ul>
    </div>
  );
}

function CheckRow({ check }: { check: EntryCheck }) {
  const step = useLineStepper(check.lineIds);
  const count = check.lineIds.length;
  if (count === 0) {
    return (
      <li className="flex min-h-9 items-center gap-1.5 text-sm text-muted">
        <Check aria-hidden className="size-4 shrink-0 text-pass" />
        {check.label}
        <span className="sr-only">: passed</span>
      </li>
    );
  }
  const high = check.severity === "high";
  const Icon = high ? TriangleExclamationPoint : Info;
  return (
    <li className="-mx-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={step}
        data-check-jump
        className="w-full justify-start px-2 max-sm:h-11"
      >
        <Icon aria-hidden className={high ? "text-warn" : "text-subtle"} />
        <span className="sr-only">{high ? "Needs work: " : "Tip: "}</span>
        {check.label}
        <span className="ml-auto text-xs font-normal text-subtle tabular-nums">
          {pluralize(count, "line")}
        </span>
        <span className="sr-only">{count > 1 ? ", show the next one" : ", show it"}</span>
      </Button>
    </li>
  );
}
