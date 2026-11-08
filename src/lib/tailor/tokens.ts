import { AMBIGUOUS_WORDS, PHRASE_ALIASES, TOKEN_ALIASES } from "./aliases";

// Turns job keywords and resume text into the same canonical token stream, keeping each token's
// position in the original text so matches can quote it.

export type Token = {
  // Canonical form used for comparison: "nodejs", "api", "c++", ".net".
  value: string;
  // Source span in the original text. Tokens expanded from one alias ("AWS") share a span.
  start: number;
  end: number;
  // Only spaces, hyphens or slashes separate it from the previous token, so a multi-word term
  // matches "front end", "front-end" and "CI/CD" alike, but never across commas or lines.
  joined: boolean;
};

// Job keywords are terse labels; resume text is prose. Only ambiguous words treat them differently.
type Mode = "term" | "text";

type Word = { text: string; folded: string; start: number; end: number; gap: string };

// Letters and digits, optionally glued by ".", "&" or an apostrophe (Node.js, R&D, O'Reilly) and
// ending in "++" or "#" (C++, C#). A leading dot only counts in ".NET": elsewhere it's punctuation.
const WORD =
  /(?<![\p{L}\p{M}\p{N}.])\.net(?![\p{L}\p{M}\p{N}])|[\p{L}\p{M}\p{N}]+(?:[.&'’][\p{L}\p{M}\p{N}]+)*(?:\+\+|#(?![\p{L}\p{M}\p{N}]))?/giu;
// Only real .NET frameworks split off ".NET"; an email domain like "att.net" must not.
const DOT_NET_FRAMEWORK = /^(asp|ado|vb)(\.net(?:['’]s)?)$/i;
const SOFT_GAP = /^(?:[^\S\r\n]|[-‐‑/_])*$/u;
const HYPHEN = /^[-‐‑]$/u;

const PHRASES_BY_FIRST_WORD = indexPhrases();

function indexPhrases() {
  const index = new Map<string, (typeof PHRASE_ALIASES)[number][]>();
  for (const entry of PHRASE_ALIASES) {
    const first = entry[0][0] ?? "";
    index.set(first, [...(index.get(first) ?? []), entry]);
  }
  for (const list of index.values()) list.sort((a, b) => b[0].length - a[0].length);
  return index;
}

export function foldCase(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
}

function words(input: string): Word[] {
  const out: Word[] = [];
  let cursor = 0;
  const push = (text: string, start: number) => {
    const folded = foldCase(text).replace(/['’]s$/u, "");
    out.push({ text, folded, start, end: start + text.length, gap: input.slice(cursor, start) });
    cursor = start + text.length;
  };
  for (const match of input.matchAll(WORD)) {
    // "ASP.NET" splits so ".NET" matches on its own, with its own span for the evidence quote.
    const split = DOT_NET_FRAMEWORK.exec(match[0]);
    const framework = split?.[1];
    const suffix = split?.[2];
    if (framework && suffix) {
      push(framework, match.index);
      push(suffix, match.index + framework.length);
    } else {
      push(match[0], match.index);
    }
  }
  return out;
}

// Plural rule, applied the same way to keywords and resume text, so the result only has to be
// consistent, not good English: "APIs" -> "api", "libraries" -> "library", "classes" -> "class".
function singularize(word: string, original: string): string {
  if (/^\p{Lu}[\p{Lu}\p{N}]+s$/u.test(original)) return word.slice(0, -1);
  if (word.length < 4 || !/^\p{L}+$/u.test(word)) return word;
  // Already singular: "class", "analytics" (not "analytic"), "nodejs", "status", "redis". Short
  // ones like "apis" and "gpus" are plurals.
  if (/(?:ss|ics|js)$/.test(word) || (word.length > 4 && /(?:us|is)$/.test(word))) return word;
  if (word.endsWith("sses")) return word.slice(0, -2);
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

function canonical(
  word: Word,
  next: Word | undefined,
  mode: Mode,
  single: boolean,
): readonly string[] {
  const ambiguous = AMBIGUOUS_WORDS.get(word.folded);
  if (ambiguous) {
    const isName =
      mode === "term"
        ? single
        : word.text === ambiguous.spelling && !(next && HYPHEN.test(next.gap));
    return [isName ? ambiguous.canonical : word.folded];
  }
  const folded =
    word.folded.length > 3 && word.folded.endsWith(".js")
      ? `${word.folded.slice(0, -3)}js`
      : word.folded;
  const alias = TOKEN_ALIASES.get(folded);
  if (alias) return alias;
  const singular = singularize(folded, word.text);
  return TOKEN_ALIASES.get(singular) ?? [singular];
}

function phraseAt(list: readonly Word[], index: number) {
  const first = list[index];
  if (!first) return null;
  for (const [phrase, values] of PHRASES_BY_FIRST_WORD.get(first.folded) ?? []) {
    const matches = phrase.every((part, offset) => {
      const word = list[index + offset];
      if (word === undefined || word.folded !== part) return false;
      return offset === 0 || SOFT_GAP.test(word.gap);
    });
    if (matches) return { length: phrase.length, values };
  }
  return null;
}

function scan(input: string, mode: Mode): Token[] {
  const list = words(input);
  const tokens: Token[] = [];
  const emit = (values: readonly string[], start: number, end: number, joined: boolean) => {
    values.forEach((value, k) => tokens.push({ value, start, end, joined: k > 0 || joined }));
  };
  for (let i = 0; i < list.length; ) {
    const word = list[i];
    if (!word) break;
    const joined = i > 0 && SOFT_GAP.test(word.gap);
    const phrase = phraseAt(list, i);
    if (phrase) {
      emit(phrase.values, word.start, list[i + phrase.length - 1]?.end ?? word.end, joined);
      i += phrase.length;
    } else {
      emit(canonical(word, list[i + 1], mode, list.length === 1), word.start, word.end, joined);
      i += 1;
    }
  }
  return tokens;
}

// Canonical tokens of a job keyword: "Node.js" -> ["nodejs"], "CI/CD" -> ["ci", "cd"].
export function termTokens(term: string): string[] {
  return scan(term, "term").map((token) => token.value);
}

export function textTokens(text: string): Token[] {
  return scan(text, "text");
}
