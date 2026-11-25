import type { LintLanguage } from "../lang/types";
import {
  countWords,
  findPhrases,
  openerIndex,
  phraseAt,
  spanOf,
  type Span,
  type Token,
} from "./tokens";

export const TOO_SHORT_WORDS = 5;
const NO_METHOD_MAX_WORDS = 7;

const SPACES = /^\s+$/u;
const HYPHEN = /[-‐‑]/u;
const GLUED_AFTER = /^[/.\-‐‑][\p{L}\p{N}]/u;
const NUMERAL_SEQUENCE = /^\s*(?:[/&,\-‐‑–]|and|or|to|through)\s*(?:I{2,3}|IV|VI{0,3}|IX|X)\b/;
const NO_WORDS: ReadonlySet<string> = new Set();

export function tenseSpan(
  tokens: readonly Token[],
  text: string,
  pack: LintLanguage,
): { span: Span; past: string } | null {
  const token = tokens[openerIndex(tokens, text, pack.openerSkips)];
  const past = token ? pack.tense?.pastOf.get(token.lower) : undefined;
  if (!token || !past || past === token.lower) return null;
  return { span: spanOf(token, token, text, 1), past };
}

export function resultMarker(
  tokens: readonly Token[],
  text: string,
  pack: LintLanguage,
): Span | null {
  const result = pack.result;
  if (!result) return null;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (result.words.has(token.lower)) return spanOf(token, token, text, 1);
    const compound = result.suffixes.some(
      (suffix) => token.lower.length > suffix.length && token.lower.endsWith(suffix),
    );
    if (compound) return spanOf(token, token, text, 1);
    const phrase = phraseAt(tokens, i, text, result.phrases);
    if (phrase) return phrase;
  }
  return null;
}

export function lacksMethod(tokens: readonly Token[], text: string, pack: LintLanguage): boolean {
  const { result, method } = pack;
  if (!result || !method) return false;
  const first = tokens[openerIndex(tokens, text, pack.openerSkips)];
  const words = countWords(text);
  if (!first || !result.openers.has(first.lower)) return false;
  if (words > NO_METHOD_MAX_WORDS || words < TOO_SHORT_WORDS) return false;
  return !tokens.some((token, k) => {
    if (method.words.has(token.lower)) return true;
    if (k > 0 && method.gerund?.test(token.lower)) return true;
    if (phraseAt(tokens, k, text, method.phrases)) return true;
    const next = tokens[k + 1];
    return token.lower === method.lead?.word && next !== undefined && method.lead.next(next.lower);
  });
}

function isNumeralI(
  tokens: readonly Token[],
  k: number,
  text: string,
  context: ReadonlySet<string>,
): boolean {
  const token = tokens[k];
  if (!token || token.text !== "I") return false;
  const rest = text.slice(token.end);
  if (NUMERAL_SEQUENCE.test(rest)) return true;
  const prev = tokens[k - 1];
  if (!prev) return false;
  const gap = text.slice(prev.end, token.start);
  const singular = prev.lower.replace(/s$/, "");
  const numbered = context.has(prev.lower) || context.has(singular);
  if (numbered && /^\.?[\s\-‐‑]+$/u.test(gap)) return true;
  return /^ +$/.test(gap) && /^\p{Lu}/u.test(prev.text) && /^\s*(?:[,.;:)\]]|$)/.test(rest);
}

// An all-caps word like "MY" is a name, except the single letters "I" and "J'".
export function firstPerson(tokens: readonly Token[], text: string, pack: LintLanguage): Span[] {
  const words = pack.firstPerson?.words;
  if (!words) return [];
  const context = pack.romanNumeralContext ?? NO_WORDS;
  const hasLowercase = /\p{Ll}/u.test(text);
  const spans: Span[] = [];
  tokens.forEach((token, k) => {
    if (!words.has(token.lower)) return;
    if (GLUED_AFTER.test(text.slice(token.end, token.end + 2))) return;
    if (isNumeralI(tokens, k, text, context)) return;
    const shouting = /\p{L}{2,}/u.test(token.text) && token.text === token.text.toUpperCase();
    if (token.lower !== "i" && hasLowercase && shouting) return;
    spans.push(spanOf(token, token, text, 1));
  });
  return spans;
}

function isParticiple(word: string, passive: NonNullable<LintLanguage["passive"]>): boolean {
  if (passive.notPassive.has(word)) return false;
  if (passive.irregular.has(word)) return true;
  return word.length >= 4 && word.endsWith("ed") && !word.endsWith("eed");
}

export function passives(tokens: readonly Token[], text: string, pack: LintLanguage): Span[] {
  const passive = pack.passive;
  if (!passive) return [];
  const spaced = (a: Token, b: Token) => SPACES.test(text.slice(a.end, b.start));
  const spans: Span[] = [];
  tokens.forEach((aux, k) => {
    if (!passive.auxiliaries.has(aux.lower)) return;
    let j = k + 1;
    const adverb = tokens[j];
    if (adverb && /^\p{L}{3,}ly$/u.test(adverb.lower) && spaced(aux, adverb)) j += 1;
    const verb = tokens[j];
    const before = tokens[j - 1];
    if (verb && before && spaced(before, verb) && isParticiple(verb.lower, passive)) {
      spans.push(spanOf(aux, verb, text, j - k + 1));
    }
  });
  return spans;
}

export function vagueSpans(tokens: readonly Token[], text: string, pack: LintLanguage): Span[] {
  const vague = pack.vague;
  if (!vague) return [];
  return findPhrases(tokens, text, vague.index)
    .filter((span) => !HYPHEN.test(text.charAt(span.start - 1) + text.charAt(span.end)))
    .map((span) =>
      vague.dotted.has(span.key) && text.charAt(span.end) === "."
        ? { ...span, end: span.end + 1, text: `${span.text}.` }
        : span,
    );
}
