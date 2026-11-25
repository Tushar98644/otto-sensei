import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import type { Locale } from "@/i18n/config";
import { aiEnabled } from "@/lib/env";
import { languageOf } from "@/lib/i18n/detect";
import { runStructured } from "./client";
import { demoFix, SUGGESTION_CHARS, type PreparedFix } from "./fix-demo";
import { maskInventedNumbers } from "./guards";
import { guardLangs, languagesTag, type Languages } from "./languages";
import { FIX_SYSTEM_PROMPT } from "./prompts";
import { createRedactor, type Redactor } from "./redact";
import {
  asResumeLine,
  cleanList,
  clip,
  clipWords,
  hasPlaceholder,
  oneLine,
  placeholdersIn,
  tag,
} from "./text";
import { AIError, type FixInput, type FixResult } from "./types";

const MAX_ISSUES = 3;
const MAX_QUESTIONS = 3;
const ISSUE_CHARS = 200;
const QUESTION_CHARS = 200;
const MAX_ANSWERS = 5;
const ASKED_CHARS = 300;
const ANSWER_CHARS = 500;
const ROLE_CHARS = 200;

const FixOutputSchema = z.object({
  issues: z.array(z.string()).describe("1 to 3 short problems with the original line."),
  questions: z
    .array(z.string())
    .describe("Up to 3 short questions for missing facts. Empty when answers were given."),
  suggestion: z.string().describe("The improved line, with [placeholders] for missing facts."),
});

type FixOutput = z.infer<typeof FixOutputSchema>;

function prepare(input: FixInput): PreparedFix {
  return {
    bullet: oneLine(input.bullet),
    role: {
      title: clip(oneLine(input.role.title), ROLE_CHARS),
      company: clip(oneLine(input.role.company), ROLE_CHARS),
    },
    answers: input.answers
      .map((entry) => ({
        question: clip(oneLine(entry.question), ASKED_CHARS),
        answer: clip(oneLine(entry.answer), ANSWER_CHARS),
      }))
      .filter((entry) => entry.question || entry.answer)
      .slice(0, MAX_ANSWERS),
  };
}

function fixMessage(fix: PreparedFix, languages: Languages): string {
  const { title, company } = fix.role;
  const role =
    [title && `Title: ${title}`, company && `Company: ${company}`].filter(Boolean).join("\n") ||
    "Not given";
  const opening = languagesTag(languages);
  const parts = [...(opening ? [opening] : []), tag("role", role), tag("line", fix.bullet)];
  if (fix.answers.length > 0) {
    const answers = fix.answers.map(
      (entry) => `Q: ${entry.question}\nA: ${entry.answer || "(no answer)"}`,
    );
    parts.push(
      tag("answers", answers.join("\n\n")),
      "Write the final line from the original line and these answers.",
    );
  } else {
    parts.push("Improve this line.");
  }
  return parts.join("\n\n");
}

function redactFix(fix: PreparedFix, redactor: Redactor): PreparedFix {
  return {
    bullet: redactor.redact(fix.bullet),
    role: { title: redactor.redact(fix.role.title), company: redactor.redact(fix.role.company) },
    answers: fix.answers.map((entry) => ({
      question: redactor.redact(entry.question),
      answer: redactor.redact(entry.answer),
    })),
  };
}

function placeholderQuestions(suggestion: string): string[] {
  return placeholdersIn(suggestion)
    .slice(0, MAX_QUESTIONS)
    .map((placeholder) => `What should go in ${placeholder}?`);
}

function unwrapAnswered(text: string, answers: readonly string[]): string {
  const said = answers.join(" ").toLowerCase();
  return text.replace(/\[([^\]]+)\]/g, (match: string, inner: string) => {
    const value = inner.trim();
    return value && said.includes(value.toLowerCase()) ? value : match;
  });
}

function finalizeFix(output: FixOutput, fix: PreparedFix, languages: Languages): FixResult {
  const answered = fix.answers.length > 0;
  const sources = [
    fix.bullet,
    fix.role.title,
    fix.role.company,
    ...fix.answers.map((entry) => entry.answer),
  ];
  const masked = maskInventedNumbers(
    asResumeLine(output.suggestion),
    sources,
    guardLangs(languages.resume),
  );
  const filled = answered ? unwrapAnswered(masked, fix.answers.map((entry) => entry.answer)) : masked;
  const suggestion = clipWords(filled, SUGGESTION_CHARS);
  if (!/[\p{L}\p{N}]/u.test(suggestion)) {
    throw new AIError("invalid_output", "The AI model returned an empty suggestion");
  }

  const needsAnswers = hasPlaceholder(suggestion);
  let questions = answered ? [] : cleanList(output.questions, MAX_QUESTIONS, QUESTION_CHARS);
  if (needsAnswers && !answered && questions.length === 0) {
    questions = placeholderQuestions(suggestion);
  }

  return {
    issues: cleanList(output.issues, MAX_ISSUES, ISSUE_CHARS),
    questions,
    suggestion,
    needsAnswers,
  };
}

export type FixOptions = { ui?: Locale };

export async function fixBullet(input: FixInput, { ui = "en" }: FixOptions = {}): Promise<FixResult> {
  const fix = prepare(input);
  if (!fix.bullet) throw new AIError("invalid_output", "There is no line to fix");
  if (fix.bullet.length > TEXT_LIMITS.bulletChars) {
    throw new AIError("too_long", `The line is over ${TEXT_LIMITS.bulletChars} characters`);
  }
  if (!aiEnabled()) return demoFix(fix);

  const resume = input.lang ?? languageOf(`${fix.bullet}\n${fix.role.title}`);
  const languages: Languages = { resume, ui };
  const redactor = createRedactor();
  const output = await runStructured({
    task: "fix",
    system: FIX_SYSTEM_PROMPT,
    user: fixMessage(redactFix(fix, redactor), languages),
    schema: FixOutputSchema,
    effort: "low",
  });
  return finalizeFix(redactor.restoreDeep(output), fix, languages);
}
