import { ELIDED, fold, type PhraseIndex } from "../lang/types";

export type Token = { text: string; lower: string; start: number; end: number };
export type Span = { start: number; end: number; text: string; key: string; tokens: number };

const WORD = /[\p{L}\p{M}\p{N}]+/gu;
export const CONTENT = /[\p{L}\p{N}]/u;
const PHRASE_GAP = /^[\s\-‐‑]+$/u;
const APOSTROPHE_THEN_LETTER = /^['’]\p{L}/u;

// With elisions, "l'équipe" reads as "l'" and "equipe", so French phrases match across the apostrophe.
export function tokenize(text: string, elisions = false): Token[] {
  return Array.from(text.matchAll(WORD), (match) => {
    const end = match.index + match[0].length;
    const lower = fold(match[0]);
    if (elisions && ELIDED.test(lower) && APOSTROPHE_THEN_LETTER.test(text.slice(end, end + 2))) {
      return {
        text: text.slice(match.index, end + 1),
        lower: `${lower}'`,
        start: match.index,
        end: end + 1,
      };
    }
    return { text: match[0], lower, start: match.index, end };
  });
}

export function spanOf(first: Token, last: Token, text: string, tokens: number): Span {
  const matched = text.slice(first.start, last.end);
  return { start: first.start, end: last.end, text: matched, key: fold(matched), tokens };
}

function joined(last: Token, token: Token, text: string): boolean {
  const gap = text.slice(last.end, token.start);
  return PHRASE_GAP.test(gap) || (gap === "" && last.lower.endsWith("'"));
}

export function phraseAt(
  tokens: readonly Token[],
  i: number,
  text: string,
  index: PhraseIndex,
): Span | null {
  const first = tokens[i];
  if (!first) return null;
  for (const words of index.get(first.lower) ?? []) {
    let last = first;
    let fits = true;
    for (let offset = 1; fits && offset < words.length; offset++) {
      const token = tokens[i + offset];
      fits = token !== undefined && token.lower === words[offset] && joined(last, token, text);
      if (token) last = token;
    }
    if (fits) return { ...spanOf(first, last, text, words.length), key: words.join(" ") };
  }
  return null;
}

export function findPhrases(tokens: readonly Token[], text: string, index: PhraseIndex): Span[] {
  const spans: Span[] = [];
  for (let i = 0; i < tokens.length;) {
    const span = phraseAt(tokens, i, text, index);
    if (span) spans.push(span);
    i += span ? span.tokens : 1;
  }
  return spans;
}

const MAX_SKIPPED = 2;

// The first real word: after a "1." and up to two words like "I", "we" or "j'ai".
export function openerIndex(
  tokens: readonly Token[],
  text: string,
  skips: ReadonlySet<string>,
): number {
  let i = 0;
  const first = tokens[0];
  if (
    first &&
    /^\p{N}+$/u.test(first.text) &&
    /^[.)]\s/u.test(text.slice(first.end, first.end + 2))
  ) {
    i = 1;
  }
  for (let skipped = 0; skipped < MAX_SKIPPED && skips.has(tokens[i]?.lower ?? ""); skipped++) {
    i += 1;
  }
  return i;
}

export function opener(
  tokens: readonly Token[],
  text: string,
  index: PhraseIndex,
  skips: ReadonlySet<string>,
): Span[] {
  const span = phraseAt(tokens, openerIndex(tokens, text, skips), text, index);
  return span ? [span] : [];
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((chunk) => CONTENT.test(chunk)).length;
}
