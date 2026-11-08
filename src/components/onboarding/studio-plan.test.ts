import { describe, expect, it } from "vitest";
import { lintResume } from "@/lib/lint/bullets";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume, newBullet, newExperience, type Resume } from "@/lib/resume/schema";
import { planStudioTour } from "./studio-plan";

function withLines(texts: string[], hidden: number[] = []): Resume {
  const job = newExperience();
  job.title = "Data Engineer";
  job.company = "Acme Payments";
  job.bullets = texts.map((text, index) => ({
    ...newBullet(text),
    hidden: hidden.includes(index),
  }));
  return { ...emptyResume(), experience: [job] };
}

const STRONG =
  "Cut nightly report time from 4 hours to 25 minutes by moving 30 jobs to Airflow and Postgres.";

describe("planStudioTour", () => {
  it("gives three tips at most, starting at the recruiter view after an upload", () => {
    const plan = planStudioTour({ step: "review", resume: createSampleResume(), hasReport: true });
    expect(plan?.stops).toEqual(["read-text", "fix-with-otto", "tailor"]);
  });

  it("starts at the lines when it opens in the editor", () => {
    const plan = planStudioTour({ step: "fix", resume: createSampleResume(), hasReport: true });
    expect(plan?.stops).toEqual(["fix-with-otto", "tailor", "download"]);
  });

  it("skips the recruiter view for resumes that weren't uploaded", () => {
    const plan = planStudioTour({ step: "review", resume: createSampleResume(), hasReport: false });
    expect(plan?.stops[0]).toBe("fix-with-otto");
  });

  it("points at flagged lines, warnings first", () => {
    const resume = createSampleResume();
    const plan = planStudioTour({ step: "fix", resume, hasReport: false });
    const { byBullet } = lintResume(resume);
    const first = plan?.flaggedLineIds[0];
    expect(first).toBeDefined();
    expect(byBullet[first ?? ""]?.some((issue) => issue.severity === "high")).toBe(true);
    for (const id of plan?.flaggedLineIds ?? []) expect(byBullet[id]?.length).toBeGreaterThan(0);
  });

  it("still points at a line when every line looks good", () => {
    const resume = withLines([STRONG]);
    expect(lintResume(resume).totals.withIssues).toBe(0);
    const plan = planStudioTour({ step: "fix", resume, hasReport: false });
    expect(plan?.stops).toEqual(["fix-with-otto", "tailor", "download"]);
    expect(plan?.lineIds).toEqual([resume.experience[0]?.bullets[0]?.id]);
  });

  it("doesn't run for a resume with no lines to fix", () => {
    expect(planStudioTour({ step: "fix", resume: emptyResume(), hasReport: false })).toBeNull();
    expect(
      planStudioTour({ step: "fix", resume: withLines(["", "   "]), hasReport: false }),
    ).toBeNull();
    // A scanned upload: a report, but no text came out of the file.
    expect(planStudioTour({ step: "review", resume: emptyResume(), hasReport: true })).toBeNull();
  });

  it("ignores hidden lines, which never print and get no tag", () => {
    const resume = withLines(["Responsible for various things.", STRONG], [0]);
    const plan = planStudioTour({ step: "fix", resume, hasReport: false });
    const visibleId = resume.experience[0]?.bullets[1]?.id;
    expect(plan?.lineIds).toEqual([visibleId]);
    expect(plan?.flaggedLineIds).toEqual([]);
  });
});
