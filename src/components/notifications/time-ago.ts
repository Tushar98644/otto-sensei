import { formatFor, type Format } from "@/i18n/intl";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const AUTO = { numeric: "auto" } as const;

export type TimeWords = { format: Format; justNow: string };

const ENGLISH: TimeWords = { format: formatFor("en"), justNow: "just now" };

export function timeAgo(at: number, now: number, { format, justNow }: TimeWords = ENGLISH): string {
  const elapsed = Math.max(0, now - at);
  const ago = (size: number, unit: Intl.RelativeTimeFormatUnit) =>
    format.relativeTime(-Math.floor(elapsed / size), unit, AUTO);
  if (elapsed < MINUTE) return justNow;
  if (elapsed < HOUR) return ago(MINUTE, "minute");
  if (elapsed < DAY) return ago(HOUR, "hour");
  if (elapsed < WEEK) return ago(DAY, "day");
  if (elapsed < MONTH) return ago(WEEK, "week");
  if (elapsed < YEAR) return ago(MONTH, "month");
  return ago(YEAR, "year");
}
