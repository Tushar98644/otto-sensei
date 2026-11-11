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

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// A future time (another device's clock running ahead) reads "just now", not "in 3 minutes".
export function formatRelativeTime(timestamp: number, now: number): string {
  const elapsed = now - timestamp;
  if (!Number.isFinite(elapsed) || elapsed < 45 * SECOND) return "just now";
  for (const [unit, size] of UNITS) {
    if (elapsed >= size) return formatter.format(-Math.floor(elapsed / size), unit);
  }
  return formatter.format(-1, "minute");
}
