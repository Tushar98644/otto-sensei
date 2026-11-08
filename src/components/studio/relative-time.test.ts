import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

const NOW = Date.UTC(2026, 10, 6, 12, 0, 0);
const MINUTE = 60_000;

describe("formatRelativeTime", () => {
  it("says just now for the last few seconds and for future times", () => {
    expect(formatRelativeTime(NOW - 10_000, NOW)).toBe("just now");
    expect(formatRelativeTime(NOW + 5 * MINUTE, NOW)).toBe("just now");
    expect(formatRelativeTime(Number.NaN, NOW)).toBe("just now");
  });

  it("rounds down to the largest whole unit", () => {
    expect(formatRelativeTime(NOW - 50_000, NOW)).toBe("1 minute ago");
    expect(formatRelativeTime(NOW - 12 * MINUTE, NOW)).toBe("12 minutes ago");
    expect(formatRelativeTime(NOW - 119 * MINUTE, NOW)).toBe("1 hour ago");
    expect(formatRelativeTime(NOW - 30 * 60 * MINUTE, NOW)).toBe("yesterday");
    expect(formatRelativeTime(NOW - 10 * 24 * 60 * MINUTE, NOW)).toBe("last week");
    expect(formatRelativeTime(NOW - 400 * 24 * 60 * MINUTE, NOW)).toBe("last year");
  });
});
