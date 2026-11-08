import { describe, expect, it } from "vitest";
import type { TailorRequirement } from "@/lib/ai/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  findProof,
  MAX_REQUIREMENTS,
  mustProofBulletIds,
  normalizeRequirements,
  screenerCounts,
  screenerHeadline,
  screenerRows,
  withVerifiedQuotes,
  type RawRequirement,
} from "./requirements";

function raw(overrides: Partial<RawRequirement> = {}): RawRequirement {
  return { text: "Go", importance: "must", source: "structure", terms: ["Go"], quote: "", ask: "", ...overrides };
}

function requirement(overrides: Partial<TailorRequirement> = {}): TailorRequirement {
  return {
    id: "r1",
    text: "Go in production",
    importance: "must",
    source: "structure",
    terms: ["Go", "Golang"],
    quote: "",
    ask: "Have you used Go?",
    ...overrides,
  };
}

function makeResume(): Resume {
  return {
    ...emptyResume(0),
    basics: { name: "Sam Rivera", headline: "Backend engineer · Terraform", email: "", phone: "", location: "", links: [] },
    summary: "Backend engineer who likes boring, reliable systems.",
    experience: [
      {
        id: "job-1",
        company: "Kestrel Labs",
        title: "Senior Engineer",
        location: "",
        startDate: "2021",
        endDate: "Present",
        bullets: [
          { id: "b-oncall", text: "Ran the weekly on-call rotation for 6 services" },
          { id: "b-blank", text: "  " },
          { id: "b-go", text: "Rebuilt the billing service in Go, cutting p99 latency by 40%" },
        ],
      },
      {
        id: "job-2",
        company: "Mapline",
        title: "Engineer",
        location: "",
        startDate: "2018",
        endDate: "2021",
        bullets: [{ id: "b-newsletter", text: "Helped with the quarterly customer newsletter" }],
      },
    ],
    certifications: [{ id: "c1", name: "AWS Certified Developer", issuer: "Amazon", date: "2022" }],
    skills: [{ id: "s1", label: "Tools", items: ["Go", "Kubernetes", "PostgreSQL"] }],
  };
}

describe("normalizeRequirements", () => {
  it("never lets a guess be a must-have, and reads unknown sources as guesses", () => {
    const result = normalizeRequirements([
      raw({ text: "Kubernetes", terms: ["Kubernetes"], source: "guess" }),
      raw({ text: "Terraform", terms: ["Terraform"], source: "vibes" }),
      raw({ text: "Kafka", terms: ["Kafka"], source: "Wording", importance: "REQUIRED" }),
      raw({ text: "GraphQL", terms: ["GraphQL"], importance: "nice" }),
    ]);
    expect(result.map((item) => [item.text, item.importance, item.source])).toEqual([
      ["Kafka", "must", "wording"],
      ["Kubernetes", "nice", "guess"],
      ["Terraform", "nice", "guess"],
      ["GraphQL", "nice", "structure"],
    ]);
    expect(result.map((item) => item.id)).toEqual(["r1", "r2", "r3", "r4"]);
  });

  it("merges repeats by wording or by the same search names, keeping the stronger importance", () => {
    const result = normalizeRequirements([
      raw({ text: "Node.js", terms: ["Node.js"], importance: "nice" }),
      raw({ text: "NodeJS", terms: ["NodeJS"], importance: "must" }),
      raw({ text: "Kubernetes in production", terms: ["Kubernetes", "K8s"], importance: "nice" }),
      raw({ text: "Experience running K8s", terms: ["k8s"], importance: "must", source: "guess" }),
      raw({ text: "  - ", terms: [] }),
    ]);
    expect(result).toEqual([
      expect.objectContaining({ id: "r1", text: "Node.js", importance: "must", terms: ["Node.js"] }),
      expect.objectContaining({
        id: "r2",
        text: "Kubernetes in production",
        // The repeat was only a guess, so it can't raise the importance.
        importance: "nice",
        terms: ["Kubernetes"],
      }),
    ]);
  });

  it("caps the list with must-haves first and trims every field", () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      raw({ text: `Tool${i}`, terms: [`Tool${i}`], importance: i % 3 === 0 ? "must" : "nice" }),
    );
    const result = normalizeRequirements([
      raw({
        text: `• ${"Very long requirement ".repeat(20)}`,
        terms: ["Go", "a name that is far too long to be a search term", "Go ", "Rust", "Zig", "Odin", "C"],
        ask: "Tell me about it",
      }),
      ...many,
    ]);
    expect(result).toHaveLength(MAX_REQUIREMENTS);
    expect(result.slice(0, 11).every((item) => item.importance === "must")).toBe(true);
    const [first] = result;
    expect(first?.text.startsWith("Very long requirement")).toBe(true);
    expect(first?.text.length).toBeLessThanOrEqual(140);
    expect(first?.terms).toEqual(["Go", "Rust", "Zig", "Odin"]);
    expect(first?.ask).toBe("Have you used Go?");
  });

  it("keeps a quote only for a requirement without search names", () => {
    const [named, soft] = normalizeRequirements([
      raw({ text: "Go", terms: ["Go"], quote: "Rebuilt the billing service in Go" }),
      raw({ text: "Leads on-call", terms: [], quote: "  Ran the weekly   on-call rotation ", ask: "Have you been on call?" }),
    ]);
    expect(named?.quote).toBe("");
    expect(soft?.quote).toBe("Ran the weekly on-call rotation");
    expect(soft?.ask).toBe("Have you been on call?");
  });
});

describe("findProof", () => {
  const resume = makeResume();

  it("proves a named requirement with the work line that names it, and points at that line", () => {
    expect(findProof(resume, requirement())).toEqual({
      status: "proven",
      via: "term",
      line: {
        place: "Senior Engineer at Kestrel Labs, line 2",
        text: "Rebuilt the billing service in Go, cutting p99 latency by 40%",
        bulletId: "b-go",
      },
    });
  });

  it("counts a certification or a title as proof, but not the skills list or the headline", () => {
    const aws = findProof(resume, requirement({ text: "AWS certification", terms: ["AWS"] }));
    expect(aws).toMatchObject({ status: "proven", line: { place: "Certifications", bulletId: null } });

    const kubernetes = findProof(resume, requirement({ text: "Kubernetes", terms: ["Kubernetes", "K8s"] }));
    expect(kubernetes).toEqual({
      status: "listed",
      via: "term",
      line: { place: "Skills: Tools", text: "Go, Kubernetes, PostgreSQL", bulletId: null },
    });
    const terraform = findProof(resume, requirement({ text: "Terraform", terms: ["Terraform"] }));
    expect(terraform.status).toBe("listed");
    expect(terraform.line?.place).toBe("Headline");
  });

  it("marks a requirement the resume doesn't name as not shown", () => {
    expect(findProof(resume, requirement({ text: "Kafka", terms: ["Kafka"] }))).toEqual({
      status: "missing",
      line: null,
      via: null,
    });
  });

  it("proves a kind of experience only with a quote found word for word", () => {
    const soft = requirement({ text: "On-call for production", terms: [], quote: "ran the WEEKLY on-call rotation" });
    expect(findProof(resume, soft)).toMatchObject({
      status: "proven",
      via: "quote",
      line: { text: "Ran the weekly on-call rotation for 6 services", bulletId: "b-oncall" },
    });
    const pieces = requirement({ terms: [], quote: "Rebuilt the billing service … cutting p99 latency" });
    expect(findProof(resume, pieces).status).toBe("proven");

    const reworded = requirement({ terms: [], quote: "Owned the on-call rotation for 6 services" });
    const outOfOrder = requirement({ terms: [], quote: "cutting p99 latency … Rebuilt the billing service" });
    const tooShort = requirement({ terms: [], quote: "on-call" });
    for (const item of [reworded, outOfOrder, tooShort]) expect(findProof(resume, item).status).toBe("missing");
  });
});

describe("withVerifiedQuotes", () => {
  it("drops quotes the resume doesn't contain and keeps the real ones", () => {
    const real = requirement({ id: "r1", terms: [], quote: "Rebuilt the billing service in Go" });
    const fake = requirement({ id: "r2", terms: [], quote: "Mentored 4 junior engineers" });
    const skillsOnly = requirement({ id: "r3", terms: [], quote: "Go, Kubernetes, PostgreSQL" });
    expect(withVerifiedQuotes(makeResume(), [real, fake, skillsOnly]).map((item) => item.quote)).toEqual([
      "Rebuilt the billing service in Go",
      "",
      "",
    ]);
  });
});

describe("mustProofBulletIds", () => {
  it("finds every job line that proves a must-have", () => {
    const ids = mustProofBulletIds(makeResume(), [
      requirement(),
      requirement({ id: "r2", terms: [], quote: "weekly on-call rotation" }),
      requirement({ id: "r3", importance: "nice", terms: ["newsletter"] }),
    ]);
    expect([...ids].sort()).toEqual(["b-go", "b-oncall"]);
  });
});

describe("screenerRows and counts", () => {
  const requirements: TailorRequirement[] = [
    requirement({ id: "r1" }),
    requirement({ id: "r2", text: "Kubernetes", terms: ["Kubernetes"] }),
    requirement({ id: "r3", text: "Kafka", terms: ["Kafka"] }),
    requirement({ id: "r4", text: "Mentoring", terms: [], quote: "" }),
    requirement({ id: "r5", text: "PostgreSQL", importance: "nice", terms: ["PostgreSQL"] }),
    requirement({ id: "r6", text: "Writing", importance: "nice", terms: [], quote: "customer newsletter" }),
  ];

  it("gives each row its status and leaves a declined one missing for good", () => {
    const rows = screenerRows(makeResume(), requirements, { declined: new Set(["r3", "r1"]) });
    expect(rows.map((row) => [row.id, row.status])).toEqual([
      // A "no" doesn't override what the resume already proves.
      ["r1", "proven"],
      ["r2", "listed"],
      ["r3", "declined"],
      ["r4", "missing"],
      ["r5", "listed"],
      ["r6", "missing"],
    ]);
    const counts = screenerCounts(rows);
    expect(counts).toEqual({ must: { proven: 1, total: 4 }, nice: { proven: 0, total: 2 } });
    expect(screenerHeadline(counts)).toBe("Must-haves proven: 1 of 4 · Nice-to-haves: 0 of 2");
  });

  it("counts a line the person added for a kind of experience, but a named tool must be named", () => {
    const resume = makeResume();
    resume.experience[1]?.bullets.unshift(
      { id: "b-mentor", text: "Mentored two new hires through their first launch" },
      { id: "b-kafka", text: "Moved the order events onto a message queue" },
    );
    const linked = new Map([
      ["r4", "b-mentor"],
      ["r3", "b-kafka"],
    ]);
    const rows = screenerRows(resume, requirements, { linked });
    const r4 = rows.find((row) => row.id === "r4");
    expect(r4).toMatchObject({ status: "proven", proof: { via: "added", line: { bulletId: "b-mentor" } } });
    expect(rows.find((row) => row.id === "r3")?.status).toBe("missing");
  });

  it("leaves an empty group out of the headline", () => {
    expect(screenerHeadline({ must: { proven: 2, total: 3 }, nice: { proven: 0, total: 0 } })).toBe(
      "Must-haves proven: 2 of 3",
    );
    expect(screenerHeadline({ must: { proven: 0, total: 0 }, nice: { proven: 1, total: 2 } })).toBe(
      "Nice-to-haves: 1 of 2",
    );
  });
});
