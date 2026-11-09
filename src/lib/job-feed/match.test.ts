import { describe, expect, it } from "vitest";
import { matchJob, personFrom, unmatched, type MatchableJob } from "./match";
import { compareRanked } from "./order";
import { minYearsOf, roleFamily, seniorityOf } from "./roles";
import { findSkills, knownSkills } from "./skills";
import type { JobMatch } from "./types";

describe("findSkills", () => {
  it("finds tools under their usual spellings", () => {
    expect(
      findSkills(
        "We use React.js, Node JS, k8s and Postgres on AWS. Front-end in TypeScript (TS).",
      ),
    ).toEqual(["React", "Node.js", "Kubernetes", "PostgreSQL", "AWS", "TypeScript"]);
    expect(findSkills("Experience with Amazon Web Services and Google Cloud Platform")).toEqual([
      "AWS",
      "Google Cloud",
    ]);
    expect(findSkills("C++, C#, .NET and ASP.NET; CI/CD with GitHub Actions")).toEqual([
      "C++",
      "C#",
      ".NET",
      "CI/CD",
      "GitHub Actions",
    ]);
  });

  it("ignores everyday words that share a tool's name", () => {
    expect(findSkills("You react quickly, excel at writing and rest on weekends.")).toEqual([]);
    expect(findSkills("A go-to-market plan; express interest; guard rails")).toEqual([]);
    expect(findSkills("Strong in Go, Excel and REST")).toEqual(["Go", "Excel", "REST"]);
  });

  it("doesn't let a short name hide inside a longer one", () => {
    expect(findSkills("JavaScript only")).toEqual(["JavaScript"]);
    expect(findSkills("Ruby on Rails")).toEqual(["Ruby", "Ruby on Rails"]);
    expect(findSkills("R&D budget")).toEqual([]);
  });

  it("checks what a browser sends against the vocabulary", () => {
    expect(knownSkills(["React", "React", "Made up", "Go"])).toEqual(["React", "Go"]);
  });
});

describe("roles", () => {
  it("reads the kind of role from a title", () => {
    expect(roleFamily("Senior Product Designer")).toBe("design");
    expect(roleFamily("Product Marketing Manager")).toBe("marketing");
    expect(roleFamily("Staff Backend Engineer")).toBe("engineering");
    expect(roleFamily("Data Engineer")).toBe("data");
    expect(roleFamily("Product Manager, Growth")).toBe("product");
    expect(roleFamily("Account Executive")).toBe("sales");
    expect(roleFamily("Founder")).toBeNull();
  });

  it("reads seniority from a title", () => {
    expect(seniorityOf("Software Engineer Intern")).toBe("intern");
    expect(seniorityOf("Junior Developer")).toBe("junior");
    expect(seniorityOf("Software Engineer I")).toBe("junior");
    expect(seniorityOf("Software Engineer")).toBe("mid");
    expect(seniorityOf("Sr. Data Analyst")).toBe("senior");
    expect(seniorityOf("Staff Engineer")).toBe("lead");
    expect(seniorityOf("Engineering Manager")).toBe("lead");
    expect(seniorityOf("Product Manager")).toBe("mid");
    expect(seniorityOf("Head of Design")).toBe("director");
  });

  it("finds the fewest years a post asks for", () => {
    expect(
      minYearsOf("You have 5+ years of experience. Nice to have: 8 years of Go experience."),
    ).toBe(5);
    expect(minYearsOf("3-5 years of professional software experience")).toBe(3);
    expect(minYearsOf("We were founded 10 years ago")).toBeNull();
  });
});

const job = (overrides: Partial<MatchableJob> = {}): MatchableJob => ({
  title: "Senior Backend Engineer",
  keywords: ["TypeScript", "Node.js", "PostgreSQL", "Kubernetes"],
  seniority: "senior",
  minYears: null,
  ...overrides,
});

const engineer = personFrom({
  skills: ["TypeScript", "Node.js", "PostgreSQL", "React", "NestJS"],
  titles: ["Senior Software Engineer", "Software Engineer"],
  years: 6,
});

describe("matchJob", () => {
  it("calls it strong and says what was found and not found", () => {
    expect(matchJob(engineer, job())).toEqual({
      label: "strong",
      found: ["TypeScript", "Node.js", "PostgreSQL"],
      missing: ["Kubernetes"],
      reason: "Found in your resume: TypeScript, Node.js, PostgreSQL. Not found: Kubernetes.",
      notes: [],
      blocked: false,
    });
  });

  it("is good with a little overlap in the same kind of role", () => {
    const match = matchJob(engineer, job({ keywords: ["TypeScript", "Go", "Kafka", "Rust"] }));
    expect(match?.label).toBe("good");
    expect(match?.reason).toBe("Found in your resume: TypeScript. Not found: Go, Kafka, Rust.");
  });

  it("is a stretch two levels up, or short on years, and says why", () => {
    const up = matchJob(engineer, job({ seniority: "director", title: "Director of Engineering" }));
    expect(up?.label).toBe("stretch");
    expect(up?.notes).toEqual(["This is a director-level role, a step up from your latest title."]);
    const years = matchJob(engineer, job({ minYears: 8 }));
    expect(years?.label).toBe("good");
    expect(years?.notes).toEqual(["Asks for 8+ years; your resume shows about 6 years."]);
  });

  it("caps a job the work profile can't meet at stretch, with the rule", () => {
    const match = matchJob(engineer, job(), {
      blocked: true,
      note: "You said you'd need a visa for the US.",
    });
    expect(match).toMatchObject({ label: "stretch", blocked: true });
    expect(match?.notes).toContain("You said you'd need a visa for the US.");
  });

  it("leaves out jobs that share nothing", () => {
    expect(
      matchJob(engineer, job({ title: "Account Executive", keywords: ["Salesforce"] })),
    ).toBeNull();
    expect(matchJob(engineer, job({ title: "Recruiter", keywords: ["TypeScript"] }))).toBeNull();
    expect(unmatched(job({ keywords: ["Salesforce"] })).reason).toContain("Not found: Salesforce.");
  });

  it("orders strong before good before stretch, then by closeness", () => {
    const ranked = (match: JobMatch, closeness: number, postedAt: number) => ({
      match,
      company: "Acme",
      postedAt,
      closeness,
    });
    const list = [
      ranked(matchJob(engineer, job({ seniority: "director" }))!, 9, 3),
      ranked(matchJob(engineer, job())!, 1, 1),
      ranked(matchJob(engineer, job({ keywords: ["TypeScript", "Go"] }))!, 5, 2),
      ranked(matchJob(engineer, job())!, 4, 0),
    ];
    expect(list.sort(compareRanked).map((item) => [item.match.label, item.closeness])).toEqual([
      ["strong", 4],
      ["strong", 1],
      ["good", 5],
      ["stretch", 9],
    ]);
  });

  it("never prints a score", () => {
    const match = matchJob(engineer, job())!;
    expect([match.reason, ...match.notes].join(" ")).not.toMatch(/\d+\s*%|score|\/100/i);
  });
});
