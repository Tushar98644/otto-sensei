import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import { resetEnvForTests } from "@/lib/env";
import { resumeToText } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { findTerm, normalizeTerm } from "@/lib/tailor/keywords";
import type { StructuredRequest } from "./client";
import { tailorResume, withoutAliases } from "./tailor";
import { AIError, type TailorInput, type TailorResult } from "./types";

const runStructured = vi.hoisted(() =>
  vi.fn<(request: StructuredRequest<unknown>) => Promise<unknown>>(),
);
vi.mock("./client", () => ({ runStructured }));

const ONCALL = "bullet-oncall";
const KAFKA = "bullet-kafka";
const BLANK = "bullet-blank";
const K8S = "bullet-k8s";

function makeResume(withBlank = true): Resume {
  const bullets = [
    { id: ONCALL, text: "Ran the weekly on-call rotation" },
    { id: KAFKA, text: "Built Kafka pipelines in Python for 2 million daily events" },
    ...(withBlank ? [{ id: BLANK, text: "" }] : []),
    { id: K8S, text: "Moved services to Kubernetes and cut deploy time by 40%" },
  ];
  return {
    ...emptyResume(0),
    basics: {
      name: "Jane Doe",
      headline: "Backend Engineer",
      email: "jane@example.com",
      phone: "",
      location: "Berlin",
      links: [],
    },
    summary: "Backend engineer with 6 years in payments.",
    experience: [
      {
        id: "job-1",
        company: "Acme Payments",
        title: "Senior Engineer",
        location: "",
        startDate: "2021",
        endDate: "Present",
        bullets,
      },
      {
        id: "job-2",
        company: "Shopfront",
        title: "Engineer",
        location: "",
        startDate: "2018",
        endDate: "2021",
        bullets: [{ id: "bullet-orders", text: "Maintained the PostgreSQL schema for orders" }],
      },
    ],
    skills: [{ id: "skills", label: "", items: ["Python", "Kafka", "Kubernetes", "PostgreSQL"] }],
  };
}

const JOB_POST = `Senior Backend Engineer at Lumen Pay

About the role
You will build the systems that move money for millions of people.

Requirements
- 5+ years of backend experience with Python or Go
- Production experience with Kafka and Kubernetes
- Strong SQL and PostgreSQL skills
- Experience with Terraform and AWS

Nice to have
- Experience with GraphQL
- Payment systems background

Benefits
- Remote-friendly team and a learning budget`;

function job(overrides: Partial<TailorInput> = {}): TailorInput {
  return { jobText: JOB_POST, jobTitle: "", company: "", ...overrides };
}

type RawRequirement = {
  text: string;
  importance: string;
  source: string;
  terms: string[];
  quote: string;
  ask: string;
};

type Output = {
  jobTitle: string;
  company: string;
  requirements: RawRequirement[];
  bulletOrder: { experienceId: string; bulletIds: string[] }[];
  summary: string;
  notes: string[];
};

function named(term: string, importance: string, source = "structure"): RawRequirement {
  return { text: term, importance, source, terms: [term], quote: "", ask: `Have you used ${term}?` };
}

function output(overrides: Partial<Output> = {}): Output {
  return {
    jobTitle: "Senior Backend Engineer",
    company: "Lumen Pay",
    requirements: [
      named("Python", "must"),
      named("Kafka", "must"),
      named("Terraform", "must"),
      named("GraphQL", "nice"),
    ],
    bulletOrder: [],
    summary: "",
    notes: [],
    ...overrides,
  };
}

function useKey(key: string | null) {
  if (key) process.env.OPENROUTER_API_KEY = key;
  else delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
}

function expectValid(result: TailorResult, resume: Resume) {
  const text = resumeToText(resume);
  expect(result.keywords.length).toBeLessThanOrEqual(25);
  const keys = result.keywords.map((keyword) => normalizeTerm(keyword.term).replace(/ /g, ""));
  expect(new Set(keys).size).toBe(keys.length);
  for (const keyword of result.keywords) {
    expect(["must", "nice"]).toContain(keyword.importance);
    const match = findTerm(text, keyword.term);
    expect(keyword.inResume).toBe(match.found);
    expect(keyword.evidence).toBe(match.evidence);
  }
  expect(result.askUser.length).toBeLessThanOrEqual(8);
  const missing = result.keywords.filter((keyword) => !keyword.inResume).map((keyword) => keyword.term);
  expect(result.askUser.map((question) => question.term)).toEqual(missing.slice(0, 8));
  for (const order of result.bulletOrder) {
    const current = resume.experience.find((entry) => entry.id === order.experienceId)?.bullets.map((b) => b.id);
    expect([...order.bulletIds].sort()).toEqual([...(current ?? [])].sort());
    expect(order.bulletIds).not.toEqual(current);
  }
  expect(result.summary.length).toBeLessThanOrEqual(600);
  expect(result.notes.length).toBeLessThanOrEqual(3);
  for (const note of result.notes) expect(note.length).toBeLessThanOrEqual(200);
}

afterEach(() => {
  useKey(null);
});

describe("tailorResume in demo mode", () => {
  beforeEach(() => {
    useKey(null);
    runStructured.mockReset();
  });

  it("finds the post's skills, ranks requirements as must-haves and asks about the missing ones", async () => {
    const resume = makeResume();
    const result = await tailorResume(resume, job());
    expectValid(result, resume);
    expect(runStructured).not.toHaveBeenCalled();

    const byTerm = new Map(result.keywords.map((keyword) => [keyword.term, keyword]));
    for (const term of ["Python", "Kafka", "Kubernetes", "PostgreSQL", "SQL", "Terraform", "AWS"]) {
      expect(byTerm.get(term)?.importance).toBe("must");
    }
    expect(byTerm.get("GraphQL")?.importance).toBe("nice");
    expect(byTerm.get("Kafka")?.inResume).toBe(true);
    expect(byTerm.get("Terraform")?.inResume).toBe(false);
    expect(result.askUser.map((question) => question.term)).toEqual(
      expect.arrayContaining(["Terraform", "AWS", "GraphQL"]),
    );
    expect(result.askUser.at(-1)?.term).toBe("GraphQL");
    expect(result.askUser[0]?.question).toMatch(/^Have you used .+ at work, in a project, or in a course\?$/);
  });

  it("orders bullets by keyword overlap and sinks blank ones", async () => {
    const resume = makeResume();
    const result = await tailorResume(resume, job());
    expect(result.bulletOrder).toEqual([{ experienceId: "job-1", bulletIds: [KAFKA, K8S, ONCALL, BLANK] }]);
    expect(result.summary).toBe("");
    expect(result.notes.length).toBeGreaterThanOrEqual(1);
    expect(result.notes.length).toBeLessThanOrEqual(2);
  });

  it("doesn't read everyday words as skills", async () => {
    const resume = makeResume();
    const post = "You will excel at helping teams go faster. We want a swift, lean hiring process.\n".repeat(3);
    const result = await tailorResume(resume, job({ jobText: post }));
    expectValid(result, resume);
    const terms = result.keywords.map((keyword) => keyword.term);
    for (const term of ["Excel", "Golang", "Swift", "Lean"]) expect(terms).not.toContain(term);
  });

  it("is deterministic", async () => {
    const resume = makeResume();
    expect(await tailorResume(resume, job())).toEqual(await tailorResume(resume, job()));
  });
});

describe("tailorResume with the AI", () => {
  beforeEach(() => {
    useKey("test-key");
    runStructured.mockReset();
  });

  it("sends the resume, short-alias bullets and the job post as data, with low effort", async () => {
    runStructured.mockResolvedValueOnce(output());
    await tailorResume(makeResume(), job({ jobTitle: "Backend Engineer", company: "Lumen" }));
    const sent = runStructured.mock.calls[0]?.[0];
    expect(sent).toMatchObject({ task: "tailor", effort: "low" });
    const shown = resumeToText(makeResume())
      .replace("Jane Doe", "[NAME]")
      .replace("jane@example.com", "[EMAIL_1]");
    expect(sent?.user).toContain(`<resume>\n${shown}\n</resume>`);
    const experience = JSON.stringify([
      {
        id: "e1",
        role: "Senior Engineer at Acme Payments",
        bullets: [
          { id: "b1", text: "Ran the weekly on-call rotation" },
          { id: "b2", text: "Built Kafka pipelines in Python for 2 million daily events" },
          { id: "b3", text: "Moved services to Kubernetes and cut deploy time by 40%" },
        ],
      },
    ]);
    expect(sent?.user).toContain(`<experience>\n${experience}\n</experience>`);
    expect(sent?.user).toContain(`<job_post>\nJob title: Backend Engineer\nCompany: Lumen\n${JOB_POST}\n</job_post>`);
  });

  it("maps aliases back to real ids, keeps blank bullets last and drops invalid orders", async () => {
    runStructured.mockResolvedValueOnce(
      output({
        bulletOrder: [
          { experienceId: "e9", bulletIds: ["b1", "b2", "b3"] },
          { experienceId: "e1", bulletIds: ["b2", "b2", "b1"] },
          { experienceId: "e1", bulletIds: ["b2", "b1"] },
          { experienceId: "e1", bulletIds: ["b2", "b7", "b1"] },
          { experienceId: "e2", bulletIds: ["b1"] },
          { experienceId: "e1", bulletIds: ["b2", "b3", "b1"] },
          { experienceId: "e1", bulletIds: ["b3", "b2", "b1"] },
        ],
      }),
    );
    const resume = makeResume();
    const result = await tailorResume(resume, job());
    expectValid(result, resume);
    expect(result.bulletOrder).toEqual([{ experienceId: "job-1", bulletIds: [KAFKA, K8S, ONCALL, BLANK] }]);
  });

  it("drops an order that changes nothing", async () => {
    runStructured.mockResolvedValueOnce(
      output({
        requirements: [named("GraphQL", "must")],
        bulletOrder: [{ experienceId: "e1", bulletIds: ["b1", "b2", "b3"] }],
      }),
    );
    const resume = makeResume(false);
    expect((await tailorResume(resume, job())).bulletOrder).toEqual([]);
  });

  it("puts the lines that prove a must-have at the top of their job", async () => {
    runStructured.mockResolvedValueOnce(
      output({
        requirements: [named("Kubernetes", "must"), named("Kafka", "nice")],
        bulletOrder: [{ experienceId: "e1", bulletIds: ["b1", "b2", "b3"] }],
      }),
    );
    const resume = makeResume(false);
    expect((await tailorResume(resume, job())).bulletOrder).toEqual([
      { experienceId: "job-1", bulletIds: [K8S, ONCALL, KAFKA] },
    ]);
  });

  it("returns the post's requirements, cleaned, with fake quotes dropped", async () => {
    runStructured.mockResolvedValueOnce(
      output({
        requirements: [
          named("Kafka", "must", "wording"),
          { text: "Runs on-call for production", importance: "must", source: "structure", terms: [], quote: "Ran the weekly on-call rotation", ask: "Have you been on call?" },
          { text: "Mentoring junior engineers", importance: "must", source: "guess", terms: [], quote: "Mentored 4 junior engineers", ask: "" },
        ],
      }),
    );
    const result = await tailorResume(makeResume(), job());
    expect(result.requirements).toEqual([
      { id: "r1", text: "Kafka", importance: "must", source: "wording", terms: ["Kafka"], quote: "", ask: "Have you used Kafka?" },
      {
        id: "r2",
        text: "Runs on-call for production",
        importance: "must",
        source: "structure",
        terms: [],
        quote: "Ran the weekly on-call rotation",
        ask: "Have you been on call?",
      },
      {
        id: "r3",
        text: "Mentoring junior engineers",
        importance: "nice",
        source: "guess",
        terms: [],
        quote: "",
        ask: "Do you have experience with mentoring junior engineers?",
      },
    ]);
  });

  it("recomputes matches from the resume and asks about must-haves first", async () => {
    runStructured.mockResolvedValueOnce(
      output({
        requirements: [
          named("GraphQL", "nice"),
          named("Kafka", "MUST"),
          named("Terraform", "must"),
          named("AWS", "required"),
          named("Rust", "bonus"),
        ],
      }),
    );
    const resume = makeResume();
    const result = await tailorResume(resume, job());
    expectValid(result, resume);
    expect(result.keywords.map((keyword) => [keyword.term, keyword.importance, keyword.inResume])).toEqual([
      ["Kafka", "must", true],
      ["Terraform", "must", false],
      ["AWS", "must", false],
      ["GraphQL", "nice", false],
      ["Rust", "nice", false],
    ]);
    expect(result.keywords[0]?.evidence).toContain("Kafka");
    expect(result.askUser).toEqual([
      { term: "Terraform", question: "Have you used Terraform at work, in a project, or in a course?" },
      { term: "AWS", question: "Have you used AWS at work, in a project, or in a course?" },
      { term: "GraphQL", question: "Have you used GraphQL at work, in a project, or in a course?" },
      { term: "Rust", question: "Have you used Rust at work, in a project, or in a course?" },
    ]);
  });

  it("keeps one keyword per spelling, from every requirement's terms, must-haves first", async () => {
    const extra = Array.from({ length: 12 }, (_, i) =>
      named(`Tool${i}`, i % 2 === 0 ? "nice" : "must"),
    );
    runStructured.mockResolvedValueOnce(
      output({
        requirements: [
          { ...named("Node.js", "must"), terms: ["Node.js", "NodeJS", "node js"] },
          { ...named("Kubernetes in production", "must"), terms: ["Kubernetes", "K8s", "  "] },
          ...extra,
        ],
      }),
    );
    const resume = makeResume();
    const result = await tailorResume(resume, job());
    expectValid(result, resume);
    const terms = result.keywords.map((keyword) => keyword.term);
    expect(terms.filter((term) => term.toLowerCase().startsWith("node"))).toEqual(["Node.js"]);
    expect(terms.filter((term) => /^(?:kubernetes|k8s)$/i.test(term))).toEqual(["Kubernetes"]);
    expect(result.keywords.slice(0, 8).every((keyword) => keyword.importance === "must")).toBe(true);
    expect(result.keywords).toHaveLength(14);
    const importance = new Map(result.keywords.map((keyword) => [keyword.term, keyword.importance]));
    expect(result.askUser).toHaveLength(8);
    expect(result.askUser.map((question) => importance.get(question.term))).toEqual([
      ...Array<string>(7).fill("must"),
      "nice",
    ]);
  });

  it("takes the job title and company from the input when given, else from the post", async () => {
    runStructured.mockResolvedValueOnce(output());
    expect((await tailorResume(makeResume(), job())).job).toEqual({
      title: "Senior Backend Engineer",
      company: "Lumen Pay",
    });
    runStructured.mockResolvedValueOnce(output());
    expect((await tailorResume(makeResume(), job({ jobTitle: " Staff Engineer ", company: "Lumen" }))).job).toEqual({
      title: "Staff Engineer",
      company: "Lumen",
    });
  });

  it("keeps a summary built from resume facts, clipped to 600 characters", async () => {
    const summary = `Backend engineer with 6 years in payments. ${"Ships reliable systems. ".repeat(40)}`;
    runStructured.mockResolvedValueOnce(output({ summary }));
    const result = await tailorResume(makeResume(), job());
    expect(result.summary.startsWith("Backend engineer with 6 years in payments.")).toBe(true);
    expect(result.summary.length).toBeLessThanOrEqual(600);
  });

  it("drops a summary with a number the resume doesn't contain, or with placeholders", async () => {
    runStructured.mockResolvedValueOnce(output({ summary: "Backend engineer with 8 years in payments." }));
    expect((await tailorResume(makeResume(), job())).summary).toBe("");
    runStructured.mockResolvedValueOnce(output({ summary: "Backend engineer with [X] years in payments." }));
    expect((await tailorResume(makeResume(), job())).summary).toBe("");
  });

  it("keeps at most 3 short tips and drops ones with made-up numbers", async () => {
    runStructured.mockResolvedValueOnce(
      output({
        notes: [
          "Lead with your Kafka work.",
          "Say you have 9 years of Kafka.",
          " ",
          "The post asks for 5+ years: show yours.",
          `Mention Terraform only if you've used it. ${"Really. ".repeat(40)}`,
          "A fourth tip that should be cut.",
        ],
      }),
    );
    const result = await tailorResume(makeResume(), job());
    expect(result.notes).toHaveLength(3);
    expect(result.notes[0]).toBe("Lead with your Kafka work.");
    expect(result.notes[1]).toBe("The post asks for 5+ years: show yours.");
    expect(result.notes.every((note) => note.length <= 200)).toBe(true);
    expect(result.notes.join(" ")).not.toContain("9 years");
  });

  it("passes AI errors through", async () => {
    runStructured.mockRejectedValueOnce(new AIError("rate_limited", "Slow down"));
    await expect(tailorResume(makeResume(), job())).rejects.toMatchObject({ code: "rate_limited" });
  });
});

describe("tailorResume input limits", () => {
  beforeEach(() => {
    useKey("test-key");
    runStructured.mockReset();
  });

  it("rejects a job post over the limit before calling the AI", async () => {
    const jobText = "a".repeat(TEXT_LIMITS.jobPostChars + 1);
    await expect(tailorResume(makeResume(), job({ jobText }))).rejects.toMatchObject({ code: "too_long" });
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("rejects a resume far over the import limit", async () => {
    const resume = makeResume();
    resume.summary = "word ".repeat(TEXT_LIMITS.resumeChars);
    await expect(tailorResume(resume, job())).rejects.toMatchObject({ code: "too_long" });
    expect(runStructured).not.toHaveBeenCalled();
  });

  it("returns an empty result for a blank job post without calling the AI", async () => {
    const result = await tailorResume(makeResume(), job({ jobText: "   " }));
    expect(result).toEqual({
      job: { title: "", company: "" },
      requirements: [],
      keywords: [],
      askUser: [],
      bulletOrder: [],
      summary: "",
      notes: [],
    });
    expect(runStructured).not.toHaveBeenCalled();
  });
});


describe("withoutAliases", () => {
  const refs = [
    {
      alias: "e1",
      id: "job-1",
      label: "Marketing Manager at Brightloop",
      bullets: [
        { alias: "b1", id: "x1", text: "Led the launch of an analytics add-on that reached 1,200 teams" },
        { alias: "b2", id: "x2", text: "Responsible for sales enablement materials" },
      ],
      blankIds: [],
    },
  ];

  it("swaps bullet and entry ids for the words people can see", () => {
    const note = withoutAliases("Your b2 bullet is vague. Lead e1 with b1.", refs);
    expect(note).toBe(
      'Your line "Responsible for sales enablement materials" is vague. Lead "Marketing Manager at Brightloop" with line "Led the launch of an analytics…".',
    );
  });

  it("leaves unknown ids and ordinary words alone", () => {
    expect(withoutAliases("Add a b9 and keep the web3 work.", refs)).toBe("Add a b9 and keep the web3 work.");
  });
});
