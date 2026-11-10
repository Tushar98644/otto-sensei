import { DRAWABLE, FAMILY_COVERAGE, type CoverageRanges } from "./font-coverage";
import type { PdfFontName } from "./fonts";

// Lookups into the generated coverage tables (./font-coverage.ts).

function inRanges(ranges: CoverageRanges, codePoint: number): boolean {
  let low = 0;
  let high = ranges.length / 2 - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const start = ranges[middle * 2]!;
    const end = ranges[middle * 2 + 1]!;
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }
  return false;
}

/** True when every format's fonts (with their fallbacks) can draw the character. */
export function isDrawable(codePoint: number): boolean {
  return inRanges(DRAWABLE, codePoint);
}

/** True when the family draws every character of `text` in all of its faces. */
export function fontCovers(family: PdfFontName, text: string): boolean {
  const ranges = FAMILY_COVERAGE[family];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // Spaces and line breaks are laid out, never drawn.
    if (code <= 0x20) continue;
    if (!inRanges(ranges, code)) return false;
  }
  return true;
}
