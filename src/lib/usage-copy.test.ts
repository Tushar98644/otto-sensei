import { describe, expect, it } from "vitest";
import {
  perPeriod,
  periodNoun,
  PLAN_PROMISES,
  resetDay,
  resetRule,
  resetSentence,
  resetWhen,
  thisPeriod,
  trialEndDay,
} from "./usage-copy";

const MONTHLY = { kind: "month", resetsAt: Date.UTC(2026, 11, 17, 9, 30), renews: true } as const;
const YEARLY = { kind: "month", resetsAt: Date.UTC(2026, 11, 17, 9, 30), renews: false } as const;
const CALENDAR = { kind: "month", resetsAt: Date.UTC(2026, 11, 1) } as const;

describe("usage period copy", () => {
  it("writes a month by default and for monthly periods", () => {
    for (const period of [undefined, null, MONTHLY, "month" as const]) {
      expect(thisPeriod(period)).toBe("this month");
      expect(perPeriod(period)).toBe("a month");
    }
  });

  it("says a monthly plan's limits reset when it renews, never on the 1st", () => {
    expect(resetDay(MONTHLY, "UTC")).toBe("Dec 17");
    expect(resetWhen(MONTHLY, "UTC")).toBe("on Dec 17, when your plan renews");
    expect(resetSentence(MONTHLY, "UTC")).toBe("They reset on Dec 17, when your plan renews.");
    expect(resetSentence(YEARLY, "UTC")).toBe("They reset on Dec 17.");
    expect(resetSentence(CALENDAR, "UTC")).toBe("They reset on Dec 1.");
    for (const period of [MONTHLY, YEARLY, CALENDAR, null, undefined]) {
      expect(resetSentence(period, "UTC")).not.toMatch(/1st/);
    }
  });

  it("says when your plan renews when no date is known", () => {
    expect(resetDay(null)).toBeNull();
    expect(resetWhen(undefined)).toBe("when your plan renews");
    expect(resetSentence(null)).toBe("They reset when your plan renews.");
  });

  it("writes the reset day in the reader's time zone", () => {
    expect(resetDay({ kind: "month", resetsAt: Date.UTC(2026, 10, 19, 23) }, "Asia/Tokyo")).toBe("Nov 20");
  });

  it("writes a trial as its own period that ends with the trial", () => {
    const trial = { kind: "trial", resetsAt: Date.UTC(2026, 10, 11, 12) } as const;
    expect(periodNoun(trial)).toBe("trial");
    expect(thisPeriod(trial)).toBe("this trial");
    expect(perPeriod("trial")).toBe("during the trial");
    expect(resetDay(trial, "UTC")).toBe("Nov 11");
    expect(resetSentence(trial, "UTC")).toBe("Your full allowance starts on Nov 11.");
    expect(trialEndDay(trial.resetsAt, "UTC")).toBe("Nov 11");
  });

  it("states each billing option's reset rule, and keeps the two promises", () => {
    expect(resetRule("month")).toBe("Limits reset each month, when your plan renews.");
    expect(resetRule("year")).toBe("Limits reset each month, on the day of the month your plan started.");
    expect(PLAN_PROMISES).toBe(
      "Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.",
    );
  });
});
