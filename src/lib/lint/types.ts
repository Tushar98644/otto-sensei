// Client-safe. The lint runs in the browser on every keystroke, so it must be fast and pure.

export type LintIssueId =
  | "stock-phrase" // "results-driven", "team player", "responsible for"
  | "no-number" // no measurable result (digits, %, $, time, counts)
  | "weak-start" // starts with a weak verb or filler instead of a strong action verb
  | "first-person" // "I", "my", "we"
  | "too-long" // hard to scan: more than ~30 words / 2 lines
  | "too-short" // fewer than ~5 words, says nothing
  | "passive" // "was responsible", "were improved by"
  | "vague" // "various", "several", "etc.", "many things"
  | "duplicate"; // same or near-same line elsewhere in the resume

export type LintSeverity = "high" | "low";

export type LintIssue = {
  id: LintIssueId;
  severity: LintSeverity;
  // Plain-language message shown under the line, e.g. "Add a number: how many, how much, how fast?"
  message: string;
  // The exact text that triggered it, when there is one (for highlighting).
  match: string | null;
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
