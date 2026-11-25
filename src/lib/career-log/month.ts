import { formatFor, type Format } from "@/i18n/intl";
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

const LONG: Intl.DateTimeFormatOptions = { month: "long", year: "numeric", timeZone: "UTC" };
const NAME: Intl.DateTimeFormatOptions = { month: "long", timeZone: "UTC" };
const SHORT: Intl.DateTimeFormatOptions = { month: "short", year: "numeric", timeZone: "UTC" };
const SHORT_NAME: Intl.DateTimeFormatOptions = { month: "short", timeZone: "UTC" };
const DAY: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

const ENGLISH = formatFor("en");

const utc = (month: Month) => {
  const { year, month: m } = splitMonth(month);
  return Date.UTC(year, m - 1, 1);
};

// "November 2026".
export function monthLabel(month: Month, format: Format = ENGLISH): string {
  return format.date(utc(month), LONG);
}

// "November".
export function monthName(month: Month, format: Format = ENGLISH): string {
  return format.date(utc(month), NAME);
}

// "Nov 2026".
export function shortMonth(month: Month, format: Format = ENGLISH): string {
  return format.date(utc(month), SHORT);
}

// "Mon, Dec 7".
export function dayLabel(date: LocalDate, format: Format = ENGLISH): string {
  const { year, month, day } = splitDate(date);
  return format.date(Date.UTC(year, month - 1, day), DAY);
}

// "Oct and Nov 2026", "Sep, Oct and Nov 2026", across years "Dec 2025 and Jan 2026".
export function monthsLabel(months: readonly Month[], format: Format = ENGLISH): string {
  const sorted = [...new Set(months)].sort();
  const sameYear = sorted.every((month) => month.slice(0, 4) === sorted[0]?.slice(0, 4));
  const names = sorted.map((month, index) =>
    sameYear && index < sorted.length - 1
      ? format.date(utc(month), SHORT_NAME)
      : shortMonth(month, format),
  );
  if (names.length <= 1) return names[0] ?? "";
  if (format.locale !== "en") return format.list(names);
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}
