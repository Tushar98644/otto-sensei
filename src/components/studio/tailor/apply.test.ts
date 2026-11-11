import { describe, expect, it } from "vitest";
import type { TailorRequirement, TailorResult } from "@/lib/ai/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import {
  applyTailorChoices,
  confirmedSkills,
  defaultChoices,
  lineTargets,
  reorderPlans,
  screenerOptions,
  screenerResume,
  summarizeChoices,
  tailorMeta,
  type TailorChoices,
} from "./apply";

function resume(): Resume {
  return {
    ...emptyResume(0),
    summary: "",
    experience: [
      {
        id: "job",
        title: "Backend Engineer",
        company: "Stripe",
        location: "",
        startDate: "2020",
        endDate: "Present",
        bullets: [
          { id: "a", text: "Ran the on-call rotation." },
          { id: "b", text: "Built payment APIs in TypeScript." },
          { id: "c", text: "Moved services to Kubernetes." },
        ],
      },
    ],
    projects: [{ id: "proj", name: "Ledger", link: "", bullets: [{ id: "p1", text: "Wrote a toy ledger." }] }],
    skills: [{ id: "k", label: "", items: ["TypeScript", "SQL"] }],
  };
}

function requirement(id: string, overrides: Partial<TailorRequirement> = {}): TailorRequirement {
  return {
    id,
    text: "Terraform",
    importance: "must",
    source: "structure",
    terms: ["Terraform"],
    quote: "",
    ask: "Have you used Terraform?",
    ...overrides,
  };
}

function result(patch: Partial<TailorResult> = {}): TailorResult {
  return {
    job: { title: "Platform Engineer", company: "Shopify" },
    requirements: [
      requirement("r1"),
      requirement("r2", { text: "Mentoring", terms: [], ask: "Have you mentored anyone?" }),
      requirement("r3", { text: "Go", importance: "nice", terms: ["Go"] }),
    ],
    keywords: [
      { term: "TypeScript", importance: "must", inResume: true, evidence: "" },
      { term: "Terraform", importance: "must", inResume: false, evidence: "" },
    ],
    askUser: [{ term: "Terraform", question: "Have you used Terraform?" }],
    bulletOrder: [{ experienceId: "job", bulletIds: ["c", "b", "a"] }],
    summary: "Backend engineer who builds payment APIs.",
    notes: [],
    ...patch,
  };
}

const none: TailorChoices = { requirements: {}, reorder: {}, useSummary: false };

function withLines(): TailorChoices {
  return {
    ...none,
    requirements: {
      r1: { kind: "line", line: { id: "n1", parentId: "job", text: "Set up staging with Terraform" } },
      r2: { kind: "line", line: { id: "n2", parentId: "job", text: "Mentored two new hires" } },
      r3: { kind: "line", line: { id: "n3", parentId: "proj", text: "Rewrote the ledger in Go" } },
    },
  };
}

describe("reorderPlans", () => {
  it("lists the lines that move up, in their new order", () => {
    expect(reorderPlans(resume(), result())).toEqual([
      {
        experienceId: "job",
        label: "Backend Engineer at Stripe",
        bulletIds: ["c", "b", "a"],
        movedUp: [{ id: "c", text: "Moved services to Kubernetes." }],
      },
    ]);
  });

  it("skips orders that would drop, repeat or invent a line, and ones that change nothing", () => {
    const bad = result({
      bulletOrder: [
        { experienceId: "job", bulletIds: ["c", "b"] },
        { experienceId: "job", bulletIds: ["c", "c", "a"] },
        { experienceId: "missing", bulletIds: ["a"] },
      ],
    });
    expect(reorderPlans(resume(), bad)).toEqual([]);
    const same = result({ bulletOrder: [{ experienceId: "job", bulletIds: ["a", "b", "c"] }] });
    expect(reorderPlans(resume(), same)).toEqual([]);
  });
});

describe("applyTailorChoices", () => {
  it("changes nothing without the user's say-so, except the default reorder", () => {
    const next = applyTailorChoices(resume(), result(), none);
    expect(next.experience[0]?.bullets.map((bullet) => bullet.id)).toEqual(["c", "b", "a"]);
    expect(next.skills).toEqual(resume().skills);
    expect(next.summary).toBe("");
  });

  it("adds confirmed lines: must-haves at the top of their job, nice-to-haves at the end", () => {
    const next = applyTailorChoices(resume(), result(), withLines());
    expect(next.experience[0]?.bullets.map((bullet) => bullet.id)).toEqual(["n1", "n2", "c", "b", "a"]);
    expect(next.projects[0]?.bullets.map((bullet) => bullet.text)).toEqual([
      "Wrote a toy ledger.",
      "Rewrote the ledger in Go",
    ]);
    // A named tool the person confirmed joins their skills too; a kind of experience doesn't.
    expect(next.skills[0]?.items).toEqual(["TypeScript", "SQL", "Terraform", "Go"]);
  });

  it("adds nothing for a no, a blank line or a job that's gone", () => {
    const choices: TailorChoices = {
      ...none,
      requirements: {
        r1: { kind: "no" },
        r2: { kind: "line", line: { id: "n2", parentId: "job", text: "   " } },
        r3: { kind: "line", line: { id: "n3", parentId: "deleted-job", text: "Wrote Go" } },
      },
    };
    const next = applyTailorChoices(resume(), result(), choices);
    expect(next.experience[0]?.bullets).toHaveLength(3);
    expect(next.projects[0]?.bullets).toHaveLength(1);
    expect(confirmedSkills(result(), choices)).toEqual(["Go"]);
  });

  it("respects a reorder the user turned off and uses the summary when ticked", () => {
    const choices: TailorChoices = { ...none, reorder: { job: false }, useSummary: true };
    const next = applyTailorChoices(resume(), result(), choices);
    expect(next.experience[0]?.bullets.map((bullet) => bullet.id)).toEqual(["a", "b", "c"]);
    expect(next.summary).toBe("Backend engineer who builds payment APIs.");
  });

  it("never grows a skill group or a job past the schema limits", () => {
    const full = resume();
    full.skills = [{ id: "k", label: "", items: Array.from({ length: 100 }, (_, i) => `Skill ${i}`) }];
    full.experience[0]!.bullets = Array.from({ length: 40 }, (_, i) => ({ id: `x${i}`, text: `Line ${i}` }));
    const next = applyTailorChoices(full, result({ bulletOrder: [] }), withLines());
    expect(next.skills[0]?.items).toHaveLength(100);
    expect(next.experience[0]?.bullets).toHaveLength(40);
  });
});

describe("screenerResume and screenerOptions", () => {
  it("judges the copy with its new lines but without the suggested summary", () => {
    const choices: TailorChoices = { ...withLines(), useSummary: true };
    const judged = screenerResume(resume(), result(), choices);
    expect(judged.summary).toBe("");
    expect(judged.experience[0]?.bullets[0]?.id).toBe("n1");
  });

  it("turns choices into declined ids and linked lines", () => {
    const choices: TailorChoices = {
      ...none,
      requirements: {
        r1: { kind: "no" },
        r2: { kind: "line", line: { id: "n2", parentId: "job", text: "Mentored two new hires" } },
      },
    };
    const { declined, linked } = screenerOptions(choices);
    expect([...declined]).toEqual(["r1"]);
    expect([...linked]).toEqual([["r2", "n2"]]);
  });
});

describe("lineTargets", () => {
  it("offers every job, then every project", () => {
    expect(lineTargets(resume())).toEqual([
      { id: "job", section: "experience", label: "Backend Engineer at Stripe" },
      { id: "proj", section: "projects", label: "Project: Ledger" },
    ]);
  });
});

describe("defaultChoices", () => {
  it("offers the summary only when there is none yet", () => {
    expect(defaultChoices(resume(), result()).useSummary).toBe(true);
    expect(defaultChoices({ ...resume(), summary: "Mine." }, result()).useSummary).toBe(false);
    expect(defaultChoices(resume(), result({ summary: "  " })).useSummary).toBe(false);
  });
});

describe("tailorMeta", () => {
  it("prefers what the user typed, fills gaps from the post and keeps the letter", () => {
    expect(tailorMeta(result({ requirements: [] }), { title: "  ", company: "Acme" })).toEqual({
      jobTitle: "Platform Engineer",
      company: "Acme",
      keywords: ["TypeScript", "Terraform"],
    });
    expect(tailorMeta(result(), { title: "", company: "" }, "  Dear Shopify team,  ").coverLetter).toBe(
      "Dear Shopify team,",
    );
    expect(tailorMeta(result(), { title: "", company: "" }, "x".repeat(6_000)).coverLetter).toHaveLength(5_000);
  });

  it("saves the post, its link and the requirements on the copy", () => {
    const meta = tailorMeta(result(), {
      title: "",
      company: "",
      text: `  ${"We run payments on Go. ".repeat(10)} `,
      link: "boards.greenhouse.io/shopify/jobs/1",
      posting: null,
    });
    expect(meta.jobText).toBe("We run payments on Go. ".repeat(10).trim());
    expect(meta.jobUrl).toBe("https://boards.greenhouse.io/shopify/jobs/1");
    expect(meta.requirements).toEqual([
      { text: "Terraform", importance: "must", terms: ["Terraform"] },
      { text: "Mentoring", importance: "must", terms: [] },
      { text: "Go", importance: "nice", terms: ["Go"] },
    ]);
    // The address the post was read from beats the link as typed.
    expect(
      tailorMeta(result(), {
        title: "",
        company: "",
        link: "https://short.link/x",
        posting: { url: "https://jobs.lever.co/acme/1" },
      }).jobUrl,
    ).toBe("https://jobs.lever.co/acme/1");
  });

  it("leaves out a link that isn't one and a post that is blank", () => {
    const meta = tailorMeta(result(), { title: "", company: "", text: "   ", link: "not a link" });
    expect(meta).not.toHaveProperty("jobText");
    expect(meta).not.toHaveProperty("jobUrl");
  });

  it("caps what it saves so the copy still passes the resume schema", () => {
    const long = result({
      requirements: Array.from({ length: 50 }, (_, i) =>
        requirement(`r${i}`, { text: "y".repeat(400), terms: Array.from({ length: 12 }, () => "z".repeat(150)) }),
      ),
    });
    const meta = tailorMeta(long, { title: "", company: "", text: "x".repeat(25_000) });
    expect(meta.jobText).toHaveLength(20_000);
    expect(meta.requirements).toHaveLength(40);
    expect(meta.requirements?.[0]?.text).toHaveLength(300);
    expect(meta.requirements?.[0]?.terms).toHaveLength(8);
    expect(meta.requirements?.[0]?.terms[0]).toHaveLength(100);
    const copy = { ...resume(), source: "tailored" as const, tailor: { ...meta, baseResumeId: "base", createdAt: 0 } };
    expect(ResumeSchema.safeParse(copy).success).toBe(true);
  });

  it("keeps keywords inside the schema limits", () => {
    const many = result({
      keywords: Array.from({ length: 80 }, (_, i) => ({
        term: `${"x".repeat(150)}${i}`,
        importance: "nice" as const,
        inResume: false,
        evidence: "",
      })),
    });
    const { keywords } = tailorMeta(many, { title: "", company: "" });
    expect(keywords).toHaveLength(60);
    expect(keywords.every((term) => term.length <= 100)).toBe(true);
  });
});

describe("summarizeChoices", () => {
  it("counts what the copy will change", () => {
    const choices: TailorChoices = { ...withLines(), useSummary: true };
    expect(summarizeChoices(resume(), result(), choices)).toEqual({
      lines: 3,
      skills: 2,
      reorderedJobs: 1,
      summary: true,
    });
  });
});
