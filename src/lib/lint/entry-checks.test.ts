import { describe, expect, it } from "vitest";
import { entryChecks, type CheckedLine } from "./entry-checks";
import type { LintIssue, LintIssueId, LintSeverity } from "./types";

const issue = (id: LintIssueId, severity: LintSeverity = "high"): LintIssue => ({
  id,
  severity,
  message: id,
  match: null,
});

const line = (id: string, ...issues: LintIssue[]): CheckedLine => ({ id, issues });

const byId = (checks: ReturnType<typeof entryChecks>) =>
  Object.fromEntries(checks.map((check) => [check.id, check]));

describe("entryChecks", () => {
  it("has nothing to check without lines", () => {
    expect(entryChecks([], true)).toEqual([]);
  });

  it("passes every check for clean lines, in a fixed order", () => {
    const checks = entryChecks([line("a"), line("b")], false);
    expect(checks.map((check) => check.label)).toEqual([
      "Says what changed",
      "Starts strong",
      "No I, me or we",
      "No stock phrases",
      "Right length",
      "Has numbers",
      "Says how",
      "Says who did it",
      "No vague words",
      "No repeated lines",
      "Full stops match",
    ]);
    expect(checks.every((check) => check.lineIds.length === 0 && check.severity === null)).toBe(
      true,
    );
  });

  it("asks for past tense only once the job has ended, and full stops only with two lines", () => {
    const ids = (checks: ReturnType<typeof entryChecks>) => checks.map((check) => check.id);
    expect(ids(entryChecks([line("a")], true))).toContain("tense");
    expect(ids(entryChecks([line("a")], false))).not.toContain("tense");
    expect(ids(entryChecks([line("a")], false))).not.toContain("stops");
    expect(ids(entryChecks([line("a"), line("b")], false))).toContain("stops");
  });

  it("lists the lines each check flags, in order, with the strongest severity", () => {
    const checks = byId(
      entryChecks(
        [
          line("a", issue("no-result")),
          line("b", issue("duty"), issue("vague", "low")),
          line("c", issue("no-number", "low"), issue("punctuation", "low")),
          line("d", issue("too-short", "low")),
        ],
        false,
      ),
    );
    expect(checks.result).toMatchObject({ lineIds: ["a", "b"], severity: "high" });
    // A line with no result has no number either.
    expect(checks.numbers).toMatchObject({ lineIds: ["a", "c"], severity: "high" });
    expect(checks.vague).toMatchObject({ lineIds: ["b"], severity: "low" });
    expect(checks.length).toMatchObject({ lineIds: ["d"], severity: "low" });
    expect(checks.stops).toMatchObject({ lineIds: ["c"], severity: "low" });
    expect(checks.start).toMatchObject({ lineIds: [], severity: null });
  });
});
