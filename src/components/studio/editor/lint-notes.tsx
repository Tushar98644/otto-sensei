"use client";

import type { LintIssue, LintIssueId } from "@/lib/lint/types";
import { pluralize } from "@/lib/utils";
import { useSettled } from "./use-settled";

export const SETTLE_MS = 450;

export const CHIP_LABELS: Record<LintIssueId, string> = {
  "stock-phrase": "Stock phrase",
  duty: "Duty, not result",
  "no-result": "No result",
  "no-number": "Add a number",
  "no-method": "Say how",
  "weak-start": "Weak start",
  "first-person": "Drop I and my",
  tense: "Past tense",
  "too-long": "Too long",
  "too-short": "Too short",
  passive: "Passive",
  vague: "Vague",
  duplicate: "Repeated",
  punctuation: "Full stop",
};

export function useLineLint(issues: readonly LintIssue[], hasText: boolean) {
  const settled = useSettled(hasText ? issues : null, SETTLE_MS);
  return hasText ? settled : null;
}

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
