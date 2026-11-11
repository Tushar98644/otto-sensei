import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { lintResume } from "./bullets";
import { firstWeakLine } from "./weak-lines";

const STRONG = "Cut checkout errors 38% by rewriting the payment retry logic";
const STRONG_TOO = "Led a team of 6 engineers to ship the mobile app in 4 months";
const TIP = "Cut checkout errors 38% for various teams";
const WARNING = "Responsible for managing the company website";

function resumeWith(
  jobs: { lines: string[]; hidden?: boolean }[],
  projects: string[] = [],
): Resume {
  return {
    ...emptyResume(0),
    experience: jobs.map((job, index) => ({
      id: `job-${index}`,
      company: "Acme",
      title: "Engineer",
      location: "",
      startDate: "2020",
      endDate: "Present",
      ...(job.hidden ? { hidden: true } : {}),
      bullets: job.lines.map((text, line) => ({ id: `job-${index}-${line}`, text })),
    })),
    projects: projects.length
      ? [
          {
            id: "project",
            name: "Ledger",
            link: "",
            bullets: projects.map((text, line) => ({ id: `project-${line}`, text })),
          },
        ]
      : [],
  };
}

describe("firstWeakLine", () => {
  it("is null when every line reads well, or there are no lines", () => {
    expect(firstWeakLine(resumeWith([{ lines: [STRONG, "", STRONG_TOO] }]))).toBeNull();
    expect(firstWeakLine(emptyResume(0))).toBeNull();
  });

  it("starts with the first warning, even after a line with only a tip", () => {
    const resume = resumeWith([{ lines: [STRONG, TIP] }, { lines: [WARNING, WARNING] }]);
    expect(lintResume(resume).byBullet["job-0-1"]?.every((issue) => issue.severity === "low")).toBe(
      true,
    );
    expect(firstWeakLine(resume)).toBe("job-1-0");
  });

  it("falls back to the first tip when nothing has a warning", () => {
    expect(firstWeakLine(resumeWith([{ lines: [STRONG] }], [STRONG_TOO, TIP]))).toBe("project-1");
  });

  it("skips lines that never print", () => {
    expect(
      firstWeakLine(resumeWith([{ lines: [WARNING], hidden: true }, { lines: [STRONG] }])),
    ).toBeNull();
  });

  it("uses lint that already ran when given it", () => {
    const resume = resumeWith([{ lines: [STRONG, STRONG_TOO] }]);
    const flagged = [{ id: "vague" as const, severity: "low" as const, message: "", match: null }];
    expect(firstWeakLine(resume, (id) => (id === "job-0-1" ? flagged : []))).toBe("job-0-1");
  });
});
