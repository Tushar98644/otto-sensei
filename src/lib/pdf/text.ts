// Helvetica, like every built-in PDF font, can only draw the Windows-1252 character set, and pdfkit
// writes anything outside it as raw bytes: "→" comes out as "’" and "Ł" as "A". Every string goes
// through toPdfText() first, which keeps what the font can draw and swaps or drops the rest.

// The Windows-1252 code points above Latin-1's 0xA0-0xFF block: € ‚ ƒ „ … † ‡ ˆ ‰ Š ‹ Œ Ž ‘ ’ “ ” •
// – — ˜ ™ š › œ ž Ÿ.
const WIN_1252_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152,
  0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a,
  0x0153, 0x017e, 0x0178,
]);

const SOFT_HYPHEN = 0xad;

function isDrawable(codePoint: number): boolean {
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true;
  if (codePoint >= 0xa0 && codePoint <= 0xff) return codePoint !== SOFT_HYPHEN;
  return WIN_1252_EXTRAS.has(codePoint);
}

function swap(replacement: string, ...codePoints: number[]): [string, string][] {
  return codePoints.map((codePoint) => [String.fromCodePoint(codePoint), replacement]);
}

// Same meaning, different glyph: nobody needs to hear about these swaps. Look-alike punctuation is
// listed by code point so each entry can be told apart.
const FAITHFUL: ReadonlyMap<string, string> = new Map([
  // Tab, line breaks, and the Unicode spaces (en, em, thin, hair, narrow no-break, ideographic...).
  ...swap(" ", 0x09, 0x0a, 0x0d, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006),
  ...swap(" ", 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000),
  // Soft hyphen, zero-width space and joiners, word joiner, byte order mark, variation selectors.
  ...swap("", 0x00ad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0xfe0e, 0xfe0f),
  // Hyphen, non-breaking hyphen, minus sign, hyphen bullet, small and full-width hyphen-minus.
  ...swap("-", 0x2010, 0x2011, 0x2212, 0x2043, 0xfe63, 0xff0d),
  // Figure dash; horizontal bar and small em dash.
  ...swap("–", 0x2012),
  ...swap("—", 0x2015, 0xfe58),
  // Reversed quote, prime, reversed prime, modifier prime, full-width apostrophe.
  ...swap("'", 0x201b, 0x2032, 0x2035, 0x02b9, 0xff07),
  // Modifier apostrophe and turned comma (as in Hawaiian names) keep their curl.
  ...swap("’", 0x02bc),
  ...swap("‘", 0x02bb),
  // Reversed double quote, double prime, full-width and CJK double quotes.
  ...swap('"', 0x201f, 0x2033, 0xff02, 0x301d, 0x301e),
  // Other bullet shapes.
  ...swap("•", 0x2023, 0x2219, 0x25cf, 0x25cb, 0x25e6, 0x25aa, 0x25ab, 0x25a0, 0x25a1, 0x25c6),
  ...swap("•", 0x25c7, 0x2756, 0x27a2, 0x27a4, 0x25b8, 0x25b9, 0x25ba, 0x25b6, 0x2981, 0x29bf),
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
  // Greek mu (as in "μs") to the micro sign, which Windows-1252 has.
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

// Letters with no decomposition to a drawable base letter. Swapping them changes how a name is
// spelled, so they're reported to the user.
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
// Invisible on screen (controls, direction marks, icon-font glyphs, emoji skin tones), so listing
// them would only confuse.
const UNLISTED = /[\p{M}\p{C}\p{Emoji_Modifier}]/u;

type Replacement = { text: string; lossy: boolean };

// Per-character results are the same every time; resumes repeat the same few characters a lot.
const cache = new Map<string, Replacement>();

function allDrawable(text: string): boolean {
  for (const char of text) if (!isDrawable(char.codePointAt(0) ?? 0)) return false;
  return true;
}

function replace(char: string): Replacement {
  const faithful = FAITHFUL.get(char);
  if (faithful !== undefined) return { text: faithful, lossy: false };
  const lookalike = LOOKALIKE_LETTERS.get(char);
  if (lookalike !== undefined) return { text: lookalike, lossy: true };
  // Ligatures, full-width forms and superscripts: "ﬁ" -> "fi", "Ａ" -> "A", "⁴" -> "4".
  const compatible = char.normalize("NFKC");
  if (compatible !== char && allDrawable(compatible)) return { text: compatible, lossy: false };
  // Accented letters outside Windows-1252 lose the accent: "ő" -> "o", "ş" -> "s", "ț" -> "t".
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

/**
 * Returns text Helvetica can draw. Characters it can't are swapped for a close equivalent or
 * dropped; the ones a reader would notice (a changed letter, a missing emoji) are added to `lost`.
 */
export function toPdfText(input: string, lost?: Set<string>): string {
  // NFC first, so "e" plus a combining accent becomes the drawable "é".
  const text = input.normalize("NFC");
  let out = "";
  for (const char of text) {
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

// One line of text: sanitized, whitespace collapsed, trimmed.
export function toPdfLine(input: string, lost?: Set<string>): string {
  return toPdfText(input, lost).replace(/\s+/g, " ").trim();
}

const LINE_BREAK = /\r\n|[\n\r\p{Zl}\p{Zp}]/u;

// Non-empty paragraphs, one per line the user typed.
export function toPdfParagraphs(input: string, lost?: Set<string>): string[] {
  return input
    .split(LINE_BREAK)
    .map((line) => toPdfLine(line, lost))
    .filter(Boolean);
}

// XML 1.0 can't hold C0 controls (other than tab and line breaks), U+FFFE, U+FFFF or half of a
// surrogate pair, and Word refuses to open a file that has one.
const NOT_XML =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
// Zero-width characters and the soft hyphen are invisible in Word too, but they split a keyword in
// two for anything searching the text.
const INVISIBLE = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g;

/** One line for a Word file: every character kept (Word fonts draw them), whitespace collapsed. */
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

// Tokens up to this length never break. A full line holds 85+ characters of normal text at body
// size, so only something like a very long URL goes past it.
const LONG_TOKEN = 48;
const CHUNK = 24;
const BREAK_AFTER = /(?<=[/?&=#_.-])/u;

/**
 * Hyphenation callback for every Text. react-pdf hyphenates English words by default
 * ("Kuber-netes"), which splits keywords for hiring software, so words stay whole. Only a token too
 * long for one line gets break points, after URL punctuation where it has some: without them
 * react-pdf lets it run off the page and silently drops its end.
 */
export function keepWordsWhole(word: string): string[] {
  if (word.length <= LONG_TOKEN) return [word];
  return word.split(BREAK_AFTER).flatMap((part) => {
    if (part.length <= CHUNK) return [part];
    const chunks: string[] = [];
    for (let i = 0; i < part.length; i += CHUNK) chunks.push(part.slice(i, i + CHUNK));
    return chunks;
  });
}
