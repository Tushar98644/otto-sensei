export type LintIssueId =
  | "stock-phrase"
  | "duty"
  | "no-result"
  | "no-number"
  | "no-method"
  | "weak-start"
  | "first-person"
  | "tense"
  | "too-long"
  | "too-short"
  | "passive"
  | "vague"
  | "duplicate"
  | "punctuation";

export type LintSeverity = "high" | "low";

export type LintIssue = {
  id: LintIssueId;
  severity: LintSeverity;
  message: string;
  match: string | null;
};

export type LintContext = {
  kind: "work" | "other";
  ended?: boolean;
};

export type ResumeLint = {
  byBullet: Record<string, LintIssue[]>;
  totals: {
    bullets: number;
    withIssues: number;
    withNumbers: number;
    highSeverity: number;
  };
};
