import { lintBullet } from "@/lib/lint/bullets";
import { bulletText } from "@/lib/resume/sections";
import { capitalize, clipWords, hasPlaceholder } from "./text";
import type { FixResult } from "./types";

export type PreparedFix = {
  bullet: string;
  role: { title: string; company: string };
  answers: { question: string; answer: string }[];
};

export const SUGGESTION_CHARS = 300;
const MAX_ISSUES = 3;
const NUMBERS_QUESTION = "Roughly how many people, dollars, or hours did this affect?";
const RESULT_QUESTION = "What changed because of this work?";
const RESULT_PLACEHOLDER = "[result]";
const TRAILING_PUNCTUATION = /[\s.;,]+$/u;

function cleanLine(line: string, weakStart: string | null): string {
  let text = (bulletText(line) ?? line.trim()).replace(/^(?:I|We)\s+/u, "");
  if (weakStart && text.toLowerCase().startsWith(weakStart.toLowerCase())) {
    text = text.slice(weakStart.length);
  }
  text = text.replace(/^[\s,:;–—-]+/u, "").replace(TRAILING_PUNCTUATION, "");
  const cleaned = capitalize(text);
  return cleaned || line.trim().replace(TRAILING_PUNCTUATION, "");
}

function lowerFirst(text: string): string {
  return text.replace(/^\p{Lu}(?=\p{Ll})/u, (letter) => letter.toLowerCase());
}

export function demoFix(fix: PreparedFix): FixResult {
  const lint = lintBullet(fix.bullet);
  const found = new Set(lint.map((issue) => issue.id));
  const missingNumber = found.has("no-number") || found.has("no-result") || found.has("duty");
  const weakStart =
    lint.find((issue) => issue.id === "duty" || issue.id === "weak-start")?.match ?? null;
  const base = cleanLine(fix.bullet, weakStart);
  const answered = fix.answers.length > 0;
  const answers = fix.answers
    .map((entry) => lowerFirst(entry.answer.replace(TRAILING_PUNCTUATION, "").trim()))
    .filter(Boolean);

  let suggestion: string;
  if (answers.length > 0) {
    suggestion = clipWords(`${base}, ${answers.join(", ")}`, SUGGESTION_CHARS);
  } else if (missingNumber) {
    const room = SUGGESTION_CHARS - RESULT_PLACEHOLDER.length - 1;
    suggestion = `${clipWords(base, room)} ${RESULT_PLACEHOLDER}`;
  } else {
    suggestion = clipWords(base, SUGGESTION_CHARS);
  }

  const questions: string[] = [];
  if (!answered && (missingNumber || found.has("vague"))) questions.push(NUMBERS_QUESTION);
  if (!answered && missingNumber) questions.push(RESULT_QUESTION);

  return {
    issues: lint.slice(0, MAX_ISSUES).map((issue) => issue.message),
    questions,
    suggestion,
    needsAnswers: hasPlaceholder(suggestion),
  };
}
