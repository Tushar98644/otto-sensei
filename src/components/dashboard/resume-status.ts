import type { CheckStatus, RecruiterReport } from "@/lib/checks/types";
import type { ResumeLint } from "@/lib/lint/types";
import { pluralize } from "@/lib/utils";

export type StatusChip = { status: CheckStatus; label: string };

// Only uploads were checked: scratch, sample and tailored resumes get no chip.
export function reportChip(report: RecruiterReport | undefined): StatusChip | null {
  if (!report) return null;
  const { fail, warn } = report.counts;
  if (fail > 0) return { status: "fail", label: pluralize(fail, "file problem") };
  if (warn > 0) return { status: "warn", label: pluralize(warn, "file warning") };
  return { status: "pass", label: "File reads cleanly" };
}

export function linesChip(lint: ResumeLint): StatusChip | null {
  const { bullets, withIssues } = lint.totals;
  if (bullets === 0) return null;
  if (withIssues > 0) return { status: "warn", label: `${pluralize(withIssues, "line")} to improve` };
  return { status: "pass", label: "Lines look good" };
}
