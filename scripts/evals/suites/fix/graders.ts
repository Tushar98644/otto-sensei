import { z } from "zod";
import { SUGGESTION_CHARS } from "@/lib/ai/fix-demo";
import { hasInventedNumbers } from "@/lib/ai/guards";
import type { FixInput, FixResult } from "@/lib/ai/types";
import { clichesIn, unbackedIn, verbsAdded, wordCount } from "@/lib/ai/writing-guards";
import {
  AI_TELLS,
  matchesSchema,
  noBannedPhrases,
  noInventedNumbers,
  novelWordsAtMost,
  withinLength,
  type BannedPhrase,
  type Grade,
} from "@/lib/evals/graders";
import { lintBullet } from "@/lib/lint/bullets";
import type { EvalCase, Grader } from "../../suite";

export type FixExpect = {
  needsAnswers?: boolean;
  // Each entry must appear in the suggestion, ignoring case; a list means any one of its options.
  keep?: readonly (string | readonly string[])[];
  avoid?: readonly BannedPhrase[];
};

export type FixCase = EvalCase<FixInput, FixResult, FixExpect>;

const MAX_SUGGESTION_WORDS = 29;
const MAX_PLACEHOLDERS = 3;
const MAX_PLACEHOLDER_WORDS = 4;
const MAX_NOVEL_SHARE = 0.5;
const MIN_COMPARED_WORDS = 4;

const ISSUE_CHARS = 200;
const QUESTION_CHARS = 200;
const SHOWN_CHARS = 60;

const FixResultSchema = z.object({
  issues: z.array(z.string().min(1).max(ISSUE_CHARS)).max(3),
  questions: z.array(z.string().min(1).max(QUESTION_CHARS)).max(3),
  suggestion: z.string().min(1).max(SUGGESTION_CHARS),
  needsAnswers: z.boolean(),
});

const PLACEHOLDER = /\[[^\]\n]+\]/g;
const REDACTION_TOKEN = /^\[\s*(?:NAME|EMAIL|PHONE|LINK)(?:[\s_-]*\d{1,3})?\s*\]$/i;
const NOT_A_VERB = new Set([
  ...["a", "an", "the", "this", "that", "these", "those"],
  ...["my", "our", "your", "their", "his", "her", "its"],
  ...["i", "we", "me", "us", "they", "he", "she", "it"],
]);
const GERUND = /^\p{L}{3,}ing$/u;
const ADVERB = /^\p{L}{5,}ly$/u;
// A single final s marks a plural noun ("Upgrades") or "Manages"; "Process" and "Focus" are spared.
const PLURAL_OR_THIRD_PERSON = /^\p{L}{2,}[^su]s$/u;
const SENTENCE_BREAK = /[.!?]["”’)]?\s+["“‘(]?[\p{Lu}\p{N}]/gu;
const ABBREVIATIONS = new Set(
  "inc ltd co corp llc dr mr mrs ms st jr sr vs no approx dept".split(" "),
);
const CLOSING_PUNCTUATION = /[.!?;:,]$/u;
const MIN_CAPS_LETTERS = 12;
const MAX_CAPS_SHARE = 0.6;
const BAD_SPACING = /\s[,;:!?]|\p{L},\p{L}|\s{2,}/u;
const SHORTHAND = /\s(?:->|=>|\+)\s/u;
const MULTIPLES: Readonly<Record<string, string>> = {
  twice: "2",
  doubled: "2",
  halved: "2 50",
  tripled: "3",
  quadrupled: "4",
};

function shown(text: string): string {
  return text.length > SHOWN_CHARS ? `${text.slice(0, SHOWN_CHARS - 1)}…` : text;
}

function gradeOf(name: string, problems: readonly string[], passed: string): Grade {
  return problems.length === 0
    ? { name, pass: true, detail: passed }
    : { name, pass: false, detail: problems.join("; ") };
}

const answersOf = (kase: FixCase) => kase.input.answers.map((entry) => entry.answer);

// The same sources fixBullet's own number guard trusts.
function sourcesOf(kase: FixCase): string[] {
  const { bullet, role } = kase.input;
  return [bullet, role.title, role.company, ...answersOf(kase)];
}

const withoutPlaceholders = (text: string) => text.replace(PLACEHOLDER, " ");

export function schemaGrade(output: FixResult): Grade {
  return matchesSchema(FixResultSchema, output);
}

export function suggestionLength(output: FixResult): Grade[] {
  return [
    withinLength(output.suggestion, { max: SUGGESTION_CHARS }, "suggestion-chars"),
    withinLength(
      output.suggestion,
      { max: MAX_SUGGESTION_WORDS, unit: "words" },
      "suggestion-words",
    ),
  ];
}

export function inventedNumbers(output: FixResult, kase: FixCase): Grade {
  return noInventedNumbers(output.suggestion, sourcesOf(kase));
}

export function aiTells(output: FixResult): Grade {
  return noBannedPhrases(
    [output.suggestion, ...output.issues, ...output.questions],
    AI_TELLS,
    "ai-tells",
  );
}

export function strongStart(output: FixResult): Grade {
  const name = "strong-start";
  const weak = lintBullet(output.suggestion).find(
    (issue) => issue.id === "duty" || issue.id === "weak-start",
  );
  if (weak) return { name, pass: false, detail: `opens with "${weak.match ?? ""}"` };
  const first = /^\S+/u.exec(output.suggestion.trim())?.[0] ?? "";
  const word = first.replace(/[^\p{L}\p{N}'’-]+$/u, "");
  if (!/^\p{L}/u.test(word))
    return { name, pass: false, detail: `opens with "${first}", not a verb` };
  const lower = word.toLowerCase();
  if (NOT_A_VERB.has(lower))
    return { name, pass: false, detail: `opens with "${word}", not a verb` };
  if (GERUND.test(lower))
    return { name, pass: false, detail: `opens with the -ing form "${word}"` };
  if (ADVERB.test(lower)) return { name, pass: false, detail: `opens with the adverb "${word}"` };
  if (PLURAL_OR_THIRD_PERSON.test(lower)) {
    return { name, pass: false, detail: `opens with "${word}", a noun or an -s verb` };
  }
  return { name, pass: true, detail: `opens with "${word}"` };
}

function sentenceBreaks(text: string): number {
  let breaks = 0;
  for (const match of text.matchAll(SENTENCE_BREAK)) {
    const word = (text.slice(0, match.index).split(/\s+/).at(-1) ?? "").replace(/^["“‘(]+/u, "");
    if (word.includes(".") || /^\p{L}$/u.test(word) || ABBREVIATIONS.has(word.toLowerCase())) {
      continue;
    }
    breaks += 1;
  }
  return breaks;
}

function mostlyCapitals(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  const capitals = letters.filter((letter) => /\p{Lu}/u.test(letter)).length;
  return letters.length >= MIN_CAPS_LETTERS && capitals / letters.length > MAX_CAPS_SHARE;
}

export function cleanLine(output: FixResult): Grade {
  const text = output.suggestion.trim();
  const problems: string[] = [];
  if (/^\p{Ll}/u.test(text)) problems.push("starts in lowercase");
  const breaks = sentenceBreaks(text);
  if (breaks > 0) problems.push(`${breaks + 1} sentences`);
  const closing = CLOSING_PUNCTUATION.exec(text)?.[0];
  if (closing) problems.push(`ends with "${closing}"`);
  if (mostlyCapitals(text)) problems.push("mostly capitals");
  const spacing = BAD_SPACING.exec(text)?.[0];
  if (spacing) problems.push(`odd spacing at "${spacing.trim() || spacing}"`);
  const shorthand = SHORTHAND.exec(text)?.[0];
  if (shorthand) problems.push(`shorthand "${shorthand.trim()}"`);
  return gradeOf("clean-line", problems, "one clean sentence, no closing punctuation");
}

export function noFirstPerson(output: FixResult): Grade {
  const hits = lintBullet(output.suggestion)
    .filter((issue) => issue.id === "first-person")
    .map((issue) => `"${issue.match ?? ""}"`);
  return gradeOf(
    "no-first-person",
    hits.length ? [`uses ${hits.join(", ")}`] : [],
    "no first person",
  );
}

export function noStockPhrases(output: FixResult, kase: FixCase): Grade {
  const lint = lintBullet(output.suggestion)
    .filter((issue) => issue.id === "stock-phrase")
    .map((issue) => issue.match ?? "");
  const found = [...new Set([...lint, ...clichesIn(output.suggestion, sourcesOf(kase))])];
  return gradeOf(
    "stock-phrases",
    found.length ? [`uses ${found.map((phrase) => `"${phrase}"`).join(", ")}`] : [],
    "no stock phrases",
  );
}

export function unbackedDetails(output: FixResult, kase: FixCase): Grade {
  const found = unbackedIn(output.suggestion, sourcesOf(kase));
  return gradeOf(
    "unbacked-details",
    found.length
      ? [`adds ${found.map((phrase) => `"${phrase}"`).join(", ")} the input never says`]
      : [],
    "adds no when or how often",
  );
}

function multiplesIn(text: string): string {
  return (text.toLowerCase().match(/\p{L}+/gu) ?? [])
    .map((word) => MULTIPLES[word] ?? "")
    .join(" ");
}

export function keptNumbers(output: FixResult, kase: FixCase): Grade {
  const known = [output.suggestion, multiplesIn(output.suggestion)];
  const dropped = [kase.input.bullet, ...answersOf(kase)]
    .flatMap((text) => text.split(/\s+/))
    .filter((word) => hasInventedNumbers(word, known))
    .map((word) => word.replace(/^[^\p{L}\p{N}$€£¥]+|[^\p{L}\p{N}%+]+$/gu, ""));
  const unique = [...new Set(dropped)];
  return gradeOf(
    "kept-numbers",
    unique.length ? [`drops ${unique.join(", ")} from the line or answers`] : [],
    "keeps every number from the line and answers",
  );
}

export function keptFacts(output: FixResult, kase: FixCase): Grade {
  const text = output.suggestion.toLowerCase();
  const missing = (kase.expect?.keep ?? [])
    .map((fact) => (typeof fact === "string" ? [fact] : fact))
    .filter((options) => !options.some((option) => text.includes(option.toLowerCase())))
    .map((options) => options.map((option) => `"${option}"`).join(" or "));
  return gradeOf(
    "kept-facts",
    missing.length ? [`missing ${missing.join(", ")}`] : [],
    "keeps the listed facts",
  );
}

export function avoidedClaims(output: FixResult, kase: FixCase): Grade {
  return noBannedPhrases(output.suggestion, kase.expect?.avoid ?? [], "avoided-claims");
}

export function noClaimUpgrade(output: FixResult, kase: FixCase): Grade {
  const source = [kase.input.bullet, ...answersOf(kase)].join("\n");
  const added = verbsAdded(source, output.suggestion);
  return gradeOf(
    "no-claim-upgrade",
    added.length
      ? [
          `the input only says the person helped, but the suggestion claims ${added.map((verb) => `"${verb}"`).join(", ")}`,
        ]
      : [],
    "keeps the person's own part",
  );
}

export function placeholdersFit(output: FixResult): Grade {
  const found = output.suggestion.match(PLACEHOLDER) ?? [];
  const problems: string[] = [];
  if (found.length > MAX_PLACEHOLDERS) {
    problems.push(`${found.length} placeholders, over ${MAX_PLACEHOLDERS}`);
  }
  for (const placeholder of new Set(found)) {
    if (REDACTION_TOKEN.test(placeholder)) {
      problems.push(`${placeholder} is a hidden personal detail left in`);
    } else if (wordCount(placeholder) > MAX_PLACEHOLDER_WORDS) {
      problems.push(`${shown(placeholder)} is over ${MAX_PLACEHOLDER_WORDS} words`);
    }
  }
  return gradeOf(
    "placeholders",
    problems,
    `${found.length} short placeholder${found.length === 1 ? "" : "s"}`,
  );
}

export function needsAnswers(output: FixResult, kase: FixCase): Grade {
  const expected = kase.expect?.needsAnswers;
  return {
    name: "needs-answers",
    pass: expected === undefined || output.needsAnswers === expected,
    detail:
      expected === undefined
        ? `needsAnswers is ${output.needsAnswers}, either is fine`
        : `needsAnswers is ${output.needsAnswers}, expected ${expected}`,
  };
}

export function questionsFit(output: FixResult, kase: FixCase): Grade {
  const asked = output.questions.length;
  const answered = kase.input.answers.length > 0;
  const problems: string[] = [];
  if (answered && asked > 0) problems.push(`asks ${asked} after answers were given`);
  if (!answered && output.needsAnswers && asked === 0) {
    problems.push("leaves placeholders but asks nothing");
  }
  if (!answered && kase.expect?.needsAnswers === false && asked > 0) {
    problems.push(`asks ${asked} though the line has what it needs`);
  }
  const notQuestions = output.questions.filter((question) => !question.trim().endsWith("?"));
  if (notQuestions[0] !== undefined) problems.push(`not a question: "${shown(notQuestions[0])}"`);
  return gradeOf(
    "questions-fit",
    problems,
    `${asked} question${asked === 1 ? "" : "s"}, as expected`,
  );
}

export function novelWords(output: FixResult, kase: FixCase): Grade {
  if (wordCount(kase.input.bullet) < MIN_COMPARED_WORDS) {
    return { name: "novel-words", pass: true, detail: "the line is too short to compare" };
  }
  const asked = kase.input.answers.map((entry) => entry.question);
  return novelWordsAtMost(
    withoutPlaceholders(output.suggestion),
    [...sourcesOf(kase), ...asked].join("\n"),
    MAX_NOVEL_SHARE,
  );
}

export const FIX_GRADERS: readonly Grader<FixInput, FixResult, FixExpect>[] = [
  schemaGrade,
  suggestionLength,
  inventedNumbers,
  keptNumbers,
  keptFacts,
  avoidedClaims,
  noClaimUpgrade,
  strongStart,
  cleanLine,
  noFirstPerson,
  noStockPhrases,
  unbackedDetails,
  aiTells,
  placeholdersFit,
  needsAnswers,
  questionsFit,
  novelWords,
];
