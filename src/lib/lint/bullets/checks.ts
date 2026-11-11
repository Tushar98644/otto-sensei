import {
  countWords,
  findPhrases,
  openerIndex,
  phraseAt,
  spanOf,
  type Span,
  type Token,
} from "./tokens";
import {
  FIRST_PERSON,
  IRREGULAR_PARTICIPLES,
  METHOD_WORDS,
  NOT_PASSIVE,
  PASSIVE_AUXILIARIES,
  PAST_OF,
  RESULT_OPENERS,
  RESULT_PHRASES,
  RESULT_WORDS,
  ROMAN_NUMERAL_CONTEXT,
  VAGUE_INDEX,
} from "./words";

export const TOO_SHORT_WORDS = 5;
const NO_METHOD_MAX_WORDS = 7;

const SPACES = /^\s+$/u;
const HYPHEN = /[-‐‑]/u;
const GLUED_AFTER = /^[/.\-‐‑][\p{L}\p{N}]/u;
const NUMERAL_SEQUENCE = /^\s*(?:[/&,\-‐‑–]|and|or|to|through)\s*(?:I{2,3}|IV|VI{0,3}|IX|X)\b/;

export function tenseSpan(
  tokens: readonly Token[],
  text: string,
): { span: Span; past: string } | null {
  const token = tokens[openerIndex(tokens, text)];
  const past = token ? PAST_OF.get(token.lower) : undefined;
  if (!token || !past || past === token.lower) return null;
  return { span: spanOf(token, token, text, 1), past };
}

export function resultMarker(tokens: readonly Token[], text: string): Span | null {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (RESULT_WORDS.has(token.lower)) return spanOf(token, token, text, 1);
    const phrase = phraseAt(tokens, i, text, RESULT_PHRASES);
    if (phrase) return phrase;
  }
  return null;
}

export function lacksMethod(tokens: readonly Token[], text: string): boolean {
  const first = tokens[openerIndex(tokens, text)];
  const words = countWords(text);
  if (!first || !RESULT_OPENERS.has(first.lower)) return false;
  if (words > NO_METHOD_MAX_WORDS || words < TOO_SHORT_WORDS) return false;
  return !tokens.some((token, k) => {
    if (METHOD_WORDS.has(token.lower)) return true;
    if (k > 0 && token.lower.length > 4 && token.lower.endsWith("ing")) return true;
    const next = tokens[k + 1];
    return token.lower === "by" && next !== undefined && !/^\p{N}/u.test(next.text);
  });
}

function isNumeralI(tokens: readonly Token[], k: number, text: string): boolean {
  const token = tokens[k];
  if (!token || token.text !== "I") return false;
  const rest = text.slice(token.end);
  if (NUMERAL_SEQUENCE.test(rest)) return true;
  const prev = tokens[k - 1];
  if (!prev) return false;
  const gap = text.slice(prev.end, token.start);
  const singular = prev.lower.replace(/s$/, "");
  const context = ROMAN_NUMERAL_CONTEXT.has(prev.lower) || ROMAN_NUMERAL_CONTEXT.has(singular);
  if (context && /^\.?[\s\-‐‑]+$/u.test(gap)) return true;
  return /^ +$/.test(gap) && /^\p{Lu}/u.test(prev.text) && /^\s*(?:[,.;:)\]]|$)/.test(rest);
}

export function firstPerson(tokens: readonly Token[], text: string): Span[] {
  const hasLowercase = /\p{Ll}/u.test(text);
  const spans: Span[] = [];
  tokens.forEach((token, k) => {
    if (!FIRST_PERSON.has(token.lower)) return;
    if (GLUED_AFTER.test(text.slice(token.end, token.end + 2))) return;
    if (isNumeralI(tokens, k, text)) return;
    if (token.lower !== "i" && hasLowercase && token.text === token.text.toUpperCase()) return;
    spans.push(spanOf(token, token, text, 1));
  });
  return spans;
}

function isParticiple(word: string): boolean {
  if (NOT_PASSIVE.has(word)) return false;
  if (IRREGULAR_PARTICIPLES.has(word)) return true;
  return word.length >= 4 && word.endsWith("ed") && !word.endsWith("eed");
}

export function passives(tokens: readonly Token[], text: string): Span[] {
  const spaced = (a: Token, b: Token) => SPACES.test(text.slice(a.end, b.start));
  const spans: Span[] = [];
  tokens.forEach((aux, k) => {
    if (!PASSIVE_AUXILIARIES.has(aux.lower)) return;
    let j = k + 1;
    const adverb = tokens[j];
    if (adverb && /^\p{L}{3,}ly$/u.test(adverb.lower) && spaced(aux, adverb)) j += 1;
    const verb = tokens[j];
    const before = tokens[j - 1];
    if (verb && before && spaced(before, verb) && isParticiple(verb.lower)) {
      spans.push(spanOf(aux, verb, text, j - k + 1));
    }
  });
  return spans;
}

export function vagueSpans(tokens: readonly Token[], text: string): Span[] {
  return findPhrases(tokens, text, VAGUE_INDEX)
    .filter((span) => !HYPHEN.test(text.charAt(span.start - 1) + text.charAt(span.end)))
    .map((span) =>
      span.key === "etc" && text.charAt(span.end) === "."
        ? { ...span, end: span.end + 1, text: `${span.text}.` }
        : span,
    );
}
