import { describe, expect, it } from "vitest";
import { timeAgo } from "./time-ago";

const NOW = Date.UTC(2026, 10, 8, 12);
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe("timeAgo", () => {
  it.each([
    [0, "just now"],
    [30_000, "just now"],
    [5 * MINUTE, "5 minutes ago"],
    [3 * 60 * MINUTE, "3 hours ago"],
    [DAY, "yesterday"],
    [3 * DAY, "3 days ago"],
    [21 * DAY, "3 weeks ago"],
    [65 * DAY, "2 months ago"],
    [400 * DAY, "last year"],
  ])("%d ms ago reads as %s", (elapsed, expected) => {
    expect(timeAgo(NOW - elapsed, NOW)).toBe(expected);
  });

  it("treats a time slightly in the future (clock skew) as just now", () => {
    expect(timeAgo(NOW + 5_000, NOW)).toBe("just now");
  });
});
