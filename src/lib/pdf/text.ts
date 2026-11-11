import { isDrawable as fontsDraw } from "./coverage";

// The bundled fonts draw Latin, Greek and Cyrillic. Anything else (CJK, emoji, some symbols) would
// print blank or as junk, so every string goes through toPdfText() first.

const SOFT_HYPHEN = 0xad;

function isDrawable(codePoint: number): boolean {
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true;
  return codePoint !== SOFT_HYPHEN && fontsDraw(codePoint);
}

function swap(replacement: string, ...codePoints: number[]): [string, string][] {
  return codePoints.map((codePoint) => [String.fromCodePoint(codePoint), replacement]);
}

// Same meaning, different glyph: swapped silently. Spaces, hyphens, quotes and bullets are always
// swapped: a non-breaking hyphen splits a keyword for hiring software like a missing glyph would.
const ALWAYS: ReadonlyMap<string, string> = new Map([
  ...swap(" ", 0x09, 0x0a, 0x0d, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006),
  ...swap(" ", 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000),
  ...swap("", 0x00ad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0xfe0e, 0xfe0f),
  ...swap("-", 0x2010, 0x2011, 0x2212, 0x2043, 0xfe63, 0xff0d),
  ...swap("–", 0x2012),
  ...swap("—", 0x2015, 0xfe58),
  ...swap("'", 0x201b, 0x2032, 0x2035, 0x02b9, 0xff07),
  // Modifier apostrophe and turned comma (as in Hawaiian names) keep their curl.
  ...swap("’", 0x02bc),
  ...swap("‘", 0x02bb),
  ...swap('"', 0x201f, 0x2033, 0xff02, 0x301d, 0x301e),
  ...swap("•", 0x2023, 0x2219, 0x25cf, 0x25cb, 0x25e6, 0x25aa, 0x25ab, 0x25a0, 0x25a1, 0x25c6),
  ...swap("•", 0x25c7, 0x2756, 0x27a2, 0x27a4, 0x25b8, 0x25b9, 0x25ba, 0x25b6, 0x2981, 0x29bf),
]);

// Symbols spelled out only when the fonts can't draw them.
const FAITHFUL: ReadonlyMap<string, string> = new Map([
  ["→", "->"],
  ["➔", "->"],
  ["➜", "->"],
  ["➡", "->"],
  ["←", "<-"],
  ["↔", "<->"],
  ["⇒", "=>"],
  // "↑30% revenue" and "↓20% churn" keep their meaning as a sign.
  ["↑", "+"],
  ["↓", "-"],
  ["≤", "<="],
  ["≥", ">="],
  ["≠", "!="],
  ["≈", "~"],
  ["∗", "*"],
  ["∕", "/"],
  ["⁄", "/"],
  // Greek mu (as in "μs") to the micro sign, when the fonts lack it.
  ...swap("µ", 0x03bc),
  ["₹", "INR "],
  ["₽", "RUB "],
  ["₩", "KRW "],
  ["₦", "NGN "],
  ["₱", "PHP "],
  ["₺", "TRY "],
  ["₪", "ILS "],
  ["₴", "UAH "],
  ["₫", "VND "],
  ["฿", "THB "],
]);

// Swapping these changes how a name is spelled, so they're reported to the user.
const LOOKALIKE_LETTERS: ReadonlyMap<string, string> = new Map([
  ["Ł", "L"],
  ["ł", "l"],
  ["Đ", "D"],
  ["đ", "d"],
  ["Ħ", "H"],
  ["ħ", "h"],
  ["ı", "i"],
  ["Ŧ", "T"],
  ["ŧ", "t"],
  ["Ŋ", "N"],
  ["ŋ", "n"],
  ["ĸ", "k"],
  ["ſ", "s"],
  ["ẞ", "SS"],
]);

const COMBINING_MARKS = /\p{M}+/gu;
// Invisible on screen, so listing them would only confuse.
const UNLISTED = /[\p{M}\p{C}\p{Emoji_Modifier}]/u;

type Replacement = { text: string; lossy: boolean };

// Per-character results are the same every time; resumes repeat the same few characters a lot.
const cache = new Map<string, Replacement>();

function allDrawable(text: string): boolean {
  for (const char of text) if (!isDrawable(char.codePointAt(0) ?? 0)) return false;
  return true;
}

// Ligatures and full-width letters: "ﬁnance" isn't "finance" to a keyword search.
const PRESENTATION_FORMS = /[\uFB00-\uFB06\uFF01-\uFF5E]/u;

function replace(char: string): Replacement {
  const faithful = FAITHFUL.get(char);
  if (faithful !== undefined) return { text: faithful, lossy: false };
  const lookalike = LOOKALIKE_LETTERS.get(char);
  if (lookalike !== undefined) return { text: lookalike, lossy: true };
  // Ligatures, full-width forms and superscripts: "ﬁ" -> "fi", "Ａ" -> "A", "⁴" -> "4".
  const compatible = char.normalize("NFKC");
  if (compatible !== char && allDrawable(compatible)) return { text: compatible, lossy: false };
  // An accented letter no font draws loses the accent rather than the whole letter.
  const stripped = char.normalize("NFKD").replace(COMBINING_MARKS, "");
  if (stripped && stripped !== char && allDrawable(stripped))
    return { text: stripped, lossy: true };
  return { text: "", lossy: true };
}

function replacementFor(char: string): Replacement {
  let replacement = cache.get(char);
  if (!replacement) {
    replacement = replace(char);
    cache.set(char, replacement);
  }
  return replacement;
}

// Ones a reader would notice (a changed letter, a missing emoji) are added to `lost`.
export function toPdfText(input: string, lost?: Set<string>): string {
  // NFC first, so "e" plus a combining accent becomes the drawable "é".
  const text = input.normalize("NFC");
  let out = "";
  for (const char of text) {
    const always = ALWAYS.get(char);
    if (always !== undefined) {
      out += always;
      continue;
    }
    if (PRESENTATION_FORMS.test(char)) {
      out += char.normalize("NFKC");
      continue;
    }
    if (isDrawable(char.codePointAt(0) ?? 0)) {
      out += char;
      continue;
    }
    const { text: swapped, lossy } = replacementFor(char);
    if (lossy && lost && !UNLISTED.test(char)) lost.add(char);
    out += swapped;
  }
  return out;
}

export function toPdfLine(input: string, lost?: Set<string>): string {
  return toPdfText(input, lost).replace(/\s+/g, " ").trim();
}

const LINE_BREAK = /\r\n|[\n\r\p{Zl}\p{Zp}]/u;

export function toPdfParagraphs(input: string, lost?: Set<string>): string[] {
  return input
    .split(LINE_BREAK)
    .map((line) => toPdfLine(line, lost))
    .filter(Boolean);
}

// XML 1.0 can't hold these, and Word refuses to open a file that has one.
const NOT_XML =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
// Invisible in Word too, but they split a keyword for anything searching the text.
const INVISIBLE = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;

/** Every character kept (Word's fonts draw them), whitespace collapsed. */
export function toUnicodeLine(input: string): string {
  return input
    .normalize("NFC")
    .replace(NOT_XML, "")
    .replace(INVISIBLE, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function toUnicodeParagraphs(input: string): string[] {
  return input.split(LINE_BREAK).map(toUnicodeLine).filter(Boolean);
}

// A full line holds 85+ characters, so only something like a very long URL goes past this.
const LONG_TOKEN = 48;
const CHUNK = 24;
const BREAK_AFTER = /(?<=[/?&=#_.-])/u;

// react-pdf hyphenates by default ("Kuber-netes"), splitting keywords for hiring software. Only a
// token too long for a line gets break points; without them react-pdf silently drops its end.
export function keepWordsWhole(word: string): string[] {
  if (word.length <= LONG_TOKEN) return [word];
  return word.split(BREAK_AFTER).flatMap((part) => {
    if (part.length <= CHUNK) return [part];
    const chunks: string[] = [];
    for (let i = 0; i < part.length; i += CHUNK) chunks.push(part.slice(i, i + CHUNK));
    return chunks;
  });
}
