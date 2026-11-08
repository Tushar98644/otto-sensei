import { describe, expect, it } from "vitest";
import { postedLine } from "./job-form";

// Local times, so the calendar-day count holds in any test machine's time zone.
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();

describe("postedLine", () => {
  it("gives the date and how many days ago", () => {
    expect(postedLine(at(2026, 7, 22, 13), at(2026, 11, 7, 9))).toBe(
      "First posted Jul 22 (108 days ago)",
    );
  });

  it("counts calendar days, not 24-hour blocks", () => {
    expect(postedLine(at(2026, 11, 6, 23), at(2026, 11, 7, 1))).toBe("First posted yesterday");
    expect(postedLine(at(2026, 11, 7, 1), at(2026, 11, 7, 23))).toBe("First posted today");
  });

  it("adds the year for older posts", () => {
    expect(postedLine(at(2025, 12, 30), at(2026, 1, 2))).toBe(
      "First posted Dec 30, 2025 (3 days ago)",
    );
  });

  it("shows only the date before the clock is known, or for a date ahead of it", () => {
    expect(postedLine(at(2026, 7, 22), 0)).toBe("First posted Jul 22");
    expect(postedLine(at(2026, 11, 9), at(2026, 11, 7))).toBe("First posted Nov 9");
  });
});
