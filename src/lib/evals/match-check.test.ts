import { afterEach, describe, expect, it, vi } from "vitest";
import { matchCheck, type MatchCheck, type MatchRow } from "@/lib/match-check/check";
import { matchCheckFromText } from "@/lib/match-check/from-text";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { dryRun, gradeOutput, validateSuite } from "../../../scripts/evals/harness";
import type { AnyCase } from "../../../scripts/evals/suite";
import { matchCheckSuite } from "../../../scripts/evals/suites/match-check";
import {
  askLengthGrade,
  askNumbersGrade,
  asksFromPostGrade,
  asksGrade,
  countsGrade,
  evidenceLengthGrade,
  falseMissingGrade,
  findMention,
  importanceGrade,
  inventedRequirementsGrade,
  matchStatusGrade,
  mentions,
  noExtraTermsGrade,
  quotesFrom,
  quotesResumeGrade,
  requirementsFoundGrade,
  schemaGrade,
  type MatchCase,
  type MatchExpect,
} from "../../../scripts/evals/suites/match-check/graders";

const POST = [
  "Backend Engineer",
  "Requirements",
  "- Go and Kubernetes (k8s)",
  "- 5+ years of backend experience",
  "Nice to have",
  "- Terraform",
].join("\n");

const RESUME = [
  "ALEX MORROW",
  "EXPERIENCE",
  "- Built the billing service in Go and ran it for three years",
  "SKILLS",
  "Terraform, Docker",
].join("\n");

const EXPECT: MatchExpect = {
  terms: [
    { term: "Go", importance: "must", status: "shown" },
    { term: "Kubernetes", importance: "must", status: "missing", forms: ["k8s"] },
    { term: "Terraform", importance: "nice", status: "listed" },
  ],
  traps: ["Docker"],
  asks: ["5+ years of backend experience"],
};

const KASE: MatchCase = {
  id: "t",
  input: { via: "page", resume: RESUME, job: POST },
  expect: EXPECT,
};

const good = () => matchCheckFromText(RESUME, POST);

function withRows(check: MatchCheck, edit: (rows: MatchRow[]) => MatchRow[]): MatchCheck {
  return { ...check, rows: edit(check.rows.map((row) => ({ ...row }))) };
}

const byTerm = (check: MatchCheck, term: string) => check.rows.find((row) => row.term === term)!;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mentions", () => {
  it("matches whole words in any case, with a plural or a hyphen", () => {
    expect(mentions("Comfortable with POS systems", "POS system")).toBe(true);
    expect(mentions("point-of-sale tills", "Point of sale")).toBe(true);
    expect(mentions("Ran KUBERNETES clusters", "Kubernetes")).toBe(true);
    expect(mentions("Postgres", "PostgreSQL")).toBe(false);
    expect(mentions("prototypes in Framer", "Prototyping")).toBe(false);
  });

  it("keeps the case of names of three characters or fewer", () => {
    expect(mentions("Go deep with customers", "Go")).toBe(true);
    expect(mentions("happy to go the extra mile", "Go")).toBe(false);
    expect(mentions("C++ and C#", "C#")).toBe(true);
    expect(findMention("in modern C++ code", "C++")).toEqual({ index: 10, length: 3 });
  });
});

describe("quotesFrom", () => {
  it("accepts pieces cut with an ellipsis or joined with a comma or at", () => {
    const sources = [
      "Senior Engineer",
      "Fenmore Ledger",
      "Rebuilt the planner in modern C++ with a team",
    ];
    expect(quotesFrom("Senior Engineer at Fenmore Ledger", sources)).toBe(true);
    expect(quotesFrom("…planner in modern C++ with…", sources)).toBe(true);
    expect(quotesFrom("Rebuilt the planner in Rust", sources)).toBe(false);
    expect(quotesFrom("…", sources)).toBe(false);
  });
});

describe("the product's own output for a simple post", () => {
  it("passes every grader", () => {
    const grades = gradeOutput(matchCheckSuite, good(), KASE as AnyCase);
    expect(grades.filter((grade) => !grade.pass)).toEqual([]);
  });
});

describe("schemaGrade", () => {
  it("flags a status the product never uses", () => {
    expect(schemaGrade(good()).pass).toBe(true);
    const bad = withRows(good(), (rows) => [
      { ...rows[0]!, status: "maybe" as MatchRow["status"] },
    ]);
    expect(schemaGrade(bad)).toMatchObject({
      pass: false,
      detail: expect.stringContaining("rows.0.status"),
    });
  });
});

describe("countsGrade", () => {
  it("passes when the counts add up", () => {
    expect(countsGrade(good()).pass).toBe(true);
  });

  it("flags totals that disagree with the rows", () => {
    const grade = countsGrade({ ...good(), total: 9, found: 0, must: { found: 0, total: 0 } });
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("total is 9");
    expect(grade.detail).toContain("found is 0");
    expect(grade.detail).toContain("must is 0/0");
  });

  it("flags a missing row with a line, a wrong id, the wrong order and a repeat", () => {
    const check = good();
    const go = byTerm(check, "Go");
    const terraform = byTerm(check, "Terraform");
    expect(
      countsGrade(
        withRows(check, (rows) =>
          rows.map((row) => (row === rows[1] ? { ...row, where: go.where } : row)),
        ),
      ).detail,
    ).toContain("Kubernetes is missing with a line");
    expect(
      countsGrade(
        withRows(check, (rows) => rows.map((row, i) => (i === 0 ? { ...row, id: "x1" } : row))),
      ).detail,
    ).toContain("row 1 has id x1");
    const reordered = {
      ...check,
      rows: [
        { ...terraform, id: "m1" },
        { ...go, id: "m2" },
        { ...check.rows[1]!, id: "m3" },
      ],
    };
    expect(countsGrade(reordered).detail).toContain("Go (must) comes after Terraform (nice)");
    const twice = {
      ...check,
      rows: [...check.rows, { ...go, id: "m4" }],
      total: 4,
      found: 3,
      shown: 2,
      must: { found: 2, total: 3 },
    };
    expect(countsGrade(twice).detail).toContain("Go is listed twice");
  });

  it("flags a sorted flag that disagrees with the rows", () => {
    expect(countsGrade({ ...good(), sorted: false }).detail).toContain("sorted is false");
  });
});

describe("requirementsFoundGrade", () => {
  it("passes when every labelled skill is a row, by any accepted spelling", () => {
    const renamed = withRows(good(), (rows) =>
      rows.map((row) => (row.term === "Kubernetes" ? { ...row, term: "k8s" } : row)),
    );
    expect(requirementsFoundGrade(renamed, KASE).pass).toBe(true);
  });

  it("names the labelled skills that aren't listed", () => {
    const dropped = withRows(good(), (rows) => rows.filter((row) => row.term !== "Terraform"));
    expect(requirementsFoundGrade(dropped, KASE)).toMatchObject({
      pass: false,
      detail: "Terraform isn't listed",
    });
  });
});

describe("matchStatusGrade", () => {
  it("flags a skill with the wrong status", () => {
    expect(matchStatusGrade(good(), KASE).pass).toBe(true);
    const wrong = withRows(good(), (rows) =>
      rows.map((row) => (row.term === "Terraform" ? { ...row, status: "shown" as const } : row)),
    );
    expect(matchStatusGrade(wrong, KASE)).toMatchObject({
      pass: false,
      detail: "Terraform is shown, labelled listed",
    });
  });
});

describe("importanceGrade", () => {
  it("flags a skill with the wrong importance", () => {
    expect(importanceGrade(good(), KASE).pass).toBe(true);
    const wrong = withRows(good(), (rows) =>
      rows.map((row) => (row.term === "Terraform" ? { ...row, importance: null } : row)),
    );
    expect(importanceGrade(wrong, KASE)).toMatchObject({
      pass: false,
      detail: "Terraform is unranked, labelled nice",
    });
  });
});

describe("noExtraTermsGrade", () => {
  it("flags rows nobody labelled, and calls out traps", () => {
    expect(noExtraTermsGrade(good(), KASE).pass).toBe(true);
    const extra = withRows(good(), (rows) => [
      ...rows,
      {
        id: "m4",
        term: "Docker",
        importance: null,
        status: "listed",
        where: { place: "Skills", text: "Terraform, Docker" },
      },
      { id: "m5", term: "Backend", importance: null, status: "missing", where: null },
    ]);
    const grade = noExtraTermsGrade(extra, KASE);
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("Docker (a trap: the post doesn't ask for it)");
    expect(grade.detail).toContain("Backend isn't labelled");
  });

  it("passes a case with no labels", () => {
    expect(noExtraTermsGrade(good(), { ...KASE, expect: undefined }).pass).toBe(true);
  });
});

describe("inventedRequirementsGrade", () => {
  it("accepts a label the post only spells another way", () => {
    const renamed = withRows(good(), (rows) =>
      rows.map((row) => (row.term === "Kubernetes" ? { ...row, term: "k8s" } : row)),
    );
    expect(inventedRequirementsGrade(renamed, KASE).pass).toBe(true);
  });

  it("flags a row the post never names", () => {
    const invented = withRows(good(), (rows) => [
      ...rows,
      { id: "m4", term: "Python", importance: "must", status: "missing", where: null },
    ]);
    expect(inventedRequirementsGrade(invented, KASE)).toMatchObject({
      pass: false,
      detail: "Python isn't in the post",
    });
  });
});

describe("quotesResumeGrade", () => {
  it("flags a quote that isn't in the resume", () => {
    const made = withRows(good(), (rows) =>
      rows.map((row) =>
        row.term === "Go"
          ? { ...row, where: { place: "Experience", text: "Led the Go platform team" } }
          : row,
      ),
    );
    expect(quotesResumeGrade(made, KASE).detail).toContain(
      `Go: "Led the Go platform team" isn't in the resume`,
    );
  });

  it("flags a real quote that doesn't name the skill", () => {
    const off = withRows(good(), (rows) =>
      rows.map((row) =>
        row.term === "Terraform" ? { ...row, where: { place: "Top", text: "ALEX MORROW" } } : row,
      ),
    );
    expect(quotesResumeGrade(off, KASE).detail).toContain(
      `Terraform: "ALEX MORROW" doesn't name it`,
    );
  });

  it("reads a studio resume's visible fields, not its hidden lines", () => {
    const resume: Resume = {
      ...emptyResume(0),
      experience: [
        {
          id: "j1",
          company: "Fenmore Ledger",
          title: "Engineer",
          location: "",
          startDate: "2020",
          endDate: "Present",
          bullets: [
            { id: "b1", text: "Built the settlement API in TypeScript" },
            { id: "b2", text: "Ran gRPC load tests", hidden: true },
          ],
        },
      ],
    };
    const job = "Requirements\n- TypeScript\n- gRPC";
    const kase: MatchCase = {
      id: "s",
      input: { via: "studio", resume, job },
      expect: {
        terms: [
          { term: "TypeScript", importance: "must", status: "shown" },
          { term: "gRPC", importance: "must", status: "missing" },
        ],
      },
    };
    const check = matchCheck(resume, job);
    expect(quotesResumeGrade(check, kase).pass).toBe(true);
    expect(falseMissingGrade(check, kase).pass).toBe(true);
    const fromHidden = withRows(check, (rows) =>
      rows.map((row) =>
        row.term === "gRPC"
          ? {
              ...row,
              status: "shown" as const,
              where: { place: "Engineer at Fenmore Ledger, line 2", text: "Ran gRPC load tests" },
            }
          : row,
      ),
    );
    expect(quotesResumeGrade(fromHidden, kase).pass).toBe(false);
    const title = withRows(check, (rows) =>
      rows.map((row) =>
        row.term === "TypeScript"
          ? { ...row, where: { place: "Job title", text: "Engineer at Fenmore Ledger" } }
          : row,
      ),
    );
    expect(quotesResumeGrade(title, kase).detail).toContain("doesn't name it");
  });
});

describe("falseMissingGrade", () => {
  it("flags a skill marked missing that the resume names", () => {
    const wrong = withRows(good(), (rows) =>
      rows.map((row) =>
        row.term === "Terraform" ? { ...row, status: "missing" as const, where: null } : row,
      ),
    );
    expect(falseMissingGrade(wrong, KASE)).toMatchObject({
      pass: false,
      detail: "Terraform is marked missing but the resume names it",
    });
  });

  it("doesn't count a lowercase word as a short name", () => {
    const resume = "We go above and beyond for every customer, every single day of the week.";
    const kase: MatchCase = { ...KASE, input: { via: "page", resume, job: POST } };
    const check = matchCheckFromText(resume, POST);
    expect(byTerm(check, "Go").status).toBe("missing");
    expect(falseMissingGrade(check, kase).pass).toBe(true);
  });
});

describe("asksGrade", () => {
  it("passes the asks the post makes", () => {
    expect(asksGrade(good(), KASE)).toMatchObject({
      pass: true,
      detail: "the asks match the labels",
    });
  });

  it("flags a missing ask and a wrong number of asks", () => {
    const grade = asksGrade({ ...good(), asks: ["Nice to have"] }, KASE);
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain(`no ask for "5+ years of backend experience"`);
    expect(asksGrade({ ...good(), asks: [...good().asks, "Terraform"] }, KASE).detail).toBe(
      "2 asks, labelled 1",
    );
  });

  it("passes when asks aren't labelled", () => {
    expect(asksGrade(good(), { ...KASE, expect: { terms: EXPECT.terms } }).pass).toBe(true);
  });
});

describe("the shared graders on asks and quotes", () => {
  it("flags a number the post doesn't have", () => {
    expect(askNumbersGrade(good(), KASE).pass).toBe(true);
    expect(
      askNumbersGrade({ ...good(), asks: ["8+ years of backend experience"] }, KASE).pass,
    ).toBe(false);
  });

  it("flags words that aren't in the post", () => {
    expect(asksFromPostGrade(good(), KASE).pass).toBe(true);
    expect(asksFromPostGrade({ ...good(), asks: ["5+ years of Python"] }, KASE).pass).toBe(false);
  });

  it("flags an ask over 160 characters", () => {
    expect(askLengthGrade(good()).pass).toBe(true);
    expect(askLengthGrade({ ...good(), asks: ["years ".repeat(30)] }).pass).toBe(false);
  });

  it("flags a quote over 200 characters", () => {
    expect(evidenceLengthGrade(good()).pass).toBe(true);
    const long = withRows(good(), (rows) =>
      rows.map((row) =>
        row.where ? { ...row, where: { ...row.where, text: "Go ".repeat(80) } } : row,
      ),
    );
    expect(evidenceLengthGrade(long).pass).toBe(false);
  });
});

describe("matchCheckSuite", () => {
  it("is valid, and every golden passes every grader", () => {
    expect(validateSuite(matchCheckSuite)).toEqual([]);
    const [checked] = dryRun([matchCheckSuite]);
    expect(checked?.problems).toEqual([]);
    expect(matchCheckSuite.cases.length).toBeGreaterThanOrEqual(15);
    expect(matchCheckSuite.cases.length).toBeLessThanOrEqual(25);
  });

  it("calls the page's and the studio's own functions, with no network and no AI call", async () => {
    const fetch = vi.fn(() => Promise.reject(new Error("no network")));
    vi.stubGlobal("fetch", fetch);
    for (const kase of matchCheckSuite.cases) {
      const { input } = kase as MatchCase;
      const expected =
        input.via === "page"
          ? matchCheckFromText(input.resume, input.job)
          : matchCheck(input.resume, input.job);
      await expect(matchCheckSuite.run(kase, "lab/any-model")).resolves.toEqual(expected);
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(matchCheckSuite.estimate?.(matchCheckSuite.cases[0]!)).toEqual({
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
  });

  it("shows the judge the result the way the page does", () => {
    const kase = matchCheckSuite.cases[0]!;
    const text = matchCheckSuite.judgeOutput?.(kase.golden, kase) ?? "";
    expect(text).toContain("Found 6 of 8 skills the post names");
    expect(text).toContain("- Kubernetes [must]: Not found");
    expect(matchCheckSuite.judgeInput?.(kase)).toContain("RESUME (pasted text)");
  });
});
