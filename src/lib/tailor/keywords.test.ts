import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { findTerm, keywordCoverage, normalizeTerm } from "./keywords";

type Case = { text: string; term: string; found: boolean };

const cases = (found: boolean, rows: [text: string, term: string][]): Case[] =>
  rows.map(([text, term]) => ({ text, term, found }));

describe("findTerm", () => {
  describe.each([
    {
      group: "Node.js and other .js names",
      rows: [
        ...cases(true, [
          ["Built services in Node.js", "Node.js"],
          ["Built services in NodeJS", "Node.js"],
          ["Built services in node js", "Node.js"],
          ["Built services in Node and Express", "Node.js"],
          ["Built services in Node.js", "node"],
          ["Shipped a Next.js storefront", "NextJS"],
          ["Shipped a Next.js storefront", "next js"],
          ["Wrote Express.js APIs", "Express"],
          ["Used Vue.js for the admin", "Vue"],
          ["Built the UI in React", "React.js"],
        ]),
        ...cases(false, [
          ["Balanced load across a 12-node cluster", "Node.js"],
          ["Planned the next quarter roadmap", "Next.js"],
          ["Offered express delivery in 3 cities", "Express.js"],
        ]),
      ],
    },
    {
      group: "symbols: C++, C#, .NET",
      rows: [
        ...cases(true, [
          ["Rewrote the engine in C++", "C++"],
          ["Rewrote the engine in C++17", "C++"],
          ["Built Unity tools in C#", "C#"],
          ["Languages: C, C++, Python", "C"],
          ["Languages: C/C++", "C"],
          ["Migrated services to .NET 8", ".NET"],
          ["Built ASP.NET Core APIs", ".NET"],
          ["Built ASP.NET Core APIs", "ASP.NET"],
          ["Built ASP.NET Core APIs", "asp .net"],
          ["Ported tools to dotnet", ".NET"],
        ]),
        ...cases(false, [
          ["Rewrote the engine in C++", "C"],
          ["Built Unity tools in C#", "C"],
          ["Advised the C-suite on pricing", "C"],
          ["Shipped iOS apps in Objective-C", "C"],
          ["Contact: jane@att.net", ".NET"],
        ]),
      ],
    },
    {
      group: "slashes: CI/CD, A/B testing",
      rows: [
        ...cases(true, [
          ["Set up CI/CD with GitHub Actions", "CI/CD"],
          ["Set up CI CD with GitHub Actions", "CI/CD"],
          ["Set up a CICD pipeline", "CI/CD"],
          ["Set up a ci-cd pipeline", "CI/CD"],
          ["Set up CI/CD with GitHub Actions", "CI"],
          ["Ran A/B testing on pricing pages", "A/B testing"],
          ["Ran AB testing on pricing pages", "A/B testing"],
        ]),
        ...cases(false, [["Set up CI for 12 repos", "CI/CD"]]),
      ],
    },
    {
      group: "R: a single letter only counts on its own",
      rows: [
        ...cases(true, [
          ["Modeled churn in R and Python", "R"],
          ["Skills: Python, R, SQL", "R"],
          ["Statistics (R) and SQL", "R"],
        ]),
        ...cases(false, [
          ["Led R&D for a new sensor", "R"],
          ["Jane R. Doe", "R"],
          ["Moderated r/programming", "R"],
          ["Computed R-squared for 40 models", "R"],
          ["Reported to the CEO", "R"],
        ]),
      ],
    },
    {
      group: "Go: golang is the safe form, the verb never counts",
      rows: [
        ...cases(true, [
          ["Built CLIs in Go", "Go"],
          ["Built CLIs in Golang", "Go"],
          ["Built CLIs in Go", "Golang"],
          ["Languages: Python, Go, Rust", "Go"],
          ["Built CLIs in Go", "Go (Golang)"],
          ["Go-to-market lead for 3 launches", "go-to-market"],
        ]),
        ...cases(false, [
          ["Ready to go live in two weeks", "Go"],
          ["Owned the go-to-market plan", "Go"],
          ["Go-to-market lead for 3 launches", "Go"],
          ["Languages: python, go, rust", "Go"],
          ["Mapped GO terms for 200 genes", "Go"],
        ]),
      ],
    },
    {
      group: "Java vs JavaScript",
      rows: [
        ...cases(true, [
          ["Built Android apps in Java", "Java"],
          ["Built web apps in JavaScript", "JavaScript"],
          ["Built web apps in JS", "JavaScript"],
          ["Built web apps in Java Script", "JavaScript"],
          ["Used Java/JavaScript daily", "Java"],
        ]),
        ...cases(false, [
          ["Built web apps in JavaScript", "Java"],
          ["Built web apps in Java Script", "Java"],
          ["Built Android apps in Java", "JavaScript"],
        ]),
      ],
    },
    {
      group: "plurals",
      rows: cases(true, [
        ["Designed REST APIs", "API"],
        ["Designed a REST API", "APIs"],
        ["Split the monolith into microservices", "microservice"],
        ["Built a microservice for billing", "Microservices"],
        ["Wrote many libraries", "library"],
        ["Built dashboards for sales", "Dashboard"],
        ["Ran 40 VMs", "VM"],
        ["Used Redis as a cache", "Redis"],
      ]),
    },
    {
      group: "aliases",
      rows: [
        ...cases(true, [
          ["Ran Postgres in production", "PostgreSQL"],
          ["Tuned PostgreSQL queries", "Postgres"],
          ["Ran k8s clusters", "Kubernetes"],
          ["Ran Kubernetes clusters", "K8s"],
          ["Deployed to Amazon Web Services", "AWS"],
          ["Deployed to AWS Lambda", "Amazon Web Services"],
          ["Deployed to AWS Lambda", "AWS Lambda"],
          ["Deployed on Google Cloud Run", "GCP"],
          ["Deployed on GCP", "Google Cloud"],
          ["Deployed on Google Cloud Platform", "GCP"],
          ["Trained machine learning models", "ML"],
          ["Trained ML models", "Machine Learning"],
          ["Shipped artificial intelligence features", "AI"],
          ["Shipped AI features", "Artificial Intelligence"],
          ["Led UX research", "User Experience"],
          ["Led user experience research", "UX"],
          ["Migrated the codebase to TS", "TypeScript"],
          ["Wrote TypeScript", "TS"],
          ["Earned the AWS certification", "Amazon Web Services (AWS)"],
          ["Set up continuous integration", "Continuous Integration (CI)"],
          ["Set up CI for 12 repos", "Continuous Integration (CI)"],
          ["Built HTML5 games", "HTML"],
        ]),
        ...cases(false, [
          ["Deployed to AWS Lambda", "Web"],
          ["Prepared 500 ml of buffer", "ML"],
          ["Shipped JavaScript widgets", "TypeScript"],
        ]),
      ],
    },
    {
      group: "short words only count in capitals",
      rows: [
        ...cases(true, [
          ["Ran IT support for 40 staff", "IT"],
          ["Built desktop apps with Qt", "Qt"],
          ["Ran QA for 3 releases", "qa"],
        ]),
        ...cases(false, [
          ["Made it faster for everyone", "IT"],
          ["Shipped on time or early", "OR"],
          ["Wrote js snippets", "JavaScript"],
        ]),
      ],
    },
    {
      group: "spelling, spacing and punctuation",
      rows: cases(true, [
        ["Built front-end features", "Frontend"],
        ["Built frontend features", "front end"],
        ["Built Spring Boot services", "spring-boot"],
        ["Wrote Python scripts", "python"],
        ["Wrote it all in Python.", "Python"],
        ["Used Python", "Python,"],
        ["Used Python", "  Python  "],
        ["Designed café menus", "Cafe"],
        ["Led R&D for a new sensor", "R&D"],
        ["Read O'Reilly books", "O'Reilly"],
      ]),
    },
  ])("$group", ({ rows }) => {
    it.each(rows)('"$term" in "$text" -> $found', ({ text, term, found }) => {
      const result = findTerm(text, term);
      expect(result.found).toBe(found);
      expect(result.evidence === "").toBe(!found);
    });
  });

  it("echoes the term trimmed, with whitespace collapsed", () => {
    expect(findTerm("Used Node.js", "  Node.js  ").term).toBe("Node.js");
    expect(findTerm("Used machine learning", " machine\n learning ").term).toBe("machine learning");
  });

  it("never finds an empty or punctuation-only term", () => {
    for (const term of ["", "   ", "...", "()", "—"]) {
      expect(findTerm("Built APIs with Node.js", term)).toEqual({
        term: term.trim().replace(/\s+/g, " "),
        found: false,
        evidence: "",
      });
    }
  });

  it("finds nothing in empty text", () => {
    expect(findTerm("", "Python").found).toBe(false);
  });

  it("quotes the original text, not the normalized form", () => {
    const text = "Built REST APIs with Node.js and PostgreSQL for 2M users";
    expect(findTerm(text, "nodejs").evidence).toBe(text);
    expect(findTerm(text, "Postgres").evidence).toBe(text);
  });

  it("quotes about 60 characters around the first match, cut at word boundaries", () => {
    const line =
      "Partnered with design and sales to launch a self-serve onboarding flow on Kubernetes that cut setup time from two weeks to three days";
    const { evidence } = findTerm(line, "Kubernetes");
    expect(evidence.startsWith("…")).toBe(true);
    expect(evidence.endsWith("…")).toBe(true);
    expect(evidence).toContain("Kubernetes");
    const body = evidence.slice(1, -1);
    expect(body.length).toBeLessThanOrEqual(60);
    const at = line.indexOf(body);
    expect(at).toBeGreaterThan(0);
    expect(line.charAt(at - 1)).toBe(" ");
    expect(line.charAt(at + body.length)).toBe(" ");
  });

  it("keeps evidence inside the matching line", () => {
    const text = "Jane Doe\n\nSKILLS\nLanguages: TypeScript, Go\nTools: Docker, Terraform";
    expect(findTerm(text, "Go").evidence).toBe("Languages: TypeScript, Go");
    expect(findTerm(text, "Terraform").evidence).toBe("Tools: Docker, Terraform");
  });

  it("drops the bullet marker that resumeToText adds", () => {
    const text = "EXPERIENCE\n- Cut deploy time 40% with Kubernetes";
    expect(findTerm(text, "k8s").evidence).toBe("Cut deploy time 40% with Kubernetes");
  });

  it("uses the first match", () => {
    const text = "Wrote Go services\nTaught a Go workshop";
    expect(findTerm(text, "Golang").evidence).toBe("Wrote Go services");
  });
});

describe("normalizeTerm", () => {
  it.each([
    ["nodejs", ["Node.js", "NodeJS", "node js", "node", " Node.JS ", "Node.js's"]],
    ["typescript", ["TypeScript", "typescript", "TS", "TypeScript."]],
    ["ci cd", ["CI/CD", "ci cd", "CICD", "CI-CD"]],
    ["postgresql", ["PostgreSQL", "Postgres", "postgres."]],
    ["machine learning", ["  Machine   Learning  ", "ML", "machine-learning", "Machine Learning (ML)"]],
    ["kubernetes", ["Kubernetes,", "k8s", "K8s"]],
    ["amazon web service", ["AWS", "Amazon Web Services", "Amazon Web Services (AWS)"]],
    ["golang", ["Go", "golang", "Go (Golang)", "go lang"]],
    ["api", ["API", "APIs", "apis"]],
    ["microservice", ["microservice", "Microservices"]],
    ["c++", ["C++", "c++"]],
    ["c#", ["C#"]],
    [".net", [".NET", "dotnet"]],
    ["asp.net", ["ASP.NET", "ASP .NET", "asp.net"]],
    ["go to market", ["go-to-market", "Go to market"]],
  ])("%s", (expected, variants) => {
    for (const variant of variants) expect(normalizeTerm(variant)).toBe(expected);
  });

  it("returns an empty string when there are no words", () => {
    for (const term of ["", "   ", "...", "—", "()"]) expect(normalizeTerm(term)).toBe("");
  });

  it("keeps Java and JavaScript apart", () => {
    expect(normalizeTerm("Java")).not.toBe(normalizeTerm("JavaScript"));
    expect(normalizeTerm("JS")).toBe(normalizeTerm("JavaScript"));
  });
});

function resumeWith(overrides: Partial<Resume>): Resume {
  return { ...emptyResume(0), ...overrides };
}

const engineer = resumeWith({
  basics: { name: "Jane R. Doe", headline: "Backend engineer", email: "", phone: "", location: "", links: [] },
  summary: "Backend engineer who ships TypeScript services.",
  experience: [
    {
      id: "job-1",
      company: "Acme",
      title: "Engineer",
      location: "",
      startDate: "2021",
      endDate: "Present",
      bullets: [{ id: "b1", text: "Built GraphQL APIs on Node.js for 2M users" }],
    },
  ],
  skills: [{ id: "s1", label: "Languages", items: ["TypeScript", "Go"] }],
});

describe("keywordCoverage", () => {
  it("dedupes terms by normalized form and keeps the first spelling", () => {
    const coverage = keywordCoverage(engineer, [
      "TypeScript",
      "typescript",
      "TS",
      "Kubernetes",
      "Node.js",
      "NodeJS",
      "GraphQL",
      "Rust",
      "",
      "  ",
    ]);
    expect(coverage.matches.map((m) => [m.term, m.found])).toEqual([
      ["TypeScript", true],
      ["Kubernetes", false],
      ["Node.js", true],
      ["GraphQL", true],
      ["Rust", false],
    ]);
    expect(coverage).toMatchObject({ matched: 3, total: 5, percent: 60 });
  });

  it("treats spellings that match the same text as one term", () => {
    const coverage = keywordCoverage(engineer, ["front-end", "frontend", "front end"]);
    expect(coverage.total).toBe(1);
  });

  it("quotes resume text as evidence", () => {
    const [summary, bullet, skill] = keywordCoverage(engineer, ["TS", "GraphQL", "Golang"]).matches;
    expect(summary?.evidence).toBe("Backend engineer who ships TypeScript services.");
    expect(bullet?.evidence).toBe("Built GraphQL APIs on Node.js for 2M users");
    expect(skill?.evidence).toBe("Languages: TypeScript, Go");
  });

  it("doesn't mistake a middle initial for the R language", () => {
    expect(keywordCoverage(engineer, ["R"]).matches[0]?.found).toBe(false);
  });

  it("rounds the percent", () => {
    expect(keywordCoverage(engineer, ["TypeScript", "GraphQL", "Rust"]).percent).toBe(67);
    expect(keywordCoverage(engineer, ["Rust", "Elixir", "Zig", "TypeScript"]).percent).toBe(25);
  });

  it("returns 0% for no terms", () => {
    expect(keywordCoverage(engineer, [])).toEqual({ matches: [], matched: 0, total: 0, percent: 0 });
  });

  it("works on an empty resume", () => {
    expect(keywordCoverage(emptyResume(0), ["Python"])).toMatchObject({ matched: 0, total: 1 });
  });

  it("caps the number of terms it checks", () => {
    const terms = Array.from({ length: 150 }, (_, i) => `skill${i}`);
    expect(keywordCoverage(engineer, terms).total).toBe(100);
  });

  it("stays fast on a very large resume", () => {
    const bullets = Array.from({ length: 2_000 }, (_, i) => ({
      id: `b${i}`,
      text: `Shipped feature ${i} with React, Node.js and PostgreSQL for ${i * 10} users`,
    }));
    const big = resumeWith({
      experience: [
        { id: "j", company: "Acme", title: "Dev", location: "", startDate: "", endDate: "", bullets },
      ],
    });
    const terms = ["React", "Node.js", "PostgreSQL", "Kubernetes", "Rust", "Go", "AWS", "GraphQL"];
    const started = performance.now();
    const coverage = keywordCoverage(big, terms);
    expect(coverage.matched).toBe(3);
    // Generous bound: this is a smoke test for accidental quadratic behavior, not a benchmark.
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
