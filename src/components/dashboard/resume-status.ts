import type { Format } from "@/i18n/intl";
import type { CheckStatus, RecruiterReport } from "@/lib/checks/types";
import type { ResumeLint } from "@/lib/lint/types";
import type { DashboardMessages } from "./i18n";

export type StatusChip = { status: CheckStatus; label: string };

export function reportChip(
  report: RecruiterReport | undefined,
  { card }: DashboardMessages,
  format: Format,
): StatusChip | null {
  if (!report) return null;
  const { fail, warn } = report.counts;
  if (fail > 0) return { status: "fail", label: format.plural(card.fileProblems, fail) };
  if (warn > 0) return { status: "warn", label: format.plural(card.fileWarnings, warn) };
  return { status: "pass", label: card.fileClean };
}

export function linesChip(
  lint: ResumeLint,
  { card }: DashboardMessages,
  format: Format,
): StatusChip | null {
  const { bullets, withIssues } = lint.totals;
  if (bullets === 0) return null;
  if (withIssues > 0) {
    return { status: "warn", label: format.plural(card.linesToImprove, withIssues) };
  }
  return { status: "pass", label: card.linesGood };
}
