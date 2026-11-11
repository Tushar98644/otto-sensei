// A scan with a page number or watermark still reads as "nothing" to hiring software.
const MIN_TEXT_CHARS = 40;
const MIN_TEXT_CHARS_PER_PAGE = 25;

const ALNUM = /[\p{L}\p{N}]/gu;

export function countAlnum(text: string): number {
  return text.match(ALNUM)?.length ?? 0;
}

export function hasReadableText(text: string, pageCount: number): boolean {
  return countAlnum(text) >= Math.max(MIN_TEXT_CHARS, MIN_TEXT_CHARS_PER_PAGE * pageCount);
}

export function countWords(text: string): number {
  let count = 0;
  for (const token of text.split(/\s+/)) {
    if (/[\p{L}\p{N}]/u.test(token)) count++;
  }
  return count;
}

// Tabs survive: they separate side-by-side text, and later steps split on them.
export function toLines(text: string): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r\n?|\n|\u2028|\u2029/)) {
    const line = raw
      .replace(/[\u00ad\u200b\u200c\u200d\u2060\ufeff]/g, "")
      .replace(/[ \u00a0\u2000-\u200a\u202f\u205f\u3000]+/g, " ")
      .replace(/ *\t[\t ]*/g, "\t")
      .trim();
    if (line) lines.push(line);
  }
  return lines;
}

const ICON_RANGES: ReadonlyArray<readonly [number, number]> = [
  // Private use areas: icon fonts such as Font Awesome map their glyphs here.
  [0xe000, 0xf8ff],
  [0xf0000, 0xffffd],
  [0x100000, 0x10fffd],
  // Emoji pictographs (📧 📞 📍 🌐 💼 🎓 ...).
  [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff],
  [0x1f900, 0x1f9ff],
  [0x1fa70, 0x1faff],
];

// Check marks and arrows are left out on purpose: they're real characters used as bullets.
const ICON_SYMBOLS = new Set(Array.from("☎☏✆✉✍⌂✈⚐⚑⚲★☆⭐⭑⭒✩✪✫✬✭✮✯✰", (char) => char.codePointAt(0) ?? 0));

// Word's Symbol/Wingdings bullets, as PDF export maps them. At a line start they're markers, not
// icons.
const WORD_BULLET_GLYPHS = new Set([
  0xf0b7, 0xf0a7, 0xf076, 0xf0d8, 0xf0fc, 0xf06e, 0xf06c, 0xf0a8, 0xf0d2, 0xf0e8,
]);

// Skill "ratings" drawn with characters: ●●●○○ or ■■□□□.
const RATING_RUN = /[●○◉◎◯⚫⚪■□▪▫◆◇]{3,}/gu;

function isIcon(codePoint: number): boolean {
  if (ICON_SYMBOLS.has(codePoint)) return true;
  return ICON_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);
}

export function countIconGlyphs(lines: readonly string[]): number {
  let count = 0;
  for (const line of lines) {
    for (const segment of line.split("\t")) {
      let first = true;
      for (const char of segment) {
        const codePoint = char.codePointAt(0) ?? 0;
        const isLeadingBullet = first && WORD_BULLET_GLYPHS.has(codePoint);
        if (!isLeadingBullet && isIcon(codePoint)) count++;
        if (char.trim()) first = false;
      }
      for (const run of segment.matchAll(RATING_RUN)) count += [...run[0]].length;
    }
  }
  return count;
}
