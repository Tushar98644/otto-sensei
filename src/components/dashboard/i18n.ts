import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

export type DashboardMessages = Messages["dashboard"];
export type JobsMessages = Messages["jobs"];
export type ApplicationsMessages = Messages["applications"];
export type InterviewMessages = Messages["interview"];
export type LettersMessages = Messages["letters"];

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * DAY],
  ["month", 30 * DAY],
  ["week", 7 * DAY],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
];

const AUTO = { numeric: "auto" } as const;

// "2 hours ago" in the reader's language, as studio/relative-time words it in English.
export function relativeTime(
  format: Format,
  justNow: string,
  timestamp: number,
  now: number,
): string {
  const elapsed = now - timestamp;
  if (!Number.isFinite(elapsed) || elapsed < 45 * SECOND) return justNow;
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) return format.relativeTime(-Math.floor(elapsed / size), unit, AUTO);
  }
  return format.relativeTime(-1, "minute", AUTO);
}

const SAME_YEAR = { month: "short", day: "numeric" } as const;
const OTHER_YEAR = { month: "short", day: "numeric", year: "numeric" } as const;

// A label inside a sentence: "Last edited" reads "last edited", but German keeps its nouns capitalized.
export function midSentence(format: Format, label: string): string {
  if (format.locale === "de") return label;
  return label.charAt(0).toLocaleLowerCase(format.locale) + label.slice(1);
}

// "Nov 3", with the year only when it isn't this one.
export function formatDay(format: Format, timestamp: number, now: number): string {
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return format.date(timestamp, sameYear ? SAME_YEAR : OTHER_YEAR);
}
