import { describe, expect, it } from "vitest";
import type { UsagePeriod } from "@/config/plans";
import { prepAllowance, startsByItself, type StartFacts } from "./prep-start";

const TRIAL: UsagePeriod = { kind: "trial", resetsAt: Date.UTC(2026, 10, 24, 12) };
const MONTH: UsagePeriod = { kind: "month", resetsAt: Date.UTC(2026, 11, 17, 12), renews: true };

describe("prep allowance line", () => {
  it("names what is left and that letters share it", () => {
    expect(prepAllowance({ used: 3, limit: 15 }, TRIAL)).toBe(
      "Uses 1 of your 12 left this trial, shared with letters and messages.",
    );
    expect(prepAllowance({ used: 0, limit: 150 }, MONTH)).toBe(
      "Uses 1 of your 150 left this month, shared with letters and messages.",
    );
  });

  it("says when none are left and when they come back", () => {
    expect(prepAllowance({ used: 15, limit: 15 }, TRIAL)).toBe(
      "You've used all 15 cover letters, outreach messages, answers and interview prep this trial. Your full allowance starts on Nov 24.",
    );
  });

  it("says nothing while usage is unknown or on Free", () => {
    expect(prepAllowance(undefined, TRIAL)).toBeNull();
    expect(prepAllowance({ used: 0, limit: 0 }, MONTH)).toBeNull();
  });
});

describe("prep that starts by itself", () => {
  const asked: StartFacts = {
    asked: true,
    pro: true,
    usage: { used: 1, limit: 15 },
    resumes: 3,
    jobKnown: true,
  };

  it("starts only when the link asked for it", () => {
    expect(startsByItself(asked)).toBe(true);
    expect(startsByItself({ ...asked, resumes: 1, usage: undefined })).toBe(true);
    expect(startsByItself({ ...asked, asked: false })).toBe(false);
    expect(startsByItself({ ...asked, asked: false, resumes: 1 })).toBe(false);
  });

  it("waits for a job post, a plan that has prep, and room left", () => {
    expect(startsByItself({ ...asked, jobKnown: false })).toBe(false);
    expect(startsByItself({ ...asked, pro: null })).toBe(false);
    expect(startsByItself({ ...asked, pro: false })).toBe(false);
    expect(startsByItself({ ...asked, usage: { used: 15, limit: 15 } })).toBe(false);
    expect(startsByItself({ ...asked, resumes: 0 })).toBe(false);
  });
});
