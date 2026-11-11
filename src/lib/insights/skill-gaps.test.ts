import { describe, expect, it } from "vitest";
import { emptyResume, newBullet, newExperience, newSkillGroup, type Resume } from "@/lib/resume/schema";
import { gapLine, gapNudge, jobLabel, skillGaps } from "./skill-gaps";

type CopyOptions = {
  company: string;
  title?: string;
  keywords: string[];
  lines?: string[];
  skills?: string[];
  updatedAt?: number;
  extra?: Record<string, unknown>;
};

function copy({ company, title = "Data Engineer", keywords, lines = [], skills = [], updatedAt = 1, extra = {} }: CopyOptions): Resume {
  const resume = emptyResume(updatedAt);
  const job = { ...newExperience(), title: "Engineer", company: "Acme", bullets: lines.map((line) => newBullet(line)) };
  const group = { ...newSkillGroup("Tools"), items: skills };
  return {
    ...resume,
    source: "tailored",
    title: `${title} at ${company}`,
    experience: [job],
    skills: skills.length ? [group] : [],
    tailor: {
      baseResumeId: "base",
      jobTitle: title,
      company,
      keywords,
      createdAt: updatedAt,
      ...extra,
    },
    updatedAt,
  };
}

describe("skillGaps", () => {
  it("counts each job once and names the skill missing from most of them", () => {
    const resumes = [
      copy({ company: "Mapline", keywords: ["Kubernetes", "SQL"], lines: ["Wrote SQL reports for 3 teams"], updatedAt: 5 }),
      copy({ company: "Northwind", keywords: ["kubernetes", "SQL"], lines: ["Tuned SQL queries"], updatedAt: 4 }),
      copy({ company: "Contoso", keywords: ["Kubernetes", "Terraform"], lines: ["Ran Kubernetes clusters"], updatedAt: 3 }),
      copy({ company: "Fabrikam", keywords: ["Kubernetes", "Terraform"], updatedAt: 2 }),
    ];
    const report = skillGaps(resumes);
    expect(report.jobs).toBe(4);
    expect(report.gaps[0]).toEqual({
      term: "Kubernetes",
      asked: 4,
      missing: 3,
      listed: 0,
      jobs: ["Data Engineer at Mapline", "Data Engineer at Northwind", "Data Engineer at Fabrikam"],
      copyIds: [resumes[0]!.id, resumes[1]!.id, resumes[3]!.id],
    });
    expect(report.gaps.map((gap) => gap.term)).toEqual(["Kubernetes", "Terraform"]);
    expect(gapLine(report.gaps[0]!, report.jobs)).toBe(
      "Kubernetes: missing in 3 of 4 jobs you tailored for",
    );
  });

  it("keeps only the newest copy of the same job", () => {
    const old = copy({ company: "Mapline", keywords: ["Go"], updatedAt: 1 });
    const fresh = copy({ company: "mapline ", keywords: ["Go"], lines: ["Built Go services"], updatedAt: 9 });
    const other = copy({ company: "Contoso", keywords: ["Go"], updatedAt: 2 });
    const report = skillGaps([old, fresh, other]);
    expect(report.jobs).toBe(2);
    expect(report.gaps).toEqual([]);
  });

  it("tells a skills-list entry apart from a line that shows it", () => {
    const resumes = [
      copy({ company: "A", keywords: ["Docker"], skills: ["Docker"], updatedAt: 3 }),
      copy({ company: "B", keywords: ["Docker"], skills: ["Docker"], updatedAt: 2 }),
    ];
    const [gap] = skillGaps(resumes).gaps;
    expect(gap).toMatchObject({ term: "Docker", missing: 0, listed: 2 });
    expect(gapLine(gap!, 2)).toBe("Docker: only in your skills list for 2 of 2 jobs");
    expect(gapNudge(gap!).kind).toBe("show");
  });

  it("prefers saved requirement terms over keywords when a copy has them", () => {
    const requirements = [
      { text: "Airflow in production", importance: "must", terms: ["Airflow"] },
      { text: "Mentoring engineers", importance: "nice", terms: [] },
      { broken: true },
    ];
    const resumes = [
      copy({ company: "A", keywords: ["Excel"], extra: { requirements }, updatedAt: 2 }),
      copy({ company: "B", keywords: ["Excel"], extra: { requirements }, updatedAt: 1 }),
    ];
    expect(skillGaps(resumes).gaps.map((gap) => gap.term)).toEqual(["Airflow"]);
  });

  it("ignores resumes that aren't tailored and copies with nothing saved", () => {
    const base = emptyResume(1);
    const bare = copy({ company: "A", keywords: [] });
    expect(skillGaps([base, bare])).toEqual({ jobs: 1, gaps: [] });
  });

  it("uses the spelling most jobs used and respects the limit", () => {
    const resumes = ["A", "B", "C"].map((company, index) =>
      copy({
        company,
        keywords: [index === 0 ? "postgres" : "PostgreSQL", "Rust", "Scala"],
        updatedAt: 10 - index,
      }),
    );
    const report = skillGaps(resumes, 2);
    expect(report.gaps).toHaveLength(2);
    expect(report.gaps[0]?.term).toBe("PostgreSQL");
  });
});

describe("gap copy", () => {
  it("names a job by title and company, falling back to what's there", () => {
    expect(jobLabel(copy({ company: "Mapline", title: "Analyst", keywords: [] }))).toBe("Analyst at Mapline");
    expect(jobLabel(copy({ company: "", title: "Analyst", keywords: [] }))).toBe("Analyst");
  });

  it("mixes missing and listed into one plain line", () => {
    const gap = { term: "AWS", asked: 5, missing: 2, listed: 1, jobs: [], copyIds: [] };
    expect(gapLine(gap, 7)).toBe("AWS: not shown in a line in 3 of 7 jobs you tailored for");
    expect(gapNudge(gap)).toEqual({
      kind: "learn",
      text: "If you've used AWS, add a line that says where. If not, 5 of your jobs asked for it: a small project counts.",
    });
  });
});
