import { describe, expect, it } from "vitest";
import type { LintIssue, LintIssueId, LintSeverity } from "@/lib/lint/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { nextWeakLine, ottoCanFix, wantsOtto, weakLines, weakLinesLeft } from "./fix-queue";

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

describe("ottoCanFix", () => {
  it("offers Fix with Otto only on lines with something Otto can rewrite", () => {
    expect(ottoCanFix([issue("no-result")])).toBe(true);
    expect(ottoCanFix([issue("no-number", "low")])).toBe(true);
    expect(ottoCanFix([issue("punctuation", "low")])).toBe(false);
    expect(ottoCanFix([issue("duplicate")])).toBe(false);
    expect(ottoCanFix([])).toBe(false);
  });
});

function resume(): Resume {
  return {
    ...emptyResume(0),
    experience: [
      {
        id: "job",
        title: "Engineer",
        company: "Acme",
        location: "",
        startDate: "Jan 2022",
        endDate: "",
        bullets: [
          { id: "a", text: "Worked on billing" },
          { id: "b", text: "Cut deploy time 40% with a new CI pipeline" },
          { id: "c", text: "Responsible for support" },
          { id: "d", text: "Helped with hiring", hidden: true },
          { id: "e", text: "   " },
          { id: "f", text: "Same line twice" },
        ],
      },
    ],
    projects: [{ id: "p", name: "Site", link: "", bullets: [{ id: "g", text: "Made a site" }] }],
  };
}

const byBullet = new Map<string, readonly LintIssue[]>([
  ["a", [issue("duty")]],
  ["b", []],
  ["c", [issue("no-number", "low")]],
  ["d", [issue("duty")]],
  ["e", [issue("too-short")]],
  ["f", [issue("duplicate")]],
  ["g", [issue("weak-start")]],
]);

describe("weakLines", () => {
  it("lists printed lines Otto can rewrite, in lint order", () => {
    expect(weakLines(resume(), byBullet).map((line) => line.bulletId)).toEqual(["a", "c", "g"]);
  });
});

describe("nextWeakLine", () => {
  it("moves on to the next weak line below", () => {
    expect(nextWeakLine(resume(), byBullet, "a")).toBe("c");
    expect(nextWeakLine(resume(), byBullet, "c")).toBe("g");
  });

  it("wraps to the top once the last weak line is done", () => {
    expect(nextWeakLine(resume(), byBullet, "g")).toBe("a");
  });

  it("starts from where a fixed line was, even once it no longer needs work", () => {
    expect(nextWeakLine(resume(), byBullet, "b")).toBe("c");
  });

  it("skips lines already seen and stops when none are left", () => {
    expect(nextWeakLine(resume(), byBullet, "a", new Set(["c"]))).toBe("g");
    expect(nextWeakLine(resume(), byBullet, "a", new Set(["c", "g"]))).toBeNull();
  });

  it("counts the weak lines still to go after this one", () => {
    expect(weakLinesLeft(resume(), byBullet, "a")).toBe(2);
    expect(weakLinesLeft(resume(), byBullet, "a", new Set(["g"]))).toBe(1);
  });
});
