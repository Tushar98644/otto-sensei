import { describe, expect, it } from "vitest";
import { KIND, kindOf, matchJob, personFrom, unmatched, type MatchableJob } from "./match";
import { OCCUPATIONS, occupationOf } from "./occupations";
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

  it("doesn't read plain English as a short tech name", () => {
    for (const line of [
      "You will own our Go To Market strategy for the EMEA region.",
      "Go deep on customer problems. Go above and beyond for our partners.",
      "Go onsite to customer offices twice a month.",
      "Access your benefits on the go with our app.",
      "Go-to-market lead; go-live support",
      "Swift action on incidents. Spark curiosity in every meeting.",
      "Ruby's team reports to Julia's group.",
      "A Series C company; Vitamin C and Grade R are not languages.",
      "Excel at writing clear updates. React to feedback quickly.",
      "Our office on Elm Street, near Cypress, California.",
    ]) {
      expect(findSkills(line), line).toEqual([]);
    }
  });

  it("still finds short tech names next to other tech or tech words", () => {
    expect(findSkills("Backend engineer building payment services in Go.")).toEqual(["Go"]);
    expect(findSkills("Skills: Go, PostgreSQL, Kubernetes")).toEqual([
      "Go",
      "PostgreSQL",
      "Kubernetes",
    ]);
    expect(findSkills("Senior Go Engineer")).toEqual(["Go"]);
    expect(findSkills("Software Engineer (Go)")).toEqual(["Go"]);
    expect(findSkills("Experience with Python, Go, or Rust")).toEqual(["Python", "Go", "Rust"]);
    expect(findSkills("Statistics in R; R packages")).toEqual(["Statistics", "R"]);
    expect(findSkills("Embedded C and C++ on Linux")).toEqual(["C", "C++", "Linux"]);
    expect(findSkills("iOS apps in Swift and SwiftUI")).toEqual(["iOS", "Swift", "SwiftUI"]);
    expect(findSkills("Spark jobs on Databricks; PySpark")).toEqual(["Spark", "Databricks"]);
    expect(findSkills("Frontend in Elm")).toEqual(["Elm"]);
    expect(findSkills("Excel models and Excel macros")).toEqual(["Excel"]);
    expect(findSkills("System programming with C, C++, and/or Rust.")).toEqual([
      "C",
      "C++",
      "Rust",
    ]);
    expect(findSkills("Streaming such as Apache Kafka or Apache Flink")).toEqual([
      "Kafka",
      "Flink",
    ]);
    expect(findSkills("Our Helm chart and Docker Compose setup")).toEqual(["Helm", "Docker"]);
    expect(findSkills("- Frontend: React and Typescript")).toEqual(["React", "TypeScript"]);
    expect(findSkills("Ruby experience (our platform runs on Rails)")).toEqual([
      "Ruby",
      "Ruby on Rails",
    ]);
    expect(findSkills("Led by Altimeter Capital and Spark Capital.")).toEqual([]);
  });

  it("judges each mention, so plain English before the tech one doesn't hide it", () => {
    expect(findSkills("Go deep on data. Our services are written in Go.")).toEqual(["Go"]);
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
    expect(seniorityOf("Manager, Sales Development")).toBe("lead");
    expect(seniorityOf("Manager I, Engineering - Client SDKs")).toBe("lead");
    expect(seniorityOf("Senior Manager, Software Engineering (Android)")).toBe("lead");
    expect(seniorityOf("Account Manager, Enterprise")).toBe("mid");
  });

  it("doesn't call every analyst a data role", () => {
    expect(roleFamily("Accounts Payable Analyst")).toBe("finance");
    expect(roleFamily("Sr. Analyst, Identity & KYC")).toBe("legal");
    expect(roleFamily("Senior Business Intelligence Analyst")).toBe("data");
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

describe("role kind by title age", () => {
  const profile = {
    skills: ["Jira", "SQL"],
    titles: ["Product Manager", "Business Analyst"],
    years: 4,
  };
  const pm = personFrom(profile);
  const post = (title: string): MatchableJob => ({
    title,
    keywords: [],
    seniority: "mid",
    minYears: null,
  });

  it("counts the latest title's kind fully and an older title's at half", () => {
    expect(pm.families.get("product")).toBe(1);
    expect(pm.families.get("operations")).toBe(0.5);
    expect(pm.seniority).toBe("mid");
  });

  it("labels a job of an older title's kind a step lower, and says why", () => {
    const ops = matchJob(pm, post("Shift Coordinator"));
    expect(ops?.label).toBe("stretch");
    expect(ops?.reason).toBe(
      "Like an earlier role on your resume. The post names no tools to compare.",
    );
    expect(matchJob(pm, post("Product Manager"))?.label).toBe("good");
  });

  it("follows the role and level the Looking for card names", () => {
    const switched = personFrom(profile, { family: "data", level: "senior" });
    expect(switched.families.get("data")).toBe(1);
    expect(switched.families.get("product")).toBe(0.5);
    expect(switched.seniority).toBe("senior");
  });
});

describe("occupations for every kind of work", () => {
  const nurse = personFrom(
    { skills: [], titles: ["Registered Nurse", "Nursing Assistant"], years: 5 },
    null,
    OCCUPATIONS,
  );
  const post = (title: string): MatchableJob => {
    const { family, occupation } = OCCUPATIONS.read(title);
    return {
      title,
      keywords: [],
      seniority: "mid",
      minYears: null,
      family,
      occupation,
      occupationName: occupationOf(occupation)?.name ?? null,
      zone: occupation ? OCCUPATIONS.zone(occupation) : null,
    };
  };

  it("reads the newest title's occupation as the one looked for", () => {
    expect(nurse.occupation).toBe("29-1141.00");
    expect(nurse.families.size).toBe(0);
    expect(nurse.occupations.get("29-1141.00")).toBe(1);
  });

  it("orders the same occupation, then close ones, then the same field, and says which", () => {
    const same = matchJob(nurse, post("Staff Nurse - Med/Surg"));
    expect(same?.label).toBe("good");
    expect(same?.reason).toBe(
      "The same occupation as yours: Registered Nurse. The post names no tools to compare.",
    );
    const near = post("Licensed Practical Nurse (LPN)");
    expect(kindOf(nurse, near)).toEqual({ weight: KIND.close, via: "close" });
    expect(matchJob(nurse, near)?.label).toBe("good");
    const field = post("Respiratory Therapist");
    expect(kindOf(nurse, field).weight).toBeLessThan(KIND.close);
    expect(matchJob(nurse, field)?.label).toBe("stretch");
    expect(matchJob(nurse, post("CDL-A Truck Driver"))).toBeNull();
  });

  it("notes when a job usually needs much more preparation (O*NET Job Zones)", () => {
    const technician = personFrom(
      { skills: [], titles: ["Pharmacy Technician"], years: 2 },
      null,
      OCCUPATIONS,
    );
    const pharmacist = matchJob(technician, post("Pharmacist"));
    expect(pharmacist?.label).toBe("stretch");
    expect(pharmacist?.notes).toContain(
      "Jobs like this usually need more training or experience than your latest role.",
    );
    expect(matchJob(technician, post("Pharmacy Technician - Retail"))?.notes).toEqual([]);
  });

  it("keeps office and tech jobs on the tuned kinds of role", () => {
    const engineer = personFrom(
      { skills: ["Go"], titles: ["Backend Engineer"], years: 4 },
      null,
      OCCUPATIONS,
    );
    expect(kindOf(engineer, post("Senior iOS Engineer")).weight).toBe(1);
    expect(kindOf(engineer, post("Mechanical Engineer")).weight).toBe(0);
    expect(kindOf(engineer, post("Solutions Engineer")).weight).toBe(0);
  });

  it("keeps a job filed under another kind of role when its occupation is the person's own", () => {
    const engineer = personFrom(
      { skills: ["Go"], titles: ["Software Engineer"], years: 4 },
      null,
      OCCUPATIONS,
    );
    const filed = {
      ...post("Senior Software Engineer, Marketing Technology"),
      family: "marketing" as const,
    };
    expect(filed.occupation).toBe("15-1252.00");
    expect(kindOf(engineer, filed)).toEqual({ weight: 1, via: "same" });
    const designer = { ...post("Product Designer"), family: "design" as const };
    expect(kindOf(engineer, designer).weight).toBe(0);
  });
});
