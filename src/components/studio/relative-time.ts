import type { Format } from "@/i18n/intl";

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

const formatter = new Intl.RelativeTimeFormat("en", AUTO);

type Say = (value: number, unit: Intl.RelativeTimeFormatUnit) => string;

function relative(timestamp: number, now: number, justNow: string, say: Say): string {
  const elapsed = now - timestamp;
  if (!Number.isFinite(elapsed) || elapsed < 45 * SECOND) return justNow;
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) return say(-Math.floor(elapsed / size), unit);
  }
  return say(-1, "minute");
}

export function formatRelativeTime(timestamp: number, now: number): string {
  return relative(timestamp, now, "just now", (value, unit) => formatter.format(value, unit));
}

// The same in the page's language, with justNow from its messages.
export function relativeTimeIn(
  format: Format,
  justNow: string,
  timestamp: number,
  now: number,
): string {
  return relative(timestamp, now, justNow, (value, unit) =>
    format.relativeTime(value, unit, AUTO),
  );
}
