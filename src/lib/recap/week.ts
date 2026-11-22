import { DAY_MS, MINUTE_MS } from "@/lib/time";
import type { RecapWeekId } from "./types";

// Weeks run Monday to Sunday on the person's own calendar.

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_PARTS = { year: "numeric", month: "2-digit", day: "2-digit" } as const;

export function isDay(value: string): boolean {
  return DAY_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function knownTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

// The date where the person is, as YYYY-MM-DD.
export function dayIn(at: number, timeZone: string): RecapWeekId {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { ...DAY_PARTS, timeZone })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

const utcMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`);

// Minutes ahead of UTC at that moment; kept here so Home doesn't load the eligibility rules for it.
function offsetMinutes(timeZone: string, at: number): number | null {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
    const match = name ? /^GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?$/.exec(name) : null;
    if (!match) return null;
    const minutes = Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
    return match[1] === "-" ? -minutes : minutes;
  } catch {
    return null;
  }
}

export function addDays(day: string, days: number): string {
  return new Date(utcMidnight(day) + days * DAY_MS).toISOString().slice(0, 10);
}

export function mondayOf(day: string): RecapWeekId {
  const weekday = new Date(utcMidnight(day)).getUTCDay();
  return addDays(day, -((weekday + 6) % 7));
}

// The Monday of the last week that has fully ended where the person is.
export function lastFullWeek(now: number, timeZone: string): RecapWeekId {
  return addDays(mondayOf(dayIn(now, timeZone)), -7);
}

// The moment a day starts in a time zone, checked twice so a clock change that night is caught.
export function startOfDay(day: string, timeZone: string): number {
  const midnight = utcMidnight(day);
  const first = offsetMinutes(timeZone, midnight) ?? 0;
  const guess = midnight - first * MINUTE_MS;
  const second = offsetMinutes(timeZone, guess) ?? first;
  return second === first ? guess : midnight - second * MINUTE_MS;
}

export type WeekRange = { start: number; end: number };

export function weekRange(week: RecapWeekId, timeZone: string): WeekRange {
  return { start: startOfDay(week, timeZone), end: startOfDay(addDays(week, 7), timeZone) };
}

export function weekDays(week: RecapWeekId): RecapWeekId[] {
  return Array.from({ length: 7 }, (_, index) => addDays(week, index));
}

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// "Nov 16–22", or "Nov 30 – Dec 6" when the week crosses a month.
export function weekLabel(week: RecapWeekId): string {
  const first = new Date(utcMidnight(week));
  const last = new Date(utcMidnight(addDays(week, 6)));
  if (first.getUTCMonth() === last.getUTCMonth()) {
    return `${MONTH.format(first)} ${first.getUTCDate()}–${last.getUTCDate()}`;
  }
  return `${MONTH_DAY.format(first)} – ${MONTH_DAY.format(last)}`;
}

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });

export function weekdayName(day: RecapWeekId): string {
  return WEEKDAY.format(new Date(utcMidnight(day)));
}
