import type { LocalDate, Month } from "./types";

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isMonth(value: unknown): value is Month {
  return typeof value === "string" && MONTH.test(value);
}

export function isLocalDate(value: unknown): value is LocalDate {
  return typeof value === "string" && DATE.test(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function monthOf(year: number, month: number): Month {
  return `${year}-${pad(month)}`;
}

export function dateOf(year: number, month: number, day: number): LocalDate {
  return `${monthOf(year, month)}-${pad(day)}`;
}

export function splitMonth(month: Month): { year: number; month: number } {
  return { year: Number(month.slice(0, 4)), month: Number(month.slice(5, 7)) };
}

export function splitDate(date: LocalDate): { year: number; month: number; day: number } {
  return { ...splitMonth(date.slice(0, 7)), day: Number(date.slice(8, 10)) };
}

export function addMonths(month: Month, count: number): Month {
  const { year, month: m } = splitMonth(month);
  const index = year * 12 + (m - 1) + count;
  return monthOf(Math.floor(index / 12), (index % 12) + 1);
}

export function monthsBetween(from: Month, to: Month): number {
  const a = splitMonth(from);
  const b = splitMonth(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const { year, month, day } = splitDate(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

const LONG = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const NAME = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const DAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const utc = (month: Month) => {
  const { year, month: m } = splitMonth(month);
  return Date.UTC(year, m - 1, 1);
};

// "November 2026".
export function monthLabel(month: Month): string {
  return LONG.format(utc(month));
}

// "November".
export function monthName(month: Month): string {
  return NAME.format(utc(month));
}

// "Nov 2026".
export function shortMonth(month: Month): string {
  return SHORT.format(utc(month));
}

// "Mon, Dec 7".
export function dayLabel(date: LocalDate): string {
  const { year, month, day } = splitDate(date);
  return DAY.format(Date.UTC(year, month - 1, day));
}

// "Oct and Nov 2026", "Sep, Oct and Nov 2026", across years "Dec 2025 and Jan 2026".
export function monthsLabel(months: readonly Month[]): string {
  const sorted = [...new Set(months)].sort();
  const sameYear = sorted.every((month) => month.slice(0, 4) === sorted[0]?.slice(0, 4));
  const names = sorted.map((month, index) =>
    sameYear && index < sorted.length - 1
      ? SHORT.format(utc(month)).split(" ")[0]!
      : shortMonth(month),
  );
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
