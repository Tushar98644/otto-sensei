import { describe, expect, it } from "vitest";
import { emptyResume, newBullet } from "@/lib/resume/schema";
import {
  addLines,
  blankName,
  blanksIn,
  defaultRange,
  fillBlanks,
  jobChoices,
  latestOffer,
  monthFromResumeDate,
} from "./resume-lines";

function resumeWithJob(bullets: string[]) {
  const resume = emptyResume(0);
  resume.experience = [
    {
      id: "job-1",
      company: "Northwind",
      title: "Product designer",
      location: "",
      startDate: "Mar 2025",
      endDate: "Present",
      bullets: bullets.map((text) => newBullet(text)),
    },
  ];
  return resume;
}

describe("adding accepted lines", () => {
  it("puts them at the top of the job, drops a blank line and skips ones already there", () => {
    const resume = resumeWithJob(["Ran the design review", ""]);
    const { resume: next, added } = addLines(resume, "job-1", [
      "Rebuilt the signup flow",
      "ran the design review",
      "Rebuilt the signup flow",
    ]);
    expect(added).toBe(1);
    expect(next.experience[0]?.bullets.map((bullet) => bullet.text)).toEqual([
      "Rebuilt the signup flow",
      "Ran the design review",
    ]);
    expect(resume.experience[0]?.bullets).toHaveLength(2);
  });

  it("changes nothing for a job that's gone or a full one", () => {
    const resume = resumeWithJob(["One"]);
    expect(addLines(resume, "missing", ["Two"])).toEqual({ resume, added: 0 });
    const full = resumeWithJob(Array.from({ length: 40 }, (_, index) => `Line ${index}`));
    expect(addLines(full, "job-1", ["Another"]).added).toBe(0);
  });

  it("names each job for the picker", () => {
    expect(jobChoices(resumeWithJob([]))).toEqual([
      {
        id: "job-1",
        label: "Product designer, Northwind",
        title: "Product designer",
        company: "Northwind",
      },
    ]);
  });
});

describe("blanks", () => {
  it("take the facts the person typed and keep the rest", () => {
    const text = "Cut build time by [% faster] for [number of teams] teams";
    expect(blanksIn(text)).toEqual(["[% faster]", "[number of teams]"]);
    expect(blankName("[% faster]")).toBe("% faster");
    expect(fillBlanks(text, { "[% faster]": "40%", "[number of teams]": " " })).toBe(
      "Cut build time by 40% for [number of teams] teams",
    );
  });
});

describe("the range", () => {
  it("reads the dates resumes use", () => {
    expect(monthFromResumeDate("Mar 2025")).toBe("2025-03");
    expect(monthFromResumeDate("September 2024")).toBe("2024-09");
    expect(monthFromResumeDate("2024-07")).toBe("2024-07");
    expect(monthFromResumeDate("07/2024")).toBe("2024-07");
    expect(monthFromResumeDate("2023")).toBe("2023-01");
    expect(monthFromResumeDate("Present")).toBeNull();
    expect(monthFromResumeDate("13/2024")).toBeNull();
  });

  it("starts at the job's start when the log reaches back that far", () => {
    const months = ["2024-11", "2025-06", "2026-10"];
    expect(defaultRange(months, "Mar 2025")).toEqual({ from: "2025-03", to: "2026-10" });
    expect(defaultRange(months, "Jan 2020")).toEqual({ from: "2024-11", to: "2026-10" });
    expect(defaultRange(months, "")).toEqual({ from: "2024-11", to: "2026-10" });
    expect(defaultRange([], "Mar 2025")).toBeNull();
  });

  it("picks the offer reached last", () => {
    const apps = [
      { id: "a", status: "offer", statusChangedAt: 1 },
      { id: "b", status: "interview", statusChangedAt: 5 },
      { id: "c", status: "offer", statusChangedAt: 3 },
    ];
    expect(latestOffer(apps)?.id).toBe("c");
    expect(latestOffer([])).toBeNull();
  });
});
