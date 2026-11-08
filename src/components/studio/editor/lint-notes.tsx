"use client";

import { Info, TriangleExclamationPoint } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status";
import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { pluralize } from "@/lib/utils";
import { useSettled } from "./use-settled";

// Long enough to finish a word, short enough to still feel live.
const SETTLE_MS = 450;

// Two or three words for the chip at the end of a line. The full message is the line's
// description and the tip shown under it while it has focus.
export const CHIP_LABELS: Record<LintIssueId, string> = {
  "stock-phrase": "Stock phrase",
  "no-number": "Add a number",
  "weak-start": "Weak start",
  "first-person": "Drop I and my",
  "too-long": "Too long",
  "too-short": "Too short",
  passive: "Passive",
  vague: "Vague",
  duplicate: "Repeated",
};

// Lint updates once typing pauses, so a line that was just started isn't called "too short" after
// its first letter. Null while the line is empty: it gets no chip and no description.
export function useLineLint(issues: readonly LintIssue[], hasText: boolean) {
  const settled = useSettled(hasText ? issues : null, SETTLE_MS);
  return hasText ? settled : null;
}

// Most important issue only, plus how many more. High severity gets the warning style; low reads
// as a neutral tip; a clean line gets a quiet pass that recedes.
export function LineChip({ issues }: { issues: readonly LintIssue[] }) {
  const [top] = issues;
  if (!top) return <StatusPill status="pass">Looks good</StatusPill>;
  const more = issues.length > 1 ? ` +${issues.length - 1}` : "";
  const high = top.severity === "high";
  return (
    <Badge variant={high ? "warn" : "neutral"}>
      {high ? <TriangleExclamationPoint className="text-warn" /> : <Info className="text-subtle" />}
      {CHIP_LABELS[top.id]}
      {more}
    </Badge>
  );
}

// The visible hint while the line has focus. Hidden from screen readers, which get every message
// through LineDescription instead.
export function LineTip({ issues }: { issues: readonly LintIssue[] }) {
  const [top] = issues;
  if (!top) return null;
  const more = issues.length - 1;
  return (
    <p aria-hidden className="min-w-0 text-sm/6 text-muted">
      {top.message}
      {more > 0 ? <span className="text-subtle">{` +${pluralize(more, "more tip")}`}</span> : null}
    </p>
  );
}

// Referenced by the line's aria-describedby: every issue in words, so the meaning never rests on
// the chip's color or on a tip that only shows on focus.
export function LineDescription({
  id,
  issues,
}: {
  id: string;
  issues: readonly LintIssue[] | null;
}) {
  return (
    <div id={id} className="sr-only">
      {issues === null ? null : issues.length === 0 ? (
        "Looks good"
      ) : (
        <ul role="list">
          {issues.map((issue) => (
            <li key={issue.id}>
              {issue.severity === "high" ? "Needs work: " : "Tip: "}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
