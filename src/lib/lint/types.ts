// Client-safe. The lint runs in the browser on every keystroke, so it must be fast and pure.

export type LintIssueId =
  | "stock-phrase" // "results-driven", "team player", "passionate about"
  | "duty" // "responsible for", "duties included", "worked on": a duty, not what was done
  | "no-result" // no outcome at all: neither a number nor a word that says what changed
  | "no-number" // says what changed but not how much (digits, %, $, time, counts)
  | "no-method" // a short result with no "how" (XYZ's "by doing Z")
  | "weak-start" // starts with a weak verb or filler instead of a strong action verb
  | "first-person" // "I", "my", "we"
  | "tense" // present tense ("Build", "Managing") in a job that has ended
  | "too-long" // hard to scan: more than ~30 words / 2 lines
  | "too-short" // fewer than ~5 words, says nothing
  | "passive" // "was responsible", "were improved by"
  | "vague" // "various", "several", "etc.", "many things"
  | "duplicate"; // same or near-same line elsewhere in the resume

export type LintSeverity = "high" | "low";

export type LintIssue = {
  id: LintIssueId;
  severity: LintSeverity;
  // Plain-language message shown under the line, e.g. "What changed because of this? …"
  message: string;
  // The exact text that triggered it, when there is one (for highlighting).
  match: string | null;
};

// Where a line sits changes which checks apply. Result and number checks are for things someone
// did (jobs, projects, volunteering); a course list or an award line has no result to show.
export type LintContext = {
  kind: "work" | "other";
  // The job has an end date, so its lines read in past tense.
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
