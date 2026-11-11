import { OTTO } from "@/components/mascot/lines";
import type { PlanId, Usage, UsagePeriod } from "@/config/plans";
import type { FixInput } from "@/lib/ai/types";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { isApiError } from "@/lib/api/client";
import { resetSentence, thisPeriod } from "@/lib/usage-copy";

// Mirrors the caps in FixRequestSchema (src/lib/api/types.ts); fix-text.test.ts checks they agree.
export const FIX_ANSWER_LIMITS = { count: 5, questionChars: 300, answerChars: 500 } as const;

export type FixAnswer = FixInput["answers"][number];

// "signin" and "limit" mean the account gate already opened its dialog; Otto only explains.
// budget: the limit hit was the AI budget, not the line fixes.
export type FixProblem =
  | { kind: "error"; message: string }
  | { kind: "signin" }
  | { kind: "limit"; budget?: boolean };

const PLACEHOLDERS = /\[[^[\]\n]+\]/g;
const PLACEHOLDER = /\[[^[\]\n]+\]/;

export type SuggestionPart = { text: string; placeholder: boolean };

// Otto marks facts he doesn't know as [placeholders]; the dialog highlights them as blanks.
export function splitPlaceholders(text: string): SuggestionPart[] {
  const parts: SuggestionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDERS)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), placeholder: false });
    parts.push({ text: match[0], placeholder: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), placeholder: false });
  return parts;
}

export type MarkedPart = { text: string; marked: boolean };

// More than three marks on one line stop reading as a pen and start reading as noise.
const MAX_MARKS = 3;

// Splits a line around the words the lint flagged, so the dialog can mark exactly those. Each
// flagged phrase is marked once, at its first match, ignoring case; overlapping ones are skipped.
export function splitMarks(text: string, marks: readonly string[]): MarkedPart[] {
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const mark of marks) {
    const needle = mark.trim().toLowerCase();
    if (!needle) continue;
    const start = lower.indexOf(needle);
    if (start === -1) continue;
    const end = start + needle.length;
    if (ranges.some(([a, b]) => start < b && end > a)) continue;
    ranges.push([start, end]);
    if (ranges.length === MAX_MARKS) break;
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const parts: MarkedPart[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    if (start > last) parts.push({ text: text.slice(last, start), marked: false });
    parts.push({ text: text.slice(start, end), marked: true });
    last = end;
  }
  if (last < text.length) parts.push({ text: text.slice(last), marked: false });
  return parts;
}

export function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER.test(text);
}

// Only answered questions go back; an empty answer would read as "the answer is nothing".
export function buildAnswers(
  questions: readonly string[],
  answers: readonly string[],
): FixAnswer[] {
  return questions
    .map((question, index) => ({
      question: question.slice(0, FIX_ANSWER_LIMITS.questionChars),
      answer: (answers[index] ?? "").trim().slice(0, FIX_ANSWER_LIMITS.answerChars),
    }))
    .filter((pair) => pair.answer !== "")
    .slice(0, FIX_ANSWER_LIMITS.count);
}

export function fixErrorMessage(error: unknown): string {
  if (isApiError(error, "network_error")) return OTTO.errors.offline;
  if (isApiError(error, "rate_limited")) return OTTO.errors.rateLimited;
  if (isApiError(error, "ai_unavailable")) return OTTO.errors.aiUnavailable;
  return OTTO.errors.generic;
}

// `signedIn` is the account as it is now: after a "signin" problem the gate's dialog may already
// have signed the user back in, and nothing retries the request on its own.
export function problemMessage(
  problem: FixProblem,
  limit: number,
  signedIn = false,
  period?: UsagePeriod | null,
): string {
  switch (problem.kind) {
    case "limit":
      return problem.budget ? budgetReachedText(period) : OTTO.limit.reached("fix", limit, period);
    case "signin":
      return signedIn ? OTTO.fix.signedInAgain : OTTO.signIn.reason("fix");
    case "error":
      return problem.message;
  }
}

// Every paid plan and the trial have a real limit, so they see what's left. Free has none at all,
// so it hears what Pro adds instead (`trial`: whether the free trial is still open to them).
export function fixAllowanceText(
  usage: Usage | null | undefined,
  plan: PlanId | null | undefined,
  period?: UsagePeriod | null,
  trial = true,
): string | null {
  if (!plan || !usage) return null;
  if (usage.limit === 0) return OTTO.limit.none("fix", trial);
  const left = Math.max(0, usage.limit - usage.used);
  if (left === 0) return `No fixes left ${thisPeriod(period)}. ${resetSentence(period)}`;
  return `${left} of ${usage.limit} fixes left ${thisPeriod(period)}`;
}
