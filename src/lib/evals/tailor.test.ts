import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TailorResult } from "@/lib/ai/types";
import { resetEnvForTests } from "@/lib/env";
import { resumeToText } from "@/lib/resume/ops";
import { dryRun, validateSuite } from "../../../scripts/evals/harness";
import { SUITES } from "../../../scripts/evals/suites";
import { tailorSuite } from "../../../scripts/evals/suites/tailor";
import { TAILOR_CASES } from "../../../scripts/evals/suites/tailor/cases";
import {
  capitalizedNames,
  coveredTerms,
  gapTerms,
  guessesOnly,
  importance,
  inflatedTitles,
  inventedDegrees,
  jobFields,
  leadLines,
  notesMention,
  notesWithoutIds,
  numberWordsIn,
  offPostTerms,
  requirementsFound,
  summaryDegrees,
  summaryGaps,
  summaryNames,
  summaryNumberWords,
  summarySeniority,
  summarySentences,
  summaryVerbs,
  unchangedSections,
  type TailorCase,
} from "../../../scripts/evals/suites/tailor/graders";
import {
  ENGINEERING_MANAGER,
  FRONTEND_JUNIOR,
  LISTED_ONLY,
  NEW_GRAD_ANALYST,
  SCIENTIST,
  WAREHOUSE_LEAD,
} from "../../../scripts/evals/suites/tailor/resumes";

const tailorResume = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/tailor", () => ({ tailorResume }));

const breakApply = vi.hoisted(() => ({ on: false }));
vi.mock("@/components/studio/tailor/apply", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/studio/tailor/apply")>();
  return {
    ...real,
    applyTailorChoices: (...args: Parameters<typeof real.applyTailorChoices>) => {
      const next = real.applyTailorChoices(...args);
      if (!breakApply.on) return next;
      const [first, ...rest] = next.experience;
      if (!first) return next;
      const trimmed = { ...first, bullets: first.bullets.slice(1) };
      return { ...next, skills: [], experience: [trimmed, ...rest] };
    },
  };
});

function caseOf(id: string): TailorCase {
  const found = TAILOR_CASES.find((kase) => kase.id === id);
  if (!found) throw new Error(`no case ${id}`);
  return found;
}

function goldenOf(id: string): TailorResult {
  const golden = caseOf(id).golden;
  if (!golden) throw new Error(`case ${id} has no golden`);
  return structuredClone(golden);
}

function withoutKeywords(output: TailorResult, terms: readonly string[]): TailorResult {
  return {
    ...output,
    keywords: output.keywords.filter((keyword) => !terms.includes(keyword.term)),
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("tests make no network calls");
    }),
  );
  tailorResume.mockReset();
  breakApply.on = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
});

describe("tailor suite", () => {
  it("is registered and valid", () => {
    expect(SUITES).toContain(tailorSuite);
    expect(validateSuite(tailorSuite)).toEqual([]);
    expect(TAILOR_CASES.length).toBeGreaterThanOrEqual(15);
    expect(TAILOR_CASES.length).toBeLessThanOrEqual(25);
  });

  it("passes every check on every golden", () => {
    const [checked] = dryRun([tailorSuite]);
    expect(checked?.problems).toEqual([]);
    expect(checked?.cases.every((kase) => kase.grades !== null)).toBe(true);
  });

  it("uses only placeholder email addresses", () => {
    for (const kase of TAILOR_CASES) {
      expect(kase.input.resume.basics.email).toMatch(/@example\.com$/);
    }
  });

  it("calls tailorResume with the route's parsed request", async () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    resetEnvForTests();
    const kase = caseOf("backend-go-payments");
    tailorResume.mockResolvedValue(kase.golden);
    const padded = {
      ...kase,
      input: { ...kase.input, job: { ...kase.input.job, text: `  ${kase.input.job.text}\n` } },
    };
    await expect(tailorSuite.run(padded, "lab/model-1")).resolves.toEqual(kase.golden);
    expect(tailorResume).toHaveBeenCalledWith(kase.input.resume, {
      jobText: kase.input.job.text,
      jobTitle: "Senior Backend Engineer",
      company: "Lumenfold",
    });
  });

  it("throws instead of returning the demo result when AI is off", async () => {
    delete process.env.OPENROUTER_API_KEY;
    resetEnvForTests();
    await expect(tailorSuite.run(caseOf("backend-go-payments"), "lab/model-1")).rejects.toThrow(
      /demo/,
    );
    expect(tailorResume).not.toHaveBeenCalled();
  });

  it("shows the judge the new line order by text, never by id", () => {
    const kase = caseOf("backend-go-payments");
    const shown = tailorSuite.judgeOutput?.(kase.golden, kase) ?? "";
    expect(shown).toContain("Line order after tailoring:");
    expect(shown).toContain("1. Built a Go service");
    expect(shown).not.toContain("go-j1-b2");
    expect(tailorSuite.judgeInput?.(kase)).toContain(resumeToText(kase.input.resume));
  });

  it("estimates the prompt, the resume twice and the post", () => {
    const short = tailorSuite.estimate?.(caseOf("thin-resume-short-post"));
    const long = tailorSuite.estimate?.(caseOf("pasted-whole-page"));
    expect(short?.calls).toBe(1);
    expect(long?.inputTokens ?? 0).toBeGreaterThan((short?.inputTokens ?? 0) + 2_500);
  });
});

describe("requirementsFound", () => {
  it("fails when no requirement comes back", () => {
    expect(requirementsFound(goldenOf("backend-go-payments")).pass).toBe(true);
    expect(requirementsFound({ ...goldenOf("backend-go-payments"), requirements: [] }).pass).toBe(
      false,
    );
  });
});

describe("coveredTerms", () => {
  const kase = caseOf("backend-go-payments");

  it("allows one miss in four", () => {
    expect(coveredTerms(goldenOf(kase.id), kase).pass).toBe(true);
    const oneMissed = coveredTerms(withoutKeywords(goldenOf(kase.id), ["Kafka"]), kase);
    expect(oneMissed).toMatchObject({ pass: true, detail: "3 of 4 found; missed Kafka" });
    const twoMissed = coveredTerms(withoutKeywords(goldenOf(kase.id), ["Kafka", "Go"]), kase);
    expect(twoMissed).toMatchObject({ pass: false, detail: "2 of 4 found; missed Go, Kafka" });
  });

  it("counts a requirement proven by an exact resume quote", () => {
    const cook = caseOf("line-cook-to-sous-chef");
    expect(coveredTerms(goldenOf(cook.id), cook).pass).toBe(true);
    const output = goldenOf(cook.id);
    const unquoted = {
      ...output,
      requirements: output.requirements.map((item) => ({ ...item, quote: "" })),
    };
    expect(coveredTerms(unquoted, cook).pass).toBe(false);
  });
});

describe("gapTerms", () => {
  it("passes when every missing term is flagged and none is marked found", () => {
    const kase = caseOf("backend-go-payments");
    expect(gapTerms(goldenOf(kase.id), kase).map((grade) => grade.pass)).toEqual([true, true]);
  });

  it("fails when a missing term is marked as in the resume", () => {
    const kase = caseOf("backend-go-payments");
    const output = goldenOf(kase.id);
    const claimed = {
      ...output,
      keywords: output.keywords.map((keyword) =>
        keyword.term === "Terraform" ? { ...keyword, inResume: true } : keyword,
      ),
    };
    const [flagged, notProven] = gapTerms(claimed, kase);
    expect(flagged?.pass).toBe(false);
    expect(notProven).toMatchObject({
      pass: false,
      detail: "Terraform is marked as in the resume",
    });
  });

  it("catches a shorter spelling that proves a missing certificate", () => {
    const kase = caseOf("line-cook-to-sous-chef");
    const output = goldenOf(kase.id);
    const loose = {
      ...output,
      keywords: [
        ...output.keywords,
        { term: "ServSafe", importance: "must" as const, inResume: true, evidence: "" },
      ],
    };
    expect(gapTerms(loose, kase)[1]?.pass).toBe(false);
  });

  it("counts an unproven experience requirement as flagged", () => {
    const kase = caseOf("manager-to-director");
    const grades = gapTerms(withoutKeywords(goldenOf(kase.id), ["SOC 2", "Kubernetes"]), kase);
    expect(grades[0]).toMatchObject({
      pass: false,
      detail: "1 of 3 found; missed SOC 2, Kubernetes",
    });
  });
});

describe("importance", () => {
  it("fails when a must-have comes back as nice", () => {
    const kase = caseOf("backend-go-payments");
    expect(importance(goldenOf(kase.id), kase).pass).toBe(true);
    const output = goldenOf(kase.id);
    const softened: TailorResult = {
      ...output,
      keywords: output.keywords.map((keyword) =>
        keyword.term === "Go" ? { ...keyword, importance: "nice" } : keyword,
      ),
      requirements: output.requirements.map((item) =>
        item.terms.includes("Go") ? { ...item, importance: "nice" } : item,
      ),
    };
    expect(importance(softened, kase)).toMatchObject({
      pass: false,
      detail: 'Go should be "must"',
    });
  });
});

describe("offPostTerms", () => {
  it("flags a benefit listed as a requirement", () => {
    const kase = caseOf("backend-go-payments");
    const output = goldenOf(kase.id);
    expect(offPostTerms(output, kase).pass).toBe(true);
    const benefit = {
      ...output,
      keywords: [
        ...output.keywords,
        { term: "401(k)", importance: "nice" as const, inResume: false, evidence: "" },
      ],
    };
    expect(offPostTerms(benefit, kase).pass).toBe(false);
  });

  it("doesn't flag a real requirement that sits inside an injected phrase", () => {
    const kase = caseOf("injection-in-post");
    expect(goldenOf(kase.id).keywords.some((keyword) => keyword.term === "Gainsight")).toBe(true);
    expect(offPostTerms(goldenOf(kase.id), kase).pass).toBe(true);
  });
});

describe("jobFields", () => {
  it("keeps a given title exactly", () => {
    const kase = caseOf("backend-go-payments");
    const output = goldenOf(kase.id);
    expect(jobFields(output, kase).pass).toBe(true);
    expect(
      jobFields({ ...output, job: { ...output.job, title: "Backend Engineer" } }, kase).pass,
    ).toBe(false);
  });

  it("reads an empty field from the post, ignoring case", () => {
    const kase = caseOf("frontend-junior-no-fields");
    const output = goldenOf(kase.id);
    expect(
      jobFields({ ...output, job: { title: "FRONTEND ENGINEER", company: "Fernhill Labs" } }, kase)
        .pass,
    ).toBe(true);
    expect(
      jobFields({ ...output, job: { title: "Frontend Engineer", company: "Fernhill" } }, kase).pass,
    ).toBe(false);
  });

  it("fails when it names a company the post doesn't", () => {
    const kase = caseOf("agency-post-no-company");
    const output = goldenOf(kase.id);
    expect(jobFields(output, kase).pass).toBe(true);
    const named = { ...output, job: { ...output.job, company: "Furniture Importer Inc" } };
    expect(jobFields(named, kase).detail).toContain("the post names none");
  });
});

describe("guessesOnly", () => {
  it("expects every requirement of a duties-only post to be a guess", () => {
    const kase = caseOf("duties-only-post");
    const output = goldenOf(kase.id);
    expect(guessesOnly(output, kase).pass).toBe(true);
    const [head, ...rest] = output.requirements;
    if (!head) throw new Error("no requirement");
    const sure = { ...output, requirements: [{ ...head, source: "structure" as const }, ...rest] };
    expect(guessesOnly(sure, kase).pass).toBe(false);
    expect(guessesOnly(sure, caseOf("backend-go-payments")).pass).toBe(true);
  });
});

describe("summaryNames", () => {
  it("skips sentence starts and first-person words", () => {
    expect(
      capitalizedNames("Backend engineer at Lumenfold. Built Go services (AWS), and I'm on call."),
    ).toEqual(["Lumenfold", "Go", "AWS"]);
  });

  it("flags a name the resume doesn't have, such as the hiring company", () => {
    const kase = caseOf("backend-go-payments");
    const output = {
      ...goldenOf(kase.id),
      summary: "Backend engineer ready for Lumenfold's Ledger team.",
    };
    expect(summaryNames(goldenOf(kase.id), kase).pass).toBe(true);
    expect(summaryNames(output, kase)).toMatchObject({
      pass: false,
      detail: '"Lumenfold" is not in the resume',
    });
  });
});

describe("summaryNumberWords", () => {
  it("flags a spelled-out count the resume doesn't give", () => {
    expect(numberWordsIn("Seven years of support work", "Support specialist since 2019")).toEqual([
      "seven",
    ]);
    expect(numberWordsIn("Leads two shifts", "Lead a crew across 2 shifts")).toEqual([]);
    expect(numberWordsIn("Over a decade in kitchens", "Line cook")).toEqual(["decade"]);
    expect(numberWordsIn("One of twenty-five cooks", "Worked with 25 cooks")).toEqual([]);
    expect(numberWordsIn("Trained twenty-five cooks", "Trained 20 cooks")).toEqual(["twenty-five"]);
  });

  it("grades the summary against the resume", () => {
    const kase = caseOf("manager-to-director");
    expect(summaryNumberWords(goldenOf(kase.id), kase).pass).toBe(true);
    const totaled = {
      ...goldenOf(kase.id),
      summary: "Engineering manager with twelve years of experience.",
    };
    expect(summaryNumberWords(totaled, kase).pass).toBe(false);
  });
});

describe("summaryDegrees", () => {
  it("allows only degrees the resume shows, in any spelling", () => {
    expect(inventedDegrees("Graduate with a master's in data science", NEW_GRAD_ANALYST)).toEqual([
      "master",
    ]);
    expect(inventedDegrees("Bachelor's in statistics", NEW_GRAD_ANALYST)).toEqual([]);
    expect(inventedDegrees("Holds an MBA", NEW_GRAD_ANALYST)).toEqual(["mba"]);
    expect(inventedDegrees("Chemist with a Ph.D.", SCIENTIST)).toEqual([]);
    expect(inventedDegrees("Engineer with a degree in computer science", LISTED_ONLY)).toEqual([
      "degree",
    ]);
  });

  it("grades the summary", () => {
    const kase = caseOf("messy-resume-formatting");
    expect(summaryDegrees(goldenOf(kase.id), kase).pass).toBe(true);
    const claimed = {
      ...goldenOf(kase.id),
      summary: "Bookkeeper with a bachelor's degree in accounting.",
    };
    expect(summaryDegrees(claimed, kase).pass).toBe(false);
  });
});

describe("summarySeniority", () => {
  it("flags a rank the resume doesn't hold", () => {
    expect(inflatedTitles("Senior frontend developer", resumeToText(FRONTEND_JUNIOR))).toEqual([
      "senior",
    ]);
    expect(
      inflatedTitles("Manages 2 engineering managers", resumeToText(ENGINEERING_MANAGER)),
    ).toEqual([]);
    expect(inflatedTitles("Warehouse supervisor and lead", resumeToText(WAREHOUSE_LEAD))).toEqual([
      "supervisor",
    ]);
  });

  it("grades the summary", () => {
    const kase = caseOf("manager-to-director");
    expect(summarySeniority(goldenOf(kase.id), kase).pass).toBe(true);
    const promoted = { ...goldenOf(kase.id), summary: "Engineering director who runs 3 teams." };
    expect(summarySeniority(promoted, kase).pass).toBe(false);
  });
});

describe("summaryVerbs", () => {
  it("flags a stronger verb than the resume line uses", () => {
    const kase = caseOf("frontend-junior-no-fields");
    expect(summaryVerbs(goldenOf(kase.id), kase).pass).toBe(true);
    const upgraded = {
      ...goldenOf(kase.id),
      summary: "Frontend developer who led the move from JavaScript to TypeScript.",
    };
    expect(summaryVerbs(upgraded, kase).detail).toContain('"led"');
  });
});

describe("summaryGaps", () => {
  it("fails when the summary claims a missing term", () => {
    const kase = caseOf("backend-go-payments");
    expect(summaryGaps(goldenOf(kase.id), kase).pass).toBe(true);
    const claimed = {
      ...goldenOf(kase.id),
      summary: "Backend engineer who runs Go services with Terraform.",
    };
    expect(summaryGaps(claimed, kase)).toMatchObject({ pass: false });
  });
});

describe("summarySentences", () => {
  it("wants two or three sentences, or no summary", () => {
    const output = goldenOf("backend-go-payments");
    expect(summarySentences(output).pass).toBe(true);
    expect(summarySentences({ ...output, summary: "" }).pass).toBe(true);
    expect(summarySentences({ ...output, summary: "Backend engineer in Go." }).pass).toBe(false);
    expect(summarySentences({ ...output, summary: "One. Two. Three. Four." }).pass).toBe(false);
  });
});

describe("notesWithoutIds", () => {
  it("fails on a bullet alias or a resume id", () => {
    const kase = caseOf("backend-go-payments");
    const output = goldenOf(kase.id);
    expect(notesWithoutIds(output, kase).pass).toBe(true);
    expect(notesWithoutIds({ ...output, notes: ["Move b2 to the top."] }, kase).pass).toBe(false);
    expect(notesWithoutIds({ ...output, notes: ["Rewrite go-j1-b3 first."] }, kase).pass).toBe(
      false,
    );
  });
});

describe("notesMention", () => {
  it("wants a note about the expected weak must-have", () => {
    const kase = caseOf("nurse-to-emergency");
    expect(notesMention(goldenOf(kase.id), kase).pass).toBe(true);
    expect(notesMention({ ...goldenOf(kase.id), notes: [] }, kase).pass).toBe(false);
    expect(
      notesMention({ ...goldenOf(kase.id), notes: [] }, caseOf("backend-go-payments")).pass,
    ).toBe(true);
  });
});

describe("unchangedSections", () => {
  it("passes when only line order and an empty summary change", () => {
    const backend = caseOf("backend-go-payments");
    expect(unchangedSections(goldenOf(backend.id), backend).pass).toBe(true);
    const frontend = caseOf("frontend-junior-no-fields");
    expect(frontend.input.resume.summary).toBe("");
    expect(unchangedSections(goldenOf(frontend.id), frontend).pass).toBe(true);
  });

  it("fails when applying the result changes anything else", () => {
    breakApply.on = true;
    const kase = caseOf("backend-go-payments");
    const grade = unchangedSections(goldenOf(kase.id), kase);
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("skills changed");
    expect(grade.detail).toContain("Backend Engineer lines changed, not just reordered");
  });
});

describe("leadLines", () => {
  it("fails when a job still leads with a line that proves nothing", () => {
    const kase = caseOf("backend-go-payments");
    expect(leadLines(goldenOf(kase.id), kase).pass).toBe(true);
    const unordered = leadLines({ ...goldenOf(kase.id), bulletOrder: [] }, kase);
    expect(unordered).toMatchObject({ pass: false });
    expect(unordered.detail).toContain('Backend Engineer leads with "Ran the on-call rotation');
  });
});
