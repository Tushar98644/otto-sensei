import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import type { InterviewPrep, TechnicalQuestion } from "@/lib/insights/prep";
import { dryRun, estimateCase, gradeOutput } from "../../../scripts/evals/harness";
import { interviewSuite } from "../../../scripts/evals/suites/interview";
import { INTERVIEW_CASES, type InterviewCase } from "../../../scripts/evals/suites/interview/cases";
import * as check from "../../../scripts/evals/suites/interview/graders";

const byId = (id: string): InterviewCase => {
  const kase = INTERVIEW_CASES.find((item) => item.id === id);
  if (!kase?.golden) throw new Error(`no golden for ${id}`);
  return kase;
};

function withTechnical(
  kase: InterviewCase,
  change: (items: TechnicalQuestion[]) => TechnicalQuestion[],
): InterviewPrep {
  const golden = kase.golden!;
  return {
    ...golden,
    technical: { ...golden.technical!, questions: change([...golden.technical!.questions]) },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("interview eval in demo mode", () => {
  it("has the five personas, each with a demo pack as its golden", () => {
    expect(INTERVIEW_CASES.map((kase) => kase.id)).toEqual([
      "ai-engineer-mid",
      "backend-senior",
      "frontend-junior",
      "data-scientist-mid",
      "pm-senior",
    ]);
    for (const kase of INTERVIEW_CASES) expect(kase.golden?.demo).toBe(true);
  });

  it.each(INTERVIEW_CASES.map((kase) => [kase.id, kase] as const))(
    "%s passes every deterministic check",
    (_id, kase) => {
      const grades = gradeOutput(interviewSuite, kase.golden, kase);
      expect(grades.length).toBeGreaterThan(10);
      expect(grades.filter((grade) => !grade.pass)).toEqual([]);
    },
  );

  it("passes the dry run and prices two calls per case", () => {
    const [suite] = dryRun([interviewSuite]);
    expect(suite?.problems).toEqual([]);
    const estimate = estimateCase(interviewSuite, INTERVIEW_CASES[0]!);
    expect(estimate.calls).toBe(2);
    expect(estimate.outputTokens).toBeGreaterThan(20_000);
  });

  it("refuses to grade the demo pack as a real run", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    resetEnvForTests();
    await expect(interviewSuite.run(INTERVIEW_CASES[0]!, "lab/any-model")).rejects.toThrow(
      /demo pack/,
    );
  });
});

describe("interview graders catch what a weak pack gets wrong", () => {
  it("flags the wrong focus or level", () => {
    const kase = byId("backend-senior");
    const golden = kase.golden!;
    const wrong = {
      ...golden,
      technical: { ...golden.technical!, focus: "frontend" as const, level: "junior" as const },
    };
    expect(check.focusAndLevel(wrong, kase).pass).toBe(false);
  });

  it("flags a count outside 8 to 12, a second design question and a design with no stated scale", () => {
    const kase = byId("backend-senior");
    expect(check.technicalCount(withTechnical(kase, (items) => items.slice(0, 5))).pass).toBe(
      false,
    );
    const design = kase.golden!.technical!.questions.find((item) => item.kind === "design")!;
    expect(check.oneDesign(withTechnical(kase, (items) => [...items, design])).pass).toBe(false);
    const noScale = withTechnical(kase, (items) =>
      items.map((item) => (item.kind === "design" ? { ...item, assume: "" } : item)),
    );
    expect(check.questionShape(noScale).pass).toBe(false);
  });

  it("flags coding warm-ups the post never asked for", () => {
    const kase = byId("backend-senior");
    const coding: TechnicalQuestion = { ...kase.golden!.technical!.questions[3]!, kind: "coding" };
    expect(
      check.codingWhenSignalled(
        withTechnical(kase, (items) => [...items, coding]),
        kase,
      ).pass,
    ).toBe(false);
  });

  it("flags a deep-dive that cites no real resume line", () => {
    const kase = byId("frontend-junior");
    const fake = withTechnical(kase, (items) =>
      items.map((item) =>
        item.kind === "deep-dive"
          ? { ...item, resume: { line: "Led the migration to Svelte", place: "" } }
          : item,
      ),
    );
    expect(check.deepDiveGrounding(fake, kase).pass).toBe(false);
  });

  it("flags an invented employer, tool or number about the person, but not general know-how", () => {
    const kase = byId("ai-engineer-mid");
    const invent = (text: string) =>
      withTechnical(kase, (items) =>
        items.map((item, index) => (index === 0 ? { ...item, question: text } : item)),
      );
    expect(
      check.noInventedPersonFacts(
        invent("You led the Pinecone migration at Globex. How did it go?"),
        kase,
      ).pass,
    ).toBe(false);
    expect(
      check.noInventedPersonFacts(invent("You cut latency by 85% with pgvector. How?"), kase).pass,
    ).toBe(false);
    const knowledge = withTechnical(kase, (items) =>
      items.map((item, index) =>
        index === 4
          ? {
              ...item,
              covers: [
                ...item.covers.slice(0, 3),
                "Compare HNSW and IVF indexes in Qdrant at 10M vectors",
              ],
            }
          : item,
      ),
    );
    expect(check.noInventedPersonFacts(knowledge, kase).pass).toBe(true);
  });

  it("flags a junior pack pitched at staff topics, and a senior one that never leaves the basics", () => {
    const junior = byId("frontend-junior");
    const staffy: TechnicalQuestion = {
      ...junior.golden!.technical!.questions[3]!,
      topic: "Micro-frontend architecture",
      question: "How would you split our app into micro-frontends inside one monorepo?",
      covers: [
        "Micro-frontend boundaries by team",
        "Monorepo tooling and ownership",
        "Migration plans for each app",
      ],
    };
    expect(
      check.seniorityFit(
        withTechnical(junior, (items) => [...items, staffy, staffy]),
        junior,
      ).pass,
    ).toBe(false);

    const senior = byId("backend-senior");
    const basic = withTechnical(senior, (items) =>
      items.map((item) =>
        item.kind === "concept"
          ? {
              ...item,
              topic: "Caching",
              question: "What is a cache?",
              covers: ["A cache stores data", "TTL", "Invalidation"],
            }
          : item,
      ),
    );
    expect(check.seniorityFit(basic, senior).pass).toBe(false);
  });

  it("flags a technical pack that keeps a skills round or skips the behavioural one", () => {
    const kase = byId("pm-senior");
    const golden = kase.golden!;
    const skills = {
      ...golden,
      questions: [...golden.questions, { ...golden.questions[1]!, round: "skills" as const }],
    };
    expect(check.generalRounds(skills).pass).toBe(false);
    const noBehavioural = {
      ...golden,
      questions: golden.questions.filter((item) => item.round !== "behavioural"),
    };
    expect(check.generalRounds(noBehavioural).pass).toBe(false);
  });
});
