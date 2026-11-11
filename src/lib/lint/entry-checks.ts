import type { LintIssue, LintIssueId, LintSeverity } from "./types";

export type EntryCheckId =
  | "result"
  | "start"
  | "voice"
  | "stock"
  | "length"
  | "numbers"
  | "method"
  | "tense"
  | "passive"
  | "vague"
  | "repeat"
  | "stops";

type CheckRule = {
  id: EntryCheckId;
  label: string;
  issues: readonly LintIssueId[];
  only?: "ended" | "several";
};

export const RESULT_ISSUES: readonly LintIssueId[] = ["no-result", "duty"];

const RULES: readonly CheckRule[] = [
  { id: "result", label: "Says what changed", issues: RESULT_ISSUES },
  { id: "start", label: "Starts strong", issues: ["weak-start"] },
  { id: "voice", label: "No I, me or we", issues: ["first-person"] },
  { id: "stock", label: "No stock phrases", issues: ["stock-phrase"] },
  { id: "length", label: "Right length", issues: ["too-long", "too-short"] },
  { id: "numbers", label: "Has numbers", issues: ["no-number", "no-result"] },
  { id: "method", label: "Says how", issues: ["no-method"] },
  { id: "tense", label: "Past tense", issues: ["tense"], only: "ended" },
  { id: "passive", label: "Says who did it", issues: ["passive"] },
  { id: "vague", label: "No vague words", issues: ["vague"] },
  { id: "repeat", label: "No repeated lines", issues: ["duplicate"] },
  { id: "stops", label: "Full stops match", issues: ["punctuation"], only: "several" },
];

export type CheckedLine = { id: string; issues: readonly LintIssue[] };

export type EntryCheck = {
  id: EntryCheckId;
  label: string;
  lineIds: string[];
  severity: LintSeverity | null;
};

export function entryChecks(lines: readonly CheckedLine[], ended: boolean): EntryCheck[] {
  if (lines.length === 0) return [];
  const applies = (rule: CheckRule) =>
    rule.only === undefined || (rule.only === "ended" ? ended : lines.length > 1);
  return RULES.filter(applies).map((rule) => {
    const lineIds: string[] = [];
    let high = false;
    for (const line of lines) {
      const hits = line.issues.filter((issue) => rule.issues.includes(issue.id));
      if (hits.length === 0) continue;
      lineIds.push(line.id);
      if (hits.some((issue) => issue.severity === "high")) high = true;
    }
    const severity: LintSeverity | null = lineIds.length === 0 ? null : high ? "high" : "low";
    return { id: rule.id, label: rule.label, lineIds, severity };
  });
}
