import { addMonths, dateOf, daysInMonth, monthOf, splitDate } from "./month";
import { LAST_WEEK, type CheckinDay, type LocalDate, type Month } from "./types";

// When the monthly check-in is due, worked out on the person's own calendar so it lands on their chosen day.

export function isTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function safeTimeZone(value: string | null | undefined): string {
  return value && isTimeZone(value) ? value : "UTC";
}

export function localDate(timeZone: string, now: number): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  return dateOf(part("year"), part("month"), part("day"));
}

export function isCheckinDay(value: { week: unknown; weekday: unknown }): value is CheckinDay {
  const { week, weekday } = value;
  return (
    Number.isInteger(week) &&
    Number.isInteger(weekday) &&
    (week as number) >= 1 &&
    (week as number) <= LAST_WEEK &&
    (weekday as number) >= 0 &&
    (weekday as number) <= 6
  );
}

// The day of the month the check-in falls on: the first Monday, the last Friday.
export function checkinDayOf(year: number, month: number, day: CheckinDay): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const first = 1 + ((day.weekday - firstWeekday + 7) % 7);
  if (day.week < LAST_WEEK) return first + (day.week - 1) * 7;
  const fourth = first + 21;
  return fourth + 7 <= daysInMonth(year, month) ? fourth + 7 : fourth;
}

function checkinIn(month: Month, day: CheckinDay): LocalDate {
  const { year, month: m } = splitDate(`${month}-01`);
  return dateOf(year, m, checkinDayOf(year, m, day));
}

// Strictly after today, so turning it on or changing the day never asks the same day.
export function nextCheckinOn(day: CheckinDay, today: LocalDate): LocalDate {
  const { year, month } = splitDate(today);
  const thisMonth = checkinIn(monthOf(year, month), day);
  return thisMonth > today ? thisMonth : checkinIn(addMonths(monthOf(year, month), 1), day);
}

// The latest check-in day on or before today.
export function lastCheckinOn(day: CheckinDay, today: LocalDate): LocalDate {
  const { year, month } = splitDate(today);
  const thisMonth = checkinIn(monthOf(year, month), day);
  return thisMonth <= today ? thisMonth : checkinIn(addMonths(monthOf(year, month), -1), day);
}

// Early in a month it asks about the month that just ended; later on, about the month it's in.
export function coveredMonth(date: LocalDate): Month {
  const { year, month, day } = splitDate(date);
  const current = monthOf(year, month);
  return day <= 15 ? addMonths(current, -1) : current;
}

export type CheckinState = {
  day: CheckinDay;
  timeZone: string;
  nextCheckinOn: LocalDate | null;
  pausedUntil: LocalDate | null;
  lastCheckinMonth: Month | null;
};

export type CheckinDecision =
  | { action: "wait" }
  | { action: "send"; month: Month; next: LocalDate }
  | { action: "skip"; next: LocalDate; reason: "unscheduled" | "paused" | "asked" };

export function decideCheckin(state: CheckinState, now: number): CheckinDecision {
  const today = localDate(state.timeZone, now);
  const next = nextCheckinOn(state.day, today);
  if (state.nextCheckinOn === null) return { action: "skip", next, reason: "unscheduled" };
  if (state.nextCheckinOn > today) return { action: "wait" };
  if (state.pausedUntil !== null && today < state.pausedUntil) {
    return { action: "skip", next, reason: "paused" };
  }
  // A late run still asks about the day it was meant for, not a later one.
  const month = coveredMonth(lastCheckinOn(state.day, today));
  if (state.lastCheckinMonth === month) return { action: "skip", next, reason: "asked" };
  return { action: "send", month, next };
}

// "Pause for a month": the check-ins before that day are skipped.
export function pauseUntil(today: LocalDate, months: number): LocalDate {
  const { year, month, day } = splitDate(today);
  const target = addMonths(monthOf(year, month), months);
  const { year: y, month: m } = splitDate(`${target}-01`);
  return dateOf(y, m, Math.min(day, daysInMonth(y, m)));
}

const WEEKS = ["first", "second", "third", "fourth", "last"] as const;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEK_NAMES: readonly string[] = WEEKS;
export const WEEKDAY_NAMES: readonly string[] = WEEKDAYS;

// "the first Monday".
export function checkinDayLabel(day: CheckinDay): string {
  return `the ${WEEKS[day.week - 1] ?? "first"} ${WEEKDAYS[day.weekday] ?? "Monday"}`;
}
