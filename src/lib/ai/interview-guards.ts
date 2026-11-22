import { maskInventedNumbers } from "./guards";

// Facts about the person must come from the resume or the post; general know-how needs no source.

const WORD = /[\p{L}\p{N}']+/gu;
const BRACKETED = /\[[^\]]*\]/g;
const STEM_CHARS = 5;
const SENTENCE_END = /(?:^|[.!?:;"“(])$/u;
const ONLY_I = /^I(?:'|’|$)/u;

export function wordsOf(text: string): string[] {
  return Array.from(text.toLowerCase().matchAll(WORD), (match) => match[0]);
}

export function stem(word: string): string {
  return word.slice(0, STEM_CHARS);
}

export function namesIn(text: string): string[] {
  const plain = text.replace(BRACKETED, " ");
  const names: string[] = [];
  for (const match of plain.matchAll(WORD)) {
    const word = match[0];
    if (ONLY_I.test(word)) continue;
    const startsSentence = SENTENCE_END.test(plain.slice(0, match.index).trimEnd());
    const innerCapital = /\p{Lu}/u.test(word.slice(1));
    if (innerCapital || (/^\p{Lu}/u.test(word) && !startsSentence)) names.push(word);
  }
  return names;
}

export type Sources = { texts: readonly string[]; known: Set<string> };

export function sourcesOf(texts: readonly string[]): Sources {
  return { texts, known: new Set(texts.flatMap((source) => wordsOf(source).map(stem))) };
}

// "you'd", "you would" and "how would you" are hypotheticals, not claims about the person's past.
const CLAIM =
  /\b(?:i|i'm|i've|i'd|my|mine|your|yours|you've|you have|you had|you were|did you|have you|were you|had you)\b|\byou (?:\p{L}+ed|built|led|ran|made|wrote|took|chose|picked|set|got|grew|cut|drove|owned|shipped|won|bought|sold|spent|kept|brought|began|found|saw|did)\b/iu;
// In the general rounds' points, these openers point at the person's own material.
const PERSONAL_OPENER =
  /^(?:bring up|mention|cite|quote|lead with|open with|start with|end with|close with|point to|highlight|talk about|tell|share|use|say)\b/i;

export function claimsAboutPerson(sentence: string, openers = false): boolean {
  const text = sentence.replace(BRACKETED, " ");
  return CLAIM.test(text) || (openers && PERSONAL_OPENER.test(text.trim()));
}

export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?]["”’)]?)\s+(?=["“(]?\p{Lu})/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function unknownName(sentence: string, known: Set<string>): boolean {
  return namesIn(sentence).some((name) => !known.has(stem(name.toLowerCase())));
}

export type PersonGuard = {
  // Every sentence counts as speaking about the person, as in a deep-dive question.
  personal?: boolean;
  // Openers like "Mention" or "Lead with" also count, as in the general rounds' points.
  openers?: boolean;
};

// A sentence about the person gets unsourced numbers masked, and drops the text if it names something unsourced.
export function guardPersonFacts(
  text: string,
  sources: Sources,
  guard: PersonGuard = {},
): string | null {
  const out: string[] = [];
  for (const sentence of sentencesOf(text)) {
    if (!(guard.personal || claimsAboutPerson(sentence, guard.openers))) {
      out.push(sentence);
      continue;
    }
    if (unknownName(sentence, sources.known)) return null;
    out.push(maskInventedNumbers(sentence, sources.texts));
  }
  return out.length > 0 ? out.join(" ") : null;
}
