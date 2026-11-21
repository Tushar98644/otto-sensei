import { describe, expect, it } from "vitest";
import { matchCheckFromText } from "@/lib/match-check/from-text";
import { postProblem, resumeProblem } from "./inputs";
import { sampleTexts } from "./sample";

describe("the sample resume and job post", () => {
  const { resume, job } = sampleTexts();

  it("pass the page's own checks, so trying them never shows an error", () => {
    expect(resumeProblem("paste", resume, { status: "idle" })).toBeNull();
    expect(postProblem(job)).toBeNull();
  });

  it("show every kind of result: shown in a line, only listed, and missing", () => {
    const check = matchCheckFromText(resume, job);
    const statuses = new Set(check.rows.map((row) => row.status));
    expect(statuses).toEqual(new Set(["shown", "listed", "missing"]));
    expect(check.sorted).toBe(true);
    expect(check.must.total).toBeGreaterThan(0);
    expect(check.nice.total).toBeGreaterThan(0);
    expect(check.must.found).toBeLessThan(check.must.total);
  });
});
