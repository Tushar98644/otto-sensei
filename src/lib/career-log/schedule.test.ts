import { describe, expect, it } from "vitest";
import {
  checkinDayLabel,
  checkinDayOf,
  coveredMonth,
  decideCheckin,
  isTimeZone,
  lastCheckinOn,
  localDate,
  nextCheckinOn,
  pauseUntil,
  type CheckinState,
} from "./schedule";

const FIRST_MONDAY = { week: 1, weekday: 1 };
const LAST_FRIDAY = { week: 5, weekday: 5 };

// 20:00 UTC on Sunday 6 December 2026: already Monday the 7th in India, still Sunday in California.
const DEC_6_EVENING_UTC = Date.UTC(2026, 11, 6, 20, 0);

function state(overrides: Partial<CheckinState> = {}): CheckinState {
  return {
    day: FIRST_MONDAY,
    timeZone: "Asia/Kolkata",
    nextCheckinOn: "2026-12-07",
    pausedUntil: null,
    lastCheckinMonth: "2026-10",
    ...overrides,
  };
}

describe("the chosen day", () => {
  it("finds the nth weekday of a month, and the last one", () => {
    expect(checkinDayOf(2026, 11, FIRST_MONDAY)).toBe(2);
    expect(checkinDayOf(2026, 11, { week: 4, weekday: 1 })).toBe(23);
    expect(checkinDayOf(2026, 11, { week: 5, weekday: 1 })).toBe(30);
    expect(checkinDayOf(2026, 12, { week: 5, weekday: 1 })).toBe(28);
    expect(checkinDayOf(2027, 2, { week: 5, weekday: 0 })).toBe(28);
    expect(checkinDayOf(2026, 11, LAST_FRIDAY)).toBe(27);
  });

  it("is always after today, so turning it on never asks the same day", () => {
    expect(nextCheckinOn(FIRST_MONDAY, "2026-11-22")).toBe("2026-12-07");
    expect(nextCheckinOn(FIRST_MONDAY, "2026-12-06")).toBe("2026-12-07");
    expect(nextCheckinOn(FIRST_MONDAY, "2026-12-07")).toBe("2027-01-04");
    expect(nextCheckinOn(FIRST_MONDAY, "2026-12-31")).toBe("2027-01-04");
    expect(lastCheckinOn(FIRST_MONDAY, "2026-12-10")).toBe("2026-12-07");
    expect(lastCheckinOn(FIRST_MONDAY, "2026-12-06")).toBe("2026-11-02");
  });

  it("asks about the month just ended early on, and the current month later on", () => {
    expect(coveredMonth("2026-12-07")).toBe("2026-11");
    expect(coveredMonth("2027-01-04")).toBe("2026-12");
    expect(coveredMonth("2026-11-27")).toBe("2026-11");
  });

  it("reads plainly", () => {
    expect(checkinDayLabel(FIRST_MONDAY)).toBe("the first Monday");
    expect(checkinDayLabel(LAST_FRIDAY)).toBe("the last Friday");
  });
});

describe("time zones", () => {
  it("counts the day where the person lives", () => {
    expect(localDate("Asia/Kolkata", DEC_6_EVENING_UTC)).toBe("2026-12-07");
    expect(localDate("America/Los_Angeles", DEC_6_EVENING_UTC)).toBe("2026-12-06");
    expect(localDate("UTC", DEC_6_EVENING_UTC)).toBe("2026-12-06");
  });

  it("falls back to UTC for a zone it doesn't know", () => {
    expect(isTimeZone("Mars/Olympus")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(isTimeZone("Europe/Berlin")).toBe(true);
    expect(localDate("Mars/Olympus", DEC_6_EVENING_UTC)).toBe("2026-12-06");
  });

  it("is due on the chosen day in the person's zone, not in UTC", () => {
    expect(decideCheckin(state(), DEC_6_EVENING_UTC)).toEqual({
      action: "send",
      month: "2026-11",
      next: "2027-01-04",
    });
    expect(decideCheckin(state({ timeZone: "America/Los_Angeles" }), DEC_6_EVENING_UTC)).toEqual({
      action: "wait",
    });
  });
});

describe("deciding a check-in", () => {
  const MONDAY_NOON_UTC = Date.UTC(2026, 11, 7, 12, 0);

  it("waits until the day comes", () => {
    expect(decideCheckin(state(), Date.UTC(2026, 11, 3, 12))).toEqual({ action: "wait" });
  });

  it("skips while paused, and moves on to the next day", () => {
    expect(decideCheckin(state({ pausedUntil: "2027-01-01" }), MONDAY_NOON_UTC)).toEqual({
      action: "skip",
      next: "2027-01-04",
      reason: "paused",
    });
    expect(
      decideCheckin(
        state({ pausedUntil: "2027-01-01", nextCheckinOn: "2027-01-04" }),
        Date.UTC(2027, 0, 4, 12),
      ),
    ).toEqual({ action: "send", month: "2026-12", next: "2027-02-01" });
  });

  it("never asks about the same month twice", () => {
    expect(decideCheckin(state({ lastCheckinMonth: "2026-11" }), MONDAY_NOON_UTC)).toEqual({
      action: "skip",
      next: "2027-01-04",
      reason: "asked",
    });
  });

  it("asks about the day it was meant for when a run is late", () => {
    expect(decideCheckin(state(), Date.UTC(2026, 11, 10, 12))).toEqual({
      action: "send",
      month: "2026-11",
      next: "2027-01-04",
    });
  });

  it("follows the chosen day, here the last Friday", () => {
    const friday = state({
      day: LAST_FRIDAY,
      nextCheckinOn: "2026-11-27",
      timeZone: "Europe/Berlin",
    });
    expect(decideCheckin(friday, Date.UTC(2026, 10, 27, 12))).toEqual({
      action: "send",
      month: "2026-11",
      next: "2026-12-25",
    });
  });

  it("schedules a row that has no day yet without asking", () => {
    expect(decideCheckin(state({ nextCheckinOn: null }), MONDAY_NOON_UTC)).toEqual({
      action: "skip",
      next: "2027-01-04",
      reason: "unscheduled",
    });
  });
});

describe("pausing", () => {
  it("counts whole months and keeps to the end of a short one", () => {
    expect(pauseUntil("2026-11-22", 1)).toBe("2026-12-22");
    expect(pauseUntil("2026-11-22", 3)).toBe("2027-02-22");
    expect(pauseUntil("2027-01-31", 1)).toBe("2027-02-28");
  });
});
