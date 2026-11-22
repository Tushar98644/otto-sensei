import { isTimeZone } from "@/lib/eligibility/profile";
import { MINUTE_MS } from "@/lib/time";

// Wall-clock math in an IANA zone with Intl alone: no time zone data ships with the app.

export type WallTime = { year: number; month: number; day: number; hour: number; minute: number };

const formats = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let format = formats.get(zone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formats.set(zone, format);
  }
  return format;
}

export function zoneOrUtc(zone: string | null | undefined): string {
  return zone && isTimeZone(zone) ? zone : "UTC";
}

function parts(at: number, zone: string): WallTime & { second: number } {
  const values: Record<string, number> = {};
  for (const part of formatter(zone).formatToParts(at)) values[part.type] = Number(part.value);
  return {
    year: values.year ?? 1970,
    month: values.month ?? 1,
    day: values.day ?? 1,
    hour: (values.hour ?? 0) % 24,
    minute: values.minute ?? 0,
    second: values.second ?? 0,
  };
}

export function wallTime(at: number, zone: string): WallTime {
  const { year, month, day, hour, minute } = parts(at, zone);
  return { year, month, day, hour, minute };
}

// Minutes east of UTC at that instant ("+330" for India, "-300" for New York in winter).
export function offsetAt(at: number, zone: string): number {
  const wall = parts(at, zone);
  const read = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return Math.round((read - Math.floor(at / 1000) * 1000) / MINUTE_MS);
}

// The instant a wall time reads in that zone; a time skipped by a clock change lands beside it.
export function zonedInstant(wall: WallTime, zone: string): number {
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  const guess = naive - offsetAt(naive, zone) * MINUTE_MS;
  return naive - offsetAt(guess, zone) * MINUTE_MS;
}

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

// "2026-11-23", for comparing calendar days in one zone.
export function dayKey(at: number, zone: string): string {
  const { year, month, day } = wallTime(at, zone);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function minutesIntoDay(at: number, zone: string): number {
  const { hour, minute } = wallTime(at, zone);
  return hour * 60 + minute;
}

export function addDays(wall: WallTime, days: number): WallTime {
  const date = new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day + days, wall.hour, wall.minute),
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  };
}

// Monday to Friday; holidays aren't known, so a reminder may land on one.
export function addBusinessDays(wall: WallTime, days: number): WallTime {
  let next = wall;
  let left = days;
  while (left > 0) {
    next = addDays(next, 1);
    const weekday = new Date(Date.UTC(next.year, next.month - 1, next.day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) left -= 1;
  }
  return next;
}

// An interview's start: its day in the zone it was set in, at the minutes typed; null with no time set.
export function interviewStart(
  interviewAt: number,
  minutes: number | null,
  zone: string,
): number | null {
  if (minutes === null) return null;
  const { year, month, day } = wallTime(interviewAt, zone);
  return zonedInstant(
    { year, month, day, hour: Math.floor(minutes / 60), minute: minutes % 60 },
    zone,
  );
}
