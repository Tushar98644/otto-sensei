export type Token = { text: string; lower: string; start: number; end: number };
export type Span = { start: number; end: number; text: string; key: string; tokens: number };

const WORD = /[\p{L}\p{M}\p{N}]+/gu;
export const CONTENT = /[\p{L}\p{N}]/u;
const PHRASE_GAP = /^[\s\-‐‑]+$/u;

function fold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

export function tokenize(text: string): Token[] {
  return Array.from(text.matchAll(WORD), (match) => ({
    text: match[0],
    lower: fold(match[0]),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

export function spanOf(first: Token, last: Token, text: string, tokens: number): Span {
  const matched = text.slice(first.start, last.end);
  return { start: first.start, end: last.end, text: matched, key: fold(matched), tokens };
}

export function phraseAt(
  tokens: readonly Token[],
  i: number,
  text: string,
  index: ReadonlyMap<string, readonly string[][]>,
): Span | null {
  const first = tokens[i];
  if (!first) return null;
  for (const words of index.get(first.lower) ?? []) {
    let last = first;
    let fits = true;
    for (let offset = 1; fits && offset < words.length; offset++) {
      const token = tokens[i + offset];
      fits =
        token !== undefined &&
        token.lower === words[offset] &&
        PHRASE_GAP.test(text.slice(last.end, token.start));
      if (token) last = token;
    }
    if (fits) return { ...spanOf(first, last, text, words.length), key: words.join(" ") };
  }
  return null;
}

export function findPhrases(
  tokens: readonly Token[],
  text: string,
  index: ReadonlyMap<string, readonly string[][]>,
): Span[] {
  const spans: Span[] = [];
  for (let i = 0; i < tokens.length;) {
    const span = phraseAt(tokens, i, text, index);
    if (span) spans.push(span);
    i += span ? span.tokens : 1;
  }
  return spans;
}

export function openerIndex(tokens: readonly Token[], text: string): number {
  let i = 0;
  const first = tokens[0];
  if (
    first &&
    /^\p{N}+$/u.test(first.text) &&
    /^[.)]\s/u.test(text.slice(first.end, first.end + 2))
  ) {
    i = 1;
  }
  const pronoun = tokens[i];
  if (pronoun && (pronoun.lower === "i" || pronoun.lower === "we")) i += 1;
  return i;
}

export function opener(
  tokens: readonly Token[],
  text: string,
  index: ReadonlyMap<string, readonly string[][]>,
): Span[] {
  const span = phraseAt(tokens, openerIndex(tokens, text), text, index);
  return span ? [span] : [];
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((chunk) => CONTENT.test(chunk)).length;
}
