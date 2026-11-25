"use client";

import { ArrowDown, Info, TriangleExclamationPoint } from "lucide-react";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { RESULT_ISSUES, type CheckedLine } from "@/lib/lint/entry-checks";
import { lineEnding, setFullStop } from "@/lib/lint/punctuation";
import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { cn } from "@/lib/utils";
import { Popover, usePopover } from "../popover";
import { useLineStepper } from "./entry-lines";
import { ottoCanFix } from "./fix-queue";
import { useIssueText } from "./lint-notes";

type Help = { why: string; example: { before: string | null; after: string } | null };

// lint's help for an issue (the same words as ISSUE_HELP in English), in the page's language.
function helpOf(lint: Messages["lint"], id: LintIssueId): Help {
  const words: { why: string; before?: string; after?: string } = lint.help[id];
  return {
    why: words.why,
    example: words.after ? { before: words.before ?? null, after: words.after } : null,
  };
}

const ENTRY_LEVEL: LintIssueId = "no-result";

const CHIP_CLASSES =
  "relative inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap transition-shadow after:absolute after:-inset-x-1 after:-inset-y-2.5 hover:ring-1 hover:ring-ink/20 aria-expanded:ring-1 aria-expanded:ring-ink/30 [&_svg]:size-3.5 [&_svg]:shrink-0";

export type IssueChipProps = {
  issues: readonly LintIssue[];
  text: string;
  onFix: () => void;
  onSetText: (text: string) => void;
};

export function IssueChip({ issues, text, onFix, onSetText }: IssueChipProps) {
  const t = useMessages("studioEditor");
  const top = issues.find((issue) => issue.id !== ENTRY_LEVEL);
  if (!top) return null;
  const high = top.severity === "high";
  const more = issues.length - 1;
  const label = t.chips[top.id];
  return (
    <Popover
      label={fmt(t.help.about, { label })}
      align="auto"
      triggerLabel={fmt(more > 0 ? t.help.chipMore : t.help.chip, { label, more })}
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
  const t = useMessages("studioEditor");
  const lint = useMessages("lint");
  const say = useIssueText();
  const example = issues.map((issue) => helpOf(lint, issue.id).example).find(Boolean) ?? null;
  const ottoCanHelp = ottoCanFix(issues);
  const stopNeeded = issues.some((issue) => issue.id === "punctuation")
    ? lineEnding(text) !== "stop"
    : null;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {issues.map((issue) => (
          <li key={issue.id} className="flex flex-col gap-1">
            <p className="text-sm/6 font-medium text-ink">{t.chips[issue.id]}</p>
            <p className="text-sm/6 text-pretty text-ink">{say(issue)}</p>
            <p className="text-sm/6 text-pretty text-muted">{helpOf(lint, issue.id).why}</p>
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
              {t.help.fix}
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
              {stopNeeded ? t.help.addStop : t.help.removeStop}
            </Button>
          ) : null}
        </div>
      ) : null}
      {example ? <Example before={example.before} after={example.after} /> : null}
    </div>
  );
}

function Example({ before, after }: { before: string | null; after: string }) {
  const t = useMessages("studioEditor").help;
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface-muted px-3 py-2.5 text-sm/6">
      {before ? (
        <p className="text-pretty text-muted">
          <span className="font-medium text-subtle">{t.insteadOf} </span>
          {fmt(t.quoted, { text: before })}
        </p>
      ) : null}
      <p className="text-pretty text-ink">
        <span className="font-medium text-subtle">{before ? t.try : t.forExample} </span>
        {fmt(t.quoted, { text: after })}
      </p>
    </div>
  );
}

export function ResultNote({ lines }: { lines: readonly CheckedLine[] }) {
  const ids = lines
    .filter((line) => line.issues.some((issue) => RESULT_ISSUES.includes(issue.id)))
    .map((line) => line.id);
  const step = useLineStepper(ids);
  const t = useMessages("studioEditor").help;
  const lint = useMessages("lint");
  if (ids.length === 0) return null;
  const help = helpOf(lint, ENTRY_LEVEL);
  const summary =
    lines.length === 1
      ? t.noResultOne
      : fmt(ids.length === 1 ? t.noResultOneOf : t.noResultSomeOf, {
          count: ids.length,
          total: lines.length,
        });

  return (
    <div className="flex flex-col gap-x-2 rounded-xl bg-warn-soft px-3 pt-2 pb-1 text-sm text-warn-ink sm:flex-row sm:items-center sm:py-1 sm:pr-1">
      <p className="flex min-w-0 flex-1 items-start gap-2 font-medium sm:py-1.5">
        <TriangleExclamationPoint aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
        {summary}
      </p>
      <div className="ml-3 flex items-center sm:ml-0">
        <Popover
          label={t.whyResults}
          align="auto"
          triggerLabel={t.whyItMatters}
          triggerClassName="inline-flex h-9 items-center rounded-lg px-3 font-medium text-warn-ink transition hover:bg-ink/6 aria-expanded:bg-ink/6 pointer-coarse:h-11"
          trigger={t.why}
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
          {ids.length > 1 ? t.nextLine : t.showLine}
          <ArrowDown />
        </Button>
      </div>
    </div>
  );
}
