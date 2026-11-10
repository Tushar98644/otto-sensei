import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { aiEnabled } from "@/lib/env";
import { runStructured } from "./client";
import { demoFix, SUGGESTION_CHARS, type PreparedFix } from "./fix-demo";
import { maskInventedNumbers } from "./guards";
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
// The client sends questions back with the answers, and the API caps those at 300 characters.
const QUESTION_CHARS = 200;
// Same caps as FixRequestSchema, for callers that skip the route.
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

function fixMessage(fix: PreparedFix): string {
  const { title, company } = fix.role;
  const role =
    [title && `Title: ${title}`, company && `Company: ${company}`].filter(Boolean).join("\n") ||
    "Not given";
  const parts = [tag("role", role), tag("line", fix.bullet)];
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

// A line or an answer can hold a link or an email ("Launched shop.acme.com/v2"). The model gets
// placeholders; finalizeFix() then checks the restored output against the real text.
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

// A suggestion with placeholders but no questions would leave the person stuck, so ask for each
// placeholder directly.
function placeholderQuestions(suggestion: string): string[] {
  return placeholdersIn(suggestion)
    .slice(0, MAX_QUESTIONS)
    .map((placeholder) => `What should go in ${placeholder}?`);
}

// After answers, some models still bracket the facts the person just gave ("a [30%] result").
// Those are facts now, not blanks, so a bracket whose text appears in an answer comes off; a real
// gap like "[number]" stays.
function unwrapAnswered(text: string, answers: readonly string[]): string {
  const said = answers.join(" ").toLowerCase();
  return text.replace(/\[([^\]]+)\]/g, (match: string, inner: string) => {
    const value = inner.trim();
    return value && said.includes(value.toLowerCase()) ? value : match;
  });
}

function finalizeFix(output: FixOutput, fix: PreparedFix): FixResult {
  const answered = fix.answers.length > 0;
  // Every number has to come from the line, the role or the answers; any other is made up.
  const sources = [
    fix.bullet,
    fix.role.title,
    fix.role.company,
    ...fix.answers.map((entry) => entry.answer),
  ];
  const masked = maskInventedNumbers(asResumeLine(output.suggestion), sources);
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

/**
 * Improves one resume line without inventing facts. First call (no answers): issues, up to 3
 * questions for missing facts, and a suggestion with [placeholders]. Second call (with answers):
 * a final suggestion that uses only the original line plus the answers; questions = [].
 * Without an API key returns a deterministic demo result built from lintBullet().
 * Throws AIError on refusal, rate limit, outage, or schema-invalid output, and "too_long" for a
 * line over TEXT_LIMITS.bulletChars.
 */
export async function fixBullet(input: FixInput): Promise<FixResult> {
  const fix = prepare(input);
  if (!fix.bullet) throw new AIError("invalid_output", "There is no line to fix");
  if (fix.bullet.length > TEXT_LIMITS.bulletChars) {
    throw new AIError("too_long", `The line is over ${TEXT_LIMITS.bulletChars} characters`);
  }
  if (!aiEnabled()) return demoFix(fix);

  const redactor = createRedactor();
  const output = await runStructured({
    task: "fix",
    system: FIX_SYSTEM_PROMPT,
    user: fixMessage(redactFix(fix, redactor)),
    schema: FixOutputSchema,
    // Medium bought nothing measurable over low on the same lines and was about 3x slower on the
    // answer step (AUDIT-cost-and-findability.md, "Fix: low vs medium effort").
    effort: "low",
  });
  return finalizeFix(redactor.restoreDeep(output), fix);
}
