import { describe, expect, it } from "vitest";
import {
  addDays,
  dayIn,
  isDay,
  knownTimeZone,
  lastFullWeek,
  mondayOf,
  startOfDay,
  weekDays,
  weekdayName,
  weekLabel,
  weekRange,
} from "./week";

describe("weeks", () => {
  it("names a week by its Monday", () => {
    expect(mondayOf("2026-11-22")).toBe("2026-11-16");
    expect(mondayOf("2026-11-16")).toBe("2026-11-16");
    expect(mondayOf("2026-11-23")).toBe("2026-11-23");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("is ready on Monday where the person is, for the week before", () => {
    const sundayNoonUtc = Date.UTC(2026, 10, 22, 12);
    expect(lastFullWeek(sundayNoonUtc, "UTC")).toBe("2026-11-09");
    expect(lastFullWeek(sundayNoonUtc, "Pacific/Kiritimati")).toBe("2026-11-16");
    expect(lastFullWeek(Date.UTC(2026, 10, 22, 19), "Asia/Kolkata")).toBe("2026-11-16");
    expect(lastFullWeek(Date.UTC(2026, 10, 23, 7), "America/Los_Angeles")).toBe("2026-11-09");
  });

  it("starts each day at local midnight, clock changes included", () => {
    expect(startOfDay("2026-11-16", "Asia/Kolkata")).toBe(Date.UTC(2026, 10, 15, 18, 30));
    expect(startOfDay("2026-11-16", "America/New_York")).toBe(Date.UTC(2026, 10, 16, 5));
    // New York moves its clocks on Sunday Nov 1, 2026.
    const range = weekRange("2026-10-26", "America/New_York");
    expect(range.start).toBe(Date.UTC(2026, 9, 26, 4));
    expect(range.end).toBe(Date.UTC(2026, 10, 2, 5));
    expect(dayIn(range.end - 1, "America/New_York")).toBe("2026-11-01");
  });

  it("labels a week the short way, across months and years too", () => {
    expect(weekLabel("2026-11-16")).toBe("Nov 16–22");
    expect(weekLabel("2026-11-30")).toBe("Nov 30 – Dec 6");
    expect(weekLabel("2026-12-28")).toBe("Dec 28 – Jan 3");
    expect(weekDays("2026-11-16").map(weekdayName)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });

  it("checks days and time zones", () => {
    expect(isDay("2026-11-16")).toBe(true);
    expect(isDay("2026-13-01")).toBe(false);
    expect(isDay("16-11-2026")).toBe(false);
    expect(knownTimeZone("Asia/Kolkata")).toBe("Asia/Kolkata");
    expect(knownTimeZone("Mars/Olympus")).toBe("UTC");
    expect(knownTimeZone(undefined)).toBe("UTC");
  });
});
