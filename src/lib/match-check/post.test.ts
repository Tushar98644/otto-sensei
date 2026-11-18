import { describe, expect, it } from "vitest";
import { MAX_TERMS, readPost, type Importance } from "./post";
import { ANALYST_POST, BACKEND_POST, MARKETING_POST, NURSE_POST } from "./test-fixtures";

function byImportance(text: string): Record<"must" | "nice" | "none", string[]> {
  const out = { must: [] as string[], nice: [] as string[], none: [] as string[] };
  for (const term of readPost(text).terms) out[term.importance ?? "none"].push(term.label);
  return out;
}

function importanceOf(text: string, label: string): Importance | undefined {
  return readPost(text).terms.find((term) => term.label === label)?.importance;
}

describe("readPost", () => {
  it("sorts a structured post's skills into must-haves, nice-to-haves and the rest, by its headings", () => {
    expect(byImportance(BACKEND_POST)).toEqual({
      must: ["Go", "PostgreSQL", "Rust", "Redis", "Docker", "Kubernetes", "English"],
      nice: ["Terraform", "Pulumi", "gRPC", "German"],
      none: ["Kafka"],
    });
  });

  it("skips the company intro and the benefits, which ask nothing of the candidate", () => {
    const labels = readPost(BACKEND_POST).terms.map((term) => term.label);
    expect(labels).not.toContain("Python");
    expect(labels).not.toContain("SaaS");
    expect(labels).not.toContain("B2B");
  });

  it("keeps a skill named under the duties without calling it a must-have", () => {
    const post = "What you'll do\n- Own our Kafka pipelines\nRequirements\n- Strong TypeScript";
    expect(importanceOf(post, "Kafka")).toBeNull();
    expect(importanceOf(post, "TypeScript")).toBe("must");
  });

  it("raises a skill to the strongest importance the post gives it", () => {
    const post =
      "What you'll do\n- Write Python every day\nNice to have\n- Python\nRequirements\n- Python in production";
    expect(importanceOf(post, "Python")).toBe("must");
  });

  it("reads licences and their long forms, and lets each clause's own words decide", () => {
    const terms = readPost(NURSE_POST).terms;
    expect(terms.map((term) => [term.label, term.importance])).toEqual([
      ["RN", "must"],
      ["BLS", "must"],
      ["ACLS", "nice"],
      ["Patient care", null],
      ["EHR", null],
    ]);
    expect(terms.find((term) => term.label === "BLS")?.terms).toEqual([
      "BLS",
      "basic life support",
    ]);
  });

  it("uses the wording when a post has no headings", () => {
    expect(byImportance(MARKETING_POST)).toEqual({
      must: ["Performance marketing", "Copywriting"],
      nice: ["SQL", "Spanish"],
      none: ["Google Ads", "Google Analytics"],
    });
  });

  it("splits a sentence that says both required and a plus", () => {
    const post = "Python is required, Kafka is a plus.";
    expect(importanceOf(post, "Python")).toBe("must");
    expect(importanceOf(post, "Kafka")).toBe("nice");
  });

  it("says when a post doesn't sort its skills at all", () => {
    const post = readPost(ANALYST_POST);
    expect(post.sorted).toBe(false);
    expect(post.terms.map((term) => term.label)).toEqual([
      "Tableau",
      "Power BI",
      "SQL",
      "Snowflake",
      "Python",
      "Pandas",
    ]);
  });

  it("doesn't read Excel out of 'Excel at explaining'", () => {
    expect(readPost(ANALYST_POST).terms.map((term) => term.label)).not.toContain("Excel");
    expect(readPost("Requirements\n- Advanced Excel").terms.map((term) => term.label)).toEqual([
      "Excel",
    ]);
  });

  it("treats a short line that names a skill as a requirement, not a heading", () => {
    const post = "Requirements\nExperience with AWS\nStrong SQL skills\n5+ years with Python";
    expect(byImportance(post).must).toEqual(["AWS", "SQL", "Python"]);
  });

  it("reads an 'About this role' intro as duties and 'Ideal candidate' as the requirements", () => {
    const post = [
      "About this role",
      "You'll build our data platform on Snowflake and dbt.",
      "Ideal candidate",
      "- 4+ years of SQL",
      "- Strong Python",
      "- Airflow is a plus",
    ].join("\n");
    expect(byImportance(post)).toEqual({
      must: ["SQL", "Python"],
      nice: ["Airflow"],
      none: ["Snowflake", "dbt"],
    });
    expect(
      byImportance(
        "About Acme\nWe build tools for teams.\nThe Ideal Candidate\n- React, TypeScript, GraphQL",
      ).must,
    ).toEqual(["React", "TypeScript", "GraphQL"]);
  });

  it("ends a company intro at a heading it doesn't know, so the rest of the post still counts", () => {
    const post = "About Acme\nWe make payroll simple.\nYou'll thrive here if\n- You know React";
    expect(byImportance(post)).toEqual({ must: [], nice: [], none: ["React"] });
  });

  it("doesn't take a list item that lost its bullet for a heading", () => {
    expect(
      byImportance(
        "Requirements\n- Python\nNice to have\nExperience in fintech\nKubernetes\nTerraform",
      ),
    ).toEqual({ must: ["Python"], nice: ["Kubernetes", "Terraform"], none: [] });
    expect(
      byImportance("Requirements\n- Python\nNice to have\nStrong communication skills\nGraphQL")
        .nice,
    ).toContain("GraphQL");
    const offer = [
      "Requirements",
      "- Python",
      "What we offer",
      "Competitive salary",
      "Annual bonus",
      "Learning budget for AWS certifications",
    ].join("\n");
    expect(byImportance(offer)).toEqual({ must: ["Python"], nice: [], none: [] });
  });

  it("reads headings marked by a colon, capitals or markdown, and whole heading phrases", () => {
    const post = [
      "## Key Responsibilities",
      "- Build services in Java",
      "KNOWLEDGE, SKILLS AND ABILITIES",
      "- Kafka",
      "**Preferred Qualifications**",
      "- Terraform",
      "Tech stack:",
      "- Docker",
      "Benefits & Perks",
      "- AWS learning budget",
    ].join("\n");
    expect(byImportance(post)).toEqual({
      must: ["Kafka"],
      nice: ["Terraform"],
      none: ["Java", "Docker"],
    });
  });

  it("reads inline labels for that line only", () => {
    const post = [
      "Requirements",
      "- Strong TypeScript",
      "- Nice to have: Kafka",
      "- React",
      "Salary: Python developers earn more here",
      "Tech stack: Vue and Go",
    ].join("\n");
    expect(byImportance(post)).toEqual({
      must: ["TypeScript", "React", "Vue", "Go"],
      nice: ["Kafka"],
      none: [],
    });
  });

  it("counts a spoken language only when the post asks about speaking it", () => {
    expect(readPost("Requirements\n- Experience in the German market").terms).toEqual([]);
    expect(importanceOf("Requirements\n- Fluent German and English", "German")).toBe("must");
    expect(importanceOf("Nice to have\n- Knowledge of Japanese is a plus", "Japanese")).toBe(
      "nice",
    );
  });

  it("keeps the post's own spelling when it differs from the skill's name", () => {
    const term = readPost("Requirements\n- Tailwind").terms[0];
    expect(term?.label).toBe("Tailwind CSS");
    expect(term?.terms).toEqual(["Tailwind CSS", "Tailwind"]);
  });

  it("doesn't split a sentence at e.g.", () => {
    const post = "Requirements\n- A systems language, e.g. Go or Rust";
    expect(byImportance(post).must).toEqual(["Go", "Rust"]);
  });

  it("notes the years and degrees a post asks for, which the word check can't judge", () => {
    expect(readPost(NURSE_POST).asks).toEqual([
      "2+ years of acute care experience",
      "Bachelor of Science in Nursing (BSN) preferred",
    ]);
    expect(readPost(MARKETING_POST).asks).toEqual(["Must have 4+ years in performance marketing."]);
    expect(
      readPost("About us\nWe've been around for 10 years and our founders have PhDs.").asks,
    ).toEqual([]);
  });

  it(`keeps at most ${MAX_TERMS} skills, must-haves first`, () => {
    const many = [
      "Python",
      "Java",
      "JavaScript",
      "TypeScript",
      "PHP",
      "Kotlin",
      "Scala",
      "C++",
      "C#",
      "Erlang",
      "Haskell",
      "Clojure",
      "OCaml",
      "MATLAB",
      "SQL",
      "Solidity",
      "PowerShell",
      "Angular",
      "Svelte",
      "Redux",
      "Webpack",
      "HTML",
      "CSS",
      "Storybook",
      "Playwright",
      "Selenium",
      "WebGL",
      "Django",
      "FastAPI",
      "Laravel",
      "GraphQL",
      "gRPC",
      "Kafka",
      "Redis",
      "PostgreSQL",
      "MySQL",
      "SQLite",
      "MongoDB",
      "DynamoDB",
      "ClickHouse",
      "BigQuery",
      "Redshift",
    ];
    const post = `What you'll do\n- ${many.join(", ")}\nRequirements\n- Terraform`;
    const terms = readPost(post).terms;
    expect(terms).toHaveLength(MAX_TERMS);
    expect(terms[0]).toEqual({ label: "Terraform", terms: ["Terraform"], importance: "must" });
  });

  it("finds nothing in a post with no skills it knows", () => {
    expect(readPost("")).toEqual({ terms: [], asks: [], sorted: false });
    expect(readPost("We want a kind, curious person who loves people.").terms).toEqual([]);
  });
});
