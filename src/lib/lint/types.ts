import type { ContentLang } from "@/lib/i18n/languages";

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

// Keys of the lint namespace's issues messages (src/i18n/messages/en/lint.ts).
export type LintMessageId =
  | "stock"
  | "weakStart"
  | "duty"
  | "tense"
  | "noResult"
  | "noNumber"
  | "noNumberWord"
  | "noMethod"
  | "firstPersonTeam"
  | "firstPersonSelf"
  | "passive"
  | "vagueList"
  | "vagueThing"
  | "vagueCount"
  | "tooLongWords"
  | "tooLongChars"
  | "tooShort"
  | "duplicate"
  | "stopMost"
  | "stopFirst"
  | "noneMost"
  | "noneFirst";

export type LintParams = Readonly<Record<string, string | number | readonly string[]>>;

export type LintMessage = { text: string; id: LintMessageId; params: LintParams };

// messageId and params rebuild the message in any language; they're non-enumerable, so the English shape stays the same.
export type LintIssue = {
  id: LintIssueId;
  severity: LintSeverity;
  message: string;
  match: string | null;
  readonly messageId?: LintMessageId;
  readonly params?: LintParams;
};

export type LintContext = {
  kind: "work" | "other";
  ended?: boolean;
  // The resume's language; English when not given.
  lang?: ContentLang;
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
