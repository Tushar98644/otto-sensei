"use client";

import { useFormat, useLocale, useMessages } from "@/i18n/client";
import { issueText } from "@/lib/lint/i18n";
import type { LintIssue } from "@/lib/lint/types";
import { countText } from "../count";
import { useSettled } from "./use-settled";

export const SETTLE_MS = 450;

export function useLineLint(issues: readonly LintIssue[], hasText: boolean) {
  const settled = useSettled(hasText ? issues : null, SETTLE_MS);
  return hasText ? settled : null;
}

// An issue's message in the page's language, from the lint namespace.
export function useIssueText(): (issue: LintIssue) => string {
  const lint = useMessages("lint");
  const locale = useLocale();
  return (issue) => issueText(issue, lint, locale);
}

export function LineTip({ issues }: { issues: readonly LintIssue[] }) {
  const t = useMessages("studioEditor").tips;
  const format = useFormat();
  const text = useIssueText();
  const [top] = issues;
  if (!top) return null;
  const more = issues.length - 1;
  return (
    <p aria-hidden className="min-w-0 text-sm/6 text-muted">
      {text(top)}
      {more > 0 ? <span className="text-subtle">{` +${countText(format, t.more, more)}`}</span> : null}
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
  const t = useMessages("studioEditor").tips;
  const text = useIssueText();
  return (
    <div id={id} className="sr-only">
      {issues === null ? null : issues.length === 0 ? (
        t.good
      ) : (
        <ul role="list">
          {issues.map((issue) => (
            <li key={issue.id}>
              {issue.severity === "high" ? t.needsWork : t.tip} {text(issue)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
