// A year alone could be any of its 12 months, so every date is a span of possible months, and each
// rule takes the reading that gives the person the benefit of the doubt.

export type MonthSpan = {
  // Months since year 0: year * 12 + month (0 = January).
  earliest: number;
  latest: number;
  expected: boolean;
};

export type ParsedDate = MonthSpan | "present" | null;

const MONTHS: Readonly<Record<string, number>> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

// Northern-hemisphere school terms. Winter straddles two years, so it reads as the whole year.
const SEASONS: Readonly<Record<string, readonly [number, number]>> = {
  spring: [2, 4],
  summer: [5, 7],
  fall: [8, 10],
  autumn: [8, 10],
};

const PRESENT = /^(?:present|current(?:ly)?|now|today|ongoing|to date|till date|till now)$/i;
const EXPECTED = /^(?:expected|anticipated|exp\.?|est\.?|projected)\s*:?\s*/i;
const MIN_YEAR = 1950;
const MAX_YEAR = 2100;

export const monthIndex = (year: number, month: number) => year * 12 + month;

export function monthOf(epochMs: number): number {
  const date = new Date(epochMs);
  return monthIndex(date.getUTCFullYear(), date.getUTCMonth());
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthLabel(index: number): string {
  return `${MONTH_NAMES[index % 12]} ${Math.floor(index / 12)}`;
}

export function spanLabel(date: MonthSpan): string {
  if (date.earliest % 12 === 0 && date.latest === date.earliest + 11) {
    return String(Math.floor(date.earliest / 12));
  }
  return monthLabel(date.earliest);
}

function year(value: string): number | null {
  let n = Number(value);
  if (value.length === 2) n += n > 60 ? 1900 : 2000;
  return Number.isInteger(n) && n >= MIN_YEAR && n <= MAX_YEAR ? n : null;
}

function span(y: number, from: number, to: number, expected: boolean): MonthSpan {
  return { earliest: monthIndex(y, from), latest: monthIndex(y, to), expected };
}

export function parseDate(raw: string): ParsedDate {
  let text = raw.trim().replace(/\s+/g, " ").replace(/[()]/g, "");
  if (!text) return null;
  if (PRESENT.test(text)) return "present";
  const expected = EXPECTED.test(text);
  text = text.replace(EXPECTED, "");

  let match = /^(\p{L}+)\.?,? ?(?:'|’)?(\d{4}|\d{2})$/u.exec(text);
  if (match) {
    const word = match[1]!.toLowerCase();
    const y = year(match[2]!);
    if (y === null) return null;
    const month = MONTHS[word];
    if (month !== undefined) return span(y, month, month, expected);
    const season = SEASONS[word];
    if (season) return span(y, season[0], season[1], expected);
    if (word === "winter") return span(y, 0, 11, expected);
    return null;
  }
  // "Jan 5, 2021" and "5 Jan 2021": the day doesn't matter here.
  match = /^(?:(\p{L}+)\.? \d{1,2},? (\d{4})|\d{1,2} (\p{L}+)\.? (\d{4}))$/u.exec(text);
  if (match) {
    const month = MONTHS[(match[1] ?? match[3] ?? "").toLowerCase()];
    const y = year(match[2] ?? match[4] ?? "");
    return month === undefined || y === null ? null : span(y, month, month, expected);
  }
  match = /^Q([1-4]) (\d{4})$/i.exec(text);
  if (match) {
    const y = year(match[2]!);
    const quarter = Number(match[1]) - 1;
    return y === null ? null : span(y, quarter * 3, quarter * 3 + 2, expected);
  }
  // "03/2020", "3-2020", "2020-03", "2020/3".
  match = /^(\d{1,2})[/.-](\d{4})$|^(\d{4})[/.-](\d{1,2})$/.exec(text);
  if (match) {
    const month = Number(match[1] ?? match[4]) - 1;
    const y = year(match[2] ?? match[3] ?? "");
    return y === null || month < 0 || month > 11 ? null : span(y, month, month, expected);
  }
  // "05/03/2020": day and month can't be told apart unless one is over 12.
  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const y = year(match[3]!);
    if (y === null || a < 1 || b < 1 || (a > 12 && b > 12)) return null;
    if (a > 12) return span(y, b - 1, b - 1, expected);
    if (b > 12) return span(y, a - 1, a - 1, expected);
    return span(y, Math.min(a, b) - 1, Math.max(a, b) - 1, expected);
  }
  match = /^(\d{4})$/.exec(text);
  if (match) {
    const y = year(match[1]!);
    return y === null ? null : span(y, 0, 11, expected);
  }
  return null;
}

const RANGE_SPLIT = /\s+(?:-|–|—|to|until|till)\s+|\s*[–—]\s*/i;

// Imports sometimes put the whole range in the start field, so an empty end splits the start.
export function parseRange(
  startText: string,
  endText: string,
  nowMonth: number,
): { start: MonthSpan | null; end: MonthSpan | null; ongoing: boolean } {
  let startRaw = startText;
  let endRaw = endText;
  if (!endRaw.trim()) {
    const parts = startText.split(RANGE_SPLIT);
    if (parts.length === 2) [startRaw, endRaw] = parts as [string, string];
  }
  const start = parseDate(startRaw);
  const end = parseDate(endRaw);
  const now: MonthSpan = { earliest: nowMonth, latest: nowMonth, expected: false };
  return {
    start: start === "present" ? null : start,
    end: end === "present" ? now : end,
    ongoing: end === "present",
  };
}

/** Months two spans surely share (0 when they may not overlap at all). */
export function sureOverlap(
  a: { start: MonthSpan; end: MonthSpan },
  b: { start: MonthSpan; end: MonthSpan },
): number {
  const from = Math.max(a.start.latest, b.start.latest);
  const to = Math.min(a.end.earliest, b.end.earliest);
  return Math.max(0, to - from + 1);
}

export function formatMonths(count: number): string {
  if (count < 12) return count === 1 ? "1 month" : `${count} months`;
  const years = Math.floor(count / 12);
  const months = count % 12;
  const y = years === 1 ? "1 year" : `${years} years`;
  if (months === 0) return y;
  return `${y} and ${months === 1 ? "1 month" : `${months} months`}`;
}
