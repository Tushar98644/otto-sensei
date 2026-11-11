import { describe, expect, it } from "vitest";
import type { LintIssue, LintIssueId, LintSeverity } from "@/lib/lint/types";
import { wantsOtto } from "./line-help";

const issue = (id: LintIssueId, severity: LintSeverity = "high"): LintIssue => ({
  id,
  severity,
  message: "",
  match: null,
});

describe("wantsOtto", () => {
  it("keeps Fix with Otto in view for a chip Otto can rewrite", () => {
    expect(wantsOtto([issue("duty")])).toBe(true);
    expect(wantsOtto([issue("no-result"), issue("weak-start")])).toBe(true);
    expect(wantsOtto([issue("no-result")])).toBe(true);
  });

  it("leaves it for focus when the only problem is minor or fixed by hand", () => {
    expect(wantsOtto([issue("punctuation", "low")])).toBe(false);
    expect(wantsOtto([issue("duplicate")])).toBe(false);
    expect(wantsOtto([issue("no-number", "low")])).toBe(false);
    expect(wantsOtto([])).toBe(false);
  });
});
