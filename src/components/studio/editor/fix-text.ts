import type { OttoLines } from "@/components/mascot/lines";
import { PLANS, type PlanId, type Usage, type UsagePeriod } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import type { FixInput } from "@/lib/ai/types";
import { isApiError } from "@/lib/api/client";
import { resetSentenceIn, thisPeriodIn } from "../usage";

export type FixWords = {
  t: Messages["studioEditor"];
  usage: Messages["studio"]["usage"];
  format: Format;
  otto: OttoLines;
};

export const FIX_ANSWER_LIMITS = { count: 5, questionChars: 300, answerChars: 500 } as const;

export type FixAnswer = FixInput["answers"][number];

export type FixProblem =
  { kind: "error"; message: string } | { kind: "signin" } | { kind: "limit"; budget?: boolean };

const PLACEHOLDERS = /\[[^[\]\n]+\]/g;
const PLACEHOLDER = /\[[^[\]\n]+\]/;

export type SuggestionPart = { text: string; placeholder: boolean };

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

const MAX_MARKS = 3;

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

export function fixErrorMessage(error: unknown, otto: OttoLines): string {
  if (isApiError(error, "network_error")) return otto.errors.offline;
  if (isApiError(error, "rate_limited")) return otto.errors.rateLimited;
  if (isApiError(error, "ai_unavailable")) return otto.errors.aiUnavailable;
  return otto.errors.generic;
}

export function problemMessage(
  words: FixWords,
  problem: FixProblem,
  limit: number,
  signedIn = false,
  period?: UsagePeriod | null,
  plan?: PlanId | null,
): string {
  const { otto } = words;
  switch (problem.kind) {
    case "limit":
      if (problem.budget) return otto.budget(period);
      return plan === "free"
        ? otto.limit.freeUsed("fix", limit)
        : otto.limit.reached("fix", limit, period);
    case "signin":
      return signedIn ? words.t.otto.signedInAgain : otto.signIn.reason("fix");
    case "error":
      return problem.message;
  }
}

export function fixAllowanceText(
  { t, usage: u, format, otto }: FixWords,
  usage: Usage | null | undefined,
  plan: PlanId | null | undefined,
  period?: UsagePeriod | null,
  trial = true,
): string | null {
  if (!plan || !usage) return null;
  if (usage.limit === 0) return otto.limit.none("fix", trial);
  const left = Math.max(0, usage.limit - usage.used);
  if (left === 0) {
    const none = fmt(t.allowance.none, {
      period: thisPeriodIn(u, period),
      reset: resetSentenceIn(u, format, period),
    });
    if (plan !== "free") return none;
    return `${none} ${fmt(t.allowance.proHas, { plan: PLANS.pro.name, count: PLANS.pro.limits.fix })}`;
  }
  return fmt(t.allowance.left, { left, limit: usage.limit, period: thisPeriodIn(u, period) });
}
