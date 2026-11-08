import { describe, expect, it } from "vitest";
import { perPeriod, resetDay, resetSentence, thisPeriod } from "./usage-copy";

const WEEK = { kind: "week", resetsAt: Date.UTC(2026, 10, 19, 9, 30) } as const;
const MONTH = { kind: "month", resetsAt: Date.UTC(2026, 11, 1) } as const;

describe("usage period copy", () => {
  it("writes the calendar month by default and for monthly periods", () => {
    for (const period of [undefined, null, MONTH, "month" as const]) {
      expect(thisPeriod(period)).toBe("this month");
      expect(perPeriod(period)).toBe("a month");
    }
    expect(resetSentence(MONTH)).toBe("They reset on the 1st.");
    expect(resetSentence(null)).toBe("They reset on the 1st.");
  });

  it("writes the week and the day it starts over for weekly periods", () => {
    expect(thisPeriod(WEEK)).toBe("this week");
    expect(perPeriod("week")).toBe("a week");
    expect(resetDay(WEEK, "UTC")).toBe("Nov 19");
    expect(resetSentence(WEEK, "UTC")).toBe("They reset on Nov 19.");
    // In the reader's own zone the day can differ.
    expect(resetDay({ kind: "week", resetsAt: Date.UTC(2026, 10, 19, 23) }, "Asia/Tokyo")).toBe("Nov 20");
  });
});
