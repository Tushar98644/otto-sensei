import { countAlnum } from "./text";
import type { PdfTextItem } from "./types";

export type LayoutItem = PdfTextItem & {
  baseline: number;
  // Rotated or vertical text is still read, but says nothing about columns.
  upright: boolean;
};

export type TextRow = { baseline: number; size: number; items: LayoutItem[] };

// Running text sits at least ~1.1 font sizes apart, so this never merges real lines but joins
// superscripts and mixed sizes.
const SAME_LINE = 0.5;
// In font sizes. A normal space is ~0.25; a tab stop or column gap is far wider.
const WORD_GAP = 0.15;
const WIDE_GAP = 1.5;
// "Fake bold" PDFs paint the same text two or three times a fraction of a point apart.
const DUPLICATE_OFFSET = 1.5;

export function groupRows(items: readonly LayoutItem[]): TextRow[] {
  const sorted = [...items].sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const rows: TextRow[] = [];
  let current: TextRow | undefined;
  for (const item of sorted) {
    const size = Math.max(item.height, 1);
    if (current && item.baseline - current.baseline <= SAME_LINE * Math.max(size, current.size)) {
      current.items.push(item);
      current.size = Math.max(current.size, size);
    } else {
      current = { baseline: item.baseline, size, items: [item] };
      rows.push(current);
    }
  }
  for (const row of rows) row.items = dropDuplicates(row.items.sort((a, b) => a.x - b.x));
  return rows;
}

function dropDuplicates(items: LayoutItem[]): LayoutItem[] {
  const kept: LayoutItem[] = [];
  for (const item of items) {
    const isCopy = kept.some(
      (other) =>
        other.str === item.str &&
        Math.abs(other.x - item.x) < DUPLICATE_OFFSET &&
        Math.abs(other.baseline - item.baseline) < DUPLICATE_OFFSET,
    );
    if (!isCopy) kept.push(item);
  }
  return kept;
}

// One space between words, a tab where the gap is wide (right-aligned dates, a second column).
export function rowText(items: readonly LayoutItem[]): string {
  let text = "";
  let right = -Infinity;
  let previous: LayoutItem | undefined;
  for (const item of items) {
    if (previous) {
      const gap = item.x - right;
      const size = Math.max(Math.min(previous.height, item.height), 1);
      if (gap >= WIDE_GAP * size) text += "\t";
      else if (gap > WORD_GAP * size && !/\s$/.test(text) && !/^\s/.test(item.str)) text += " ";
    }
    text += item.str;
    right = Math.max(right, item.x + item.width);
    previous = item;
  }
  return text;
}

// Deliberately strict: a false "two columns" warning on a clean resume is worse than missing a
// sidebar.
const MIN_ROWS = 8;
// Narrowest gap that counts as a gutter. Word spacing is ~3pt; real gutters are 12pt and up.
const MIN_GUTTER = 8;
// A full-width name or footer may cross the gutter; running text may not.
const MAX_CROSSING_SHARE = 0.1;
// Each side needs a real share of the lines and of the text, so a few stray items never count.
const MIN_SIDE_ROW_SHARE = 0.25;
const MIN_SIDE_TEXT_SHARE = 0.06;
// A single column with right-aligned dates has a "right side" of short items that all end at the
// margin. A real column is left-aligned and holds longer lines.
const DATE_COLUMN_MAX_CHARS = 25;
const DATE_COLUMN_ALIGNED_SHARE = 0.7;
const ALIGN_TOLERANCE = 3;

type Span = { from: number; to: number; chars: number };

// An x-band no text crosses (bar a few full-width lines), with substantial text on both sides.
export function hasColumnGutter(rows: readonly TextRow[], pageWidth: number): boolean {
  const width = Math.max(1, Math.ceil(pageWidth));
  const spans: Span[][] = [];
  for (const row of rows) {
    const rowSpans: Span[] = [];
    for (const item of row.items) {
      if (!item.upright) continue;
      const from = clamp(Math.floor(item.x), 0, width);
      const to = clamp(Math.ceil(item.x + item.width), 0, width);
      if (to > from) rowSpans.push({ from, to, chars: countAlnum(item.str) });
    }
    if (rowSpans.length) spans.push(rowSpans);
  }
  if (spans.length < MIN_ROWS) return false;

  const coverage = new Uint16Array(width);
  let left = width;
  let right = 0;
  for (const rowSpans of spans) {
    const covered = new Uint8Array(width);
    for (const span of rowSpans) {
      covered.fill(1, span.from, span.to);
      left = Math.min(left, span.from);
      right = Math.max(right, span.to);
    }
    for (let x = 0; x < width; x++) coverage[x] = (coverage[x] ?? 0) + (covered[x] ?? 0);
  }

  // Coverage is a cheap necessary condition; splitsIntoColumns then counts distinct rows exactly.
  const maxCrossing = Math.max(1, Math.floor(spans.length * MAX_CROSSING_SHARE));
  let clearRun = 0;
  for (let x = left + 1; x < right - 1; x++) {
    clearRun = (coverage[x] ?? 0) <= maxCrossing ? clearRun + 1 : 0;
    if (clearRun >= MIN_GUTTER && splitsIntoColumns(spans, x + 1 - MIN_GUTTER, x + 1, maxCrossing)) return true;
  }
  return false;
}

function splitsIntoColumns(spans: Span[][], from: number, to: number, maxCrossing: number): boolean {
  let crossing = 0;
  let leftRows = 0;
  let leftChars = 0;
  let rightChars = 0;
  let totalChars = 0;
  // Per row with text right of the gutter: where that text ends and how much of it there is.
  const rightRows: { end: number; chars: number }[] = [];
  for (const rowSpans of spans) {
    let hasLeft = false;
    let crosses = false;
    let right: { end: number; chars: number } | undefined;
    for (const span of rowSpans) {
      totalChars += span.chars;
      if (span.to <= from) {
        hasLeft = true;
        leftChars += span.chars;
      } else if (span.from >= to) {
        rightChars += span.chars;
        right = { end: Math.max(right?.end ?? 0, span.to), chars: (right?.chars ?? 0) + span.chars };
      } else {
        crosses = true;
      }
    }
    if (crosses) crossing++;
    if (hasLeft) leftRows++;
    if (right) rightRows.push(right);
  }
  const minRows = spans.length * MIN_SIDE_ROW_SHARE;
  const minChars = totalChars * MIN_SIDE_TEXT_SHARE;
  return (
    crossing <= maxCrossing &&
    leftRows >= minRows &&
    rightRows.length >= minRows &&
    leftChars >= minChars &&
    rightChars >= minChars &&
    !isRightAlignedDateColumn(rightRows)
  );
}

function isRightAlignedDateColumn(rows: readonly { end: number; chars: number }[]): boolean {
  const averageChars = rows.reduce((sum, row) => sum + row.chars, 0) / Math.max(rows.length, 1);
  if (averageChars >= DATE_COLUMN_MAX_CHARS) return false;
  const aligned = Math.max(
    0,
    ...rows.map((row) => rows.filter((other) => Math.abs(other.end - row.end) <= ALIGN_TOLERANCE).length),
  );
  return aligned >= rows.length * DATE_COLUMN_ALIGNED_SHARE;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
