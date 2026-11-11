// "just now", "5 minutes ago", "yesterday", "3 weeks ago".

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function timeAgo(at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return relative.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return relative.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < WEEK) return relative.format(-Math.floor(elapsed / DAY), "day");
  if (elapsed < MONTH) return relative.format(-Math.floor(elapsed / WEEK), "week");
  if (elapsed < YEAR) return relative.format(-Math.floor(elapsed / MONTH), "month");
  return relative.format(-Math.floor(elapsed / YEAR), "year");
}
