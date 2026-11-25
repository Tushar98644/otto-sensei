import { describe, expect, it } from "vitest";
import type { RecruiterReport } from "@/lib/checks/types";
import type { ResumeLint } from "@/lib/lint/types";
import { EN, FORMAT_EN } from "./messages-testing";
import { linesChip, reportChip } from "./resume-status";

function report(fail: number, warn: number): RecruiterReport {
  return { counts: { fail, warn, pass: 13 - fail - warn } } as RecruiterReport;
}

function lint(bullets: number, withIssues: number): ResumeLint {
  return { byBullet: {}, totals: { bullets, withIssues, withNumbers: 0, highSeverity: 0 } };
}

describe("reportChip", () => {
  it("leads with problems, then warnings, then a pass", () => {
    expect(reportChip(report(2, 1), EN.dashboard, FORMAT_EN)).toEqual({
      status: "fail",
      label: "2 file problems",
    });
    expect(reportChip(report(0, 1), EN.dashboard, FORMAT_EN)).toEqual({
      status: "warn",
      label: "1 file warning",
    });
    expect(reportChip(report(0, 0), EN.dashboard, FORMAT_EN)).toEqual({
      status: "pass",
      label: "File reads cleanly",
    });
  });

  it("shows nothing without an uploaded file", () => {
    expect(reportChip(undefined, EN.dashboard, FORMAT_EN)).toBeNull();
  });
});

describe("linesChip", () => {
  it("counts lines to improve", () => {
    expect(linesChip(lint(5, 2), EN.dashboard, FORMAT_EN)).toEqual({
      status: "warn",
      label: "2 lines to improve",
    });
    expect(linesChip(lint(5, 1), EN.dashboard, FORMAT_EN)).toEqual({
      status: "warn",
      label: "1 line to improve",
    });
    expect(linesChip(lint(5, 0), EN.dashboard, FORMAT_EN)).toEqual({
      status: "pass",
      label: "Lines look good",
    });
  });

  it("shows nothing for a resume with no lines yet", () => {
    expect(linesChip(lint(0, 0), EN.dashboard, FORMAT_EN)).toBeNull();
  });
});
