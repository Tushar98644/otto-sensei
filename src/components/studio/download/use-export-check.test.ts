import { describe, expect, it } from "vitest";
import { MAX_AUTO_CHECKS, shouldAutoCheck } from "./use-export-check";

const ready = { fileKey: "r1:5:LETTER:classic", fresh: false, checking: false, failed: false };

describe("shouldAutoCheck", () => {
  it("checks a finished PDF on its own when no fresh result is saved", () => {
    expect(shouldAutoCheck({ ...ready, autoRuns: 0 })).toBe(true);
  });

  it("waits for the PDF, and never repeats a fresh or running check", () => {
    expect(shouldAutoCheck({ ...ready, fileKey: null, autoRuns: 0 })).toBe(false);
    expect(shouldAutoCheck({ ...ready, fresh: true, autoRuns: 0 })).toBe(false);
    expect(shouldAutoCheck({ ...ready, checking: true, autoRuns: 0 })).toBe(false);
  });

  it("leaves a failed check to the Try again button", () => {
    expect(shouldAutoCheck({ ...ready, failed: true, autoRuns: 0 })).toBe(false);
  });

  it("stops after a few runs in one visit, since checks share a daily limit", () => {
    expect(shouldAutoCheck({ ...ready, autoRuns: MAX_AUTO_CHECKS - 1 })).toBe(true);
    expect(shouldAutoCheck({ ...ready, autoRuns: MAX_AUTO_CHECKS })).toBe(false);
  });
});
