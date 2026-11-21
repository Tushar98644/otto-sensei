import type { z } from "zod";
import { hasInventedNumbers, novelWordShare } from "@/lib/ai/guards";
import { wordCount } from "@/lib/ai/writing-guards";

export type Grade = { name: string; pass: boolean; detail: string };

export type Texts = string | readonly string[] | null | undefined;

export type BannedPhrase = string | RegExp | { label: string; pattern: RegExp };

export type LengthLimits = { min?: number; max?: number; unit?: "chars" | "words" };

export const AI_TELLS: readonly BannedPhrase[] = [
  "as an AI",
  "language model",
  "I cannot",
  "I'm sorry",
  "I apologize",
  "lorem ipsum",
  "TODO",
  { label: "{{template}}", pattern: /\{\{[^}]*\}\}/ },
];

const SHOWN_CHARS = 80;
const SHOWN_FAILURES = 3;

function listOf(texts: Texts): string[] {
  if (texts === null || texts === undefined) return [];
  return typeof texts === "string" ? [texts] : [...texts];
}

function shown(text: string): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > SHOWN_CHARS ? `${line.slice(0, SHOWN_CHARS - 1)}…` : line;
}

function verdict(name: string, failures: readonly string[], passed: string): Grade {
  if (failures.length === 0) return { name, pass: true, detail: passed };
  const more =
    failures.length > SHOWN_FAILURES ? ` (+${failures.length - SHOWN_FAILURES} more)` : "";
  return { name, pass: false, detail: `${failures.slice(0, SHOWN_FAILURES).join("; ")}${more}` };
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function patternOf(phrase: BannedPhrase): { label: string; pattern: RegExp } {
  if (typeof phrase === "string") {
    const words = escapeRegExp(phrase).replace(/'/g, "['’]");
    return {
      label: phrase,
      pattern: new RegExp(`(?<![\\p{L}\\p{N}])${words}(?![\\p{L}\\p{N}])`, "iu"),
    };
  }
  return phrase instanceof RegExp ? { label: phrase.source, pattern: phrase } : phrase;
}

export function matchesSchema(schema: z.ZodType, value: unknown, name = "schema"): Grade {
  const parsed = schema.safeParse(value);
  if (parsed.success) return { name, pass: true, detail: "matches the schema" };
  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  return verdict(name, issues, "");
}

export function withinLength(texts: Texts, limits: LengthLimits, name = "length"): Grade {
  const unit = limits.unit ?? "chars";
  const failures = listOf(texts).flatMap((text) => {
    const size = unit === "words" ? wordCount(text) : text.length;
    if (limits.min !== undefined && size < limits.min) {
      return [`${size} ${unit}, under ${limits.min}: "${shown(text)}"`];
    }
    if (limits.max !== undefined && size > limits.max) {
      return [`${size} ${unit}, over ${limits.max}: "${shown(text)}"`];
    }
    return [];
  });
  const range = `${limits.min ?? 0} to ${limits.max ?? "any"} ${unit}`;
  return verdict(name, failures, `every text is ${range}`);
}

export function noInventedNumbers(
  texts: Texts,
  sources: readonly string[],
  name = "invented-numbers",
): Grade {
  const failures = listOf(texts)
    .filter((text) => hasInventedNumbers(text, sources))
    .map((text) => {
      const numbers = text
        .split(/\s+/)
        .filter((word) => hasInventedNumbers(word, sources))
        .map((word) => word.replace(/^[^\p{L}\p{N}$€£¥]+|[^\p{L}\p{N}%+]+$/gu, ""));
      return `${numbers.join(", ")} not in the input: "${shown(text)}"`;
    });
  return verdict(name, failures, "every number comes from the input");
}

export function novelWordsAtMost(
  texts: Texts,
  source: string,
  max: number,
  name = "novel-words",
): Grade {
  const share = novelWordShare(listOf(texts), source);
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  const detail = `${percent(share)} of words are not in the input (limit ${percent(max)})`;
  return { name, pass: share <= max, detail };
}

export function noBannedPhrases(
  texts: Texts,
  phrases: readonly BannedPhrase[],
  name = "banned-phrases",
): Grade {
  const all = listOf(texts);
  const failures = phrases.map(patternOf).flatMap(({ label, pattern }) => {
    const hit = all.find((text) => text.search(pattern) !== -1);
    return hit === undefined ? [] : [`"${label}" in "${shown(hit)}"`];
  });
  return verdict(name, failures, "no banned phrase");
}
