import { CLICHES, UNBACKED, upgradedVerbs } from "./writing-guards";

// The server writes these and the browser reads them back, so a warning goes away once an edit fixes it.

export function fillInWarning(blanks: readonly string[], hint: string): string {
  return `Fill in ${blanks.join(", ")} ${hint}`;
}

export function verbWarning(verb: string, quotedLine: string): string {
  return `Check “${verb}”. Your resume says ${quotedLine}.`;
}

export function unbackedWarning(phrase: string): string {
  return `Check “${phrase}”: only you know that. Keep it if it's true.`;
}

export function clicheWarning(phrases: readonly string[]): string {
  return `Swap ${phrases.map((phrase) => `“${phrase}”`).join(", ")} for your own words. Recruiters skim past it.`;
}

const FILL_IN = /^Fill in ((?:\[[^\]\n]+\](?:, )?)+) (.*)$/s;
const VERB = /^Check “(.+?)”\. Your resume says “(.+)”\.$/s;
const UNBACKED_LINE = /^Check “(.+?)”: only you know that\./;
const CLICHE = /^Swap ((?:“[^”]+”(?:, )?)+) for your own words\./;

function fold(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ");
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWords(text: string, phrase: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(fold(phrase))}(?![\\p{L}\\p{N}])`, "u").test(text);
}

const PATTERNS = new Map(
  [...CLICHES, ...UNBACKED].map(({ label, pattern }) => [fold(label), pattern] as const),
);

// The label names a pattern on the server ("passionate" also catches "passion"), so the pattern decides.
function stillSays(text: string, folded: string, label: string): boolean {
  const pattern = PATTERNS.get(fold(label));
  return pattern ? pattern.test(text) : hasWords(folded, label);
}

const TOKEN = /[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu;

function hasToken(text: string, word: string): boolean {
  const wanted = fold(word);
  return (text.match(TOKEN) ?? []).some((token) => fold(token) === wanted);
}

// A whole quoted line is checked the way the server checked it; a line cut short at "…" can't be.
function verbStands(text: string, verb: string, line: string): boolean {
  if (line.endsWith("…")) return hasToken(text, verb);
  return upgradedVerbs(text, [line]).some((upgrade) => fold(upgrade.verb) === fold(verb));
}

function quotedIn(list: string): string[] {
  return [...list.matchAll(/“([^”]+)”/g)].map((match) => match[1] ?? "");
}

// Keeps only what still applies to the text as it reads now; a warning it can't read stays as it was.
export function liveWarnings(
  warnings: readonly string[],
  text: string,
  covered: readonly string[] = [],
): string[] {
  const now = fold(text);
  const skip = new Set(covered.map(fold));
  const out: string[] = [];
  for (const warning of warnings) {
    const fill = FILL_IN.exec(warning);
    if (fill) {
      const blanks = (fill[1]?.match(/\[[^\]\n]+\]/g) ?? []).filter(
        (blank) => !skip.has(fold(blank)) && now.includes(fold(blank)),
      );
      if (blanks.length) out.push(fillInWarning(blanks, fill[2] ?? ""));
      continue;
    }
    const verb = VERB.exec(warning);
    if (verb) {
      if (verbStands(text, verb[1] ?? "", verb[2] ?? "")) out.push(warning);
      continue;
    }
    const claim = UNBACKED_LINE.exec(warning);
    if (claim) {
      if (stillSays(text, now, claim[1] ?? "")) out.push(warning);
      continue;
    }
    const cliche = CLICHE.exec(warning);
    if (cliche) {
      const left = quotedIn(cliche[1] ?? "").filter((phrase) => stillSays(text, now, phrase));
      if (left.length) out.push(clicheWarning(left));
      continue;
    }
    out.push(warning);
  }
  return out;
}

const FIRST_NAME = /\[first name\]/i;

export function needsFirstName(...texts: string[]): boolean {
  return texts.some((text) => FIRST_NAME.test(text));
}
