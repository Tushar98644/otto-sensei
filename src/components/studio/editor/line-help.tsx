"use client";

import { ArrowDown, Info, TriangleExclamationPoint } from "lucide-react";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { RESULT_ISSUES, type CheckedLine } from "@/lib/lint/entry-checks";
import { ISSUE_HELP } from "@/lib/lint/explain";
import { lineEnding, setFullStop } from "@/lib/lint/punctuation";
import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { cn } from "@/lib/utils";
import { Popover, usePopover } from "../popover";
import { useLineStepper } from "./entry-lines";
import { CHIP_LABELS } from "./lint-notes";

// "No result" fires on most lines of a first draft, so each job says it once (ResultNote) instead
// of the same chip on every line. The line's own popover still explains it.
const ENTRY_LEVEL: LintIssueId = "no-result";
// Otto rewrites wording; a repeat or a full stop is quicker to fix by hand.
const NOT_FOR_OTTO: ReadonlySet<LintIssueId> = new Set(["duplicate", "punctuation"]);

const CHIP_CLASSES =
  "relative inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap transition-shadow after:absolute after:-inset-x-1 after:-inset-y-2.5 hover:ring-1 hover:ring-ink/20 aria-expanded:ring-1 aria-expanded:ring-ink/30 [&_svg]:size-3.5 [&_svg]:shrink-0";

export type IssueChipProps = {
  issues: readonly LintIssue[];
  text: string;
  onFix: () => void;
  onSetText: (text: string) => void;
};

/** The chip at the end of a line. It opens why each issue matters, an example and a fix. */
export function IssueChip({ issues, text, onFix, onSetText }: IssueChipProps) {
  const top = issues.find((issue) => issue.id !== ENTRY_LEVEL);
  if (!top) return null;
  const high = top.severity === "high";
  const more = issues.length - 1;
  const label = CHIP_LABELS[top.id];
  return (
    <Popover
      label={`About this line: ${label}`}
      align="auto"
      triggerLabel={`${label}${more > 0 ? `, ${more} more` : ""}. Why, and how to fix it`}
      triggerClassName={cn(
        CHIP_CLASSES,
        high ? "bg-warn-soft text-warn-ink" : "bg-surface text-muted ring-1 ring-border",
      )}
      trigger={
        <>
          {high ? (
            <TriangleExclamationPoint aria-hidden className="text-warn" />
          ) : (
            <Info aria-hidden className="text-subtle" />
          )}
          {label}
          {more > 0 ? ` +${more}` : null}
        </>
      }
      className="p-3"
    >
      <LineHelp issues={issues} text={text} onFix={onFix} onSetText={onSetText} />
    </Popover>
  );
}

function LineHelp({ issues, text, onFix, onSetText }: IssueChipProps) {
  const { close } = usePopover();
  const example = issues.map((issue) => ISSUE_HELP[issue.id].example).find(Boolean) ?? null;
  const ottoCanHelp = issues.some((issue) => !NOT_FOR_OTTO.has(issue.id));
  const stopNeeded = issues.some((issue) => issue.id === "punctuation")
    ? lineEnding(text) !== "stop"
    : null;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {issues.map((issue) => (
          <li key={issue.id} className="flex flex-col gap-1">
            <p className="text-sm/6 font-medium text-ink">{CHIP_LABELS[issue.id]}</p>
            <p className="text-sm/6 text-pretty text-ink">{issue.message}</p>
            <p className="text-sm/6 text-pretty text-muted">{ISSUE_HELP[issue.id].why}</p>
          </li>
        ))}
      </ul>
      {ottoCanHelp || stopNeeded !== null ? (
        <div className="flex flex-wrap gap-2">
          {ottoCanHelp ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                close();
                onFix();
              }}
            >
              <OttoMark tone="line" small className="size-5 text-ink" />
              Fix with Otto
            </Button>
          ) : null}
          {stopNeeded !== null ? (
            <Button
              size="sm"
              variant={ottoCanHelp ? "ghost" : "secondary"}
              onClick={() => {
                onSetText(setFullStop(text, stopNeeded));
                close();
              }}
            >
              {stopNeeded ? "Add a full stop" : "Remove the full stop"}
            </Button>
          ) : null}
        </div>
      ) : null}
      {example ? <Example before={example.before} after={example.after} /> : null}
    </div>
  );
}

function Example({ before, after }: { before: string | null; after: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface-muted px-3 py-2.5 text-sm/6">
      {before ? (
        <p className="text-pretty text-muted">
          <span className="font-medium text-subtle">Instead of </span>
          {`“${before}”`}
        </p>
      ) : null}
      <p className="text-pretty text-ink">
        <span className="font-medium text-subtle">{before ? "Try " : "For example "}</span>
        {`“${after}”`}
      </p>
    </div>
  );
}

/**
 * "4 of 6 lines don't say what changed", once per job or project, with the reason one tap away
 * and a button that opens each of those lines in turn. Duty lines count too: they keep their own
 * chip, which says why.
 */
export function ResultNote({ lines }: { lines: readonly CheckedLine[] }) {
  const ids = lines
    .filter((line) => line.issues.some((issue) => RESULT_ISSUES.includes(issue.id)))
    .map((line) => line.id);
  const step = useLineStepper(ids);
  if (ids.length === 0) return null;
  const help = ISSUE_HELP[ENTRY_LEVEL];
  const summary =
    lines.length === 1
      ? "This line doesn't say what changed"
      : `${ids.length} of ${lines.length} lines ${ids.length === 1 ? "doesn't" : "don't"} say what changed`;

  return (
    <div className="flex flex-col gap-x-2 rounded-xl bg-warn-soft px-3 pt-2 pb-1 text-sm text-warn-ink sm:flex-row sm:items-center sm:py-1 sm:pr-1">
      <p className="flex min-w-0 flex-1 items-start gap-2 font-medium sm:py-1.5">
        <TriangleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
        {summary}
      </p>
      <div className="ml-3 flex items-center sm:ml-0">
        <Popover
          label="Why results matter"
          align="auto"
          triggerLabel="Why it matters"
          triggerClassName="inline-flex h-9 items-center rounded-lg px-3 font-medium text-warn-ink transition hover:bg-ink/6 aria-expanded:bg-ink/6 pointer-coarse:h-11"
          trigger="Why?"
          className="p-3"
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm/6 text-pretty text-ink">{help.why}</p>
            {help.example ? (
              <Example before={help.example.before} after={help.example.after} />
            ) : null}
          </div>
        </Popover>
        <Button
          variant="ghost"
          size="sm"
          onClick={step}
          className="text-warn-ink hover:bg-ink/6 max-sm:h-11"
        >
          {ids.length > 1 ? "Next line" : "Show line"}
          <ArrowDown />
        </Button>
      </div>
    </div>
  );
}
