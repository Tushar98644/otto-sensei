import { describe, expect, it } from "vitest";
import type { CaseResult } from "../../../scripts/evals/harness";
import {
  checksChangeTable,
  checksTable,
  compareRows,
  criteriaChangeTable,
  criteriaTable,
  markdownReport,
  median,
  readRows,
  reasonsFor,
  regressionCount,
  regressionSummary,
  summarize,
  worstCases,
  type Row,
  type RunFile,
} from "../../../scripts/evals/report";

function result(overrides: Partial<CaseResult>): CaseResult {
  return {
    feature: "fix",
    model: "lab/model-a",
    caseId: "case",
    status: "ok",
    error: null,
    latencyMs: 1_000,
    calls: 1,
    inputTokens: 100,
    outputTokens: 50,
    usd: 0.001,
    grades: [{ name: "schema", pass: true, detail: "" }],
    judge: { score: 4, scores: { truthful: 4 }, why: "Fine.", usd: 0.0005, error: null },
    output: null,
    ...overrides,
  };
}

const RESULTS: CaseResult[] = [
  result({ caseId: "good", latencyMs: 1_000 }),
  result({
    caseId: "failed-check",
    latencyMs: 3_000,
    grades: [{ name: "invented-numbers", pass: false, detail: "40% not in the input" }],
    judge: {
      score: 2,
      scores: { truthful: 2 },
      why: "Made up a figure.",
      usd: 0.0005,
      error: null,
    },
  }),
  result({
    caseId: "broke",
    status: "error",
    error: "invalid_output: bad shape",
    latencyMs: 9_000,
    grades: [],
    judge: null,
  }),
  result({
    caseId: "no-money",
    status: "skipped",
    error: "budget",
    latencyMs: null,
    usd: 0,
    grades: [],
    judge: null,
  }),
  result({ model: "lab/model-b", caseId: "good", latencyMs: 500, usd: 0.002 }),
];

describe("median", () => {
  it("takes the middle, or the mean of the two middles", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
});

describe("summarize", () => {
  it("builds one row per feature and model", () => {
    const [a, b] = summarize(RESULTS);
    expect(a).toEqual({
      feature: "fix",
      model: "lab/model-a",
      cases: 3,
      errors: 1,
      skipped: 1,
      passRate: 1 / 3,
      judgeMean: 3,
      judged: 2,
      p50LatencyMs: 2_000,
      usdPerCall: 0.001,
      totalUsd: 0.003 + 0.001,
      criteria: { truthful: 3 },
      checks: { schema: 1, "invented-numbers": 0 },
    });
    expect(b).toMatchObject({ model: "lab/model-b", cases: 1, passRate: 1, usdPerCall: 0.002 });
  });
});

describe("worstCases", () => {
  it("puts errors first, then failed checks, then low judge scores, with reasons", () => {
    const worst = worstCases(RESULTS.filter((r) => r.model === "lab/model-a"));
    expect(worst.map((item) => item.caseId)).toEqual(["broke", "failed-check", "good"]);
    expect(worst[1]!.reasons).toEqual([
      "invented-numbers: 40% not in the input",
      "judge 2.0/5: Made up a figure.",
    ]);
    expect(reasonsFor(RESULTS[2]!)).toEqual(["error: invalid_output: bad shape"]);
  });
});

describe("compareRows", () => {
  const before: Row = {
    feature: "fix",
    model: "lab/model-a",
    cases: 10,
    errors: 0,
    skipped: 0,
    passRate: 0.9,
    judgeMean: 4.2,
    judged: 10,
    p50LatencyMs: 2_000,
    usdPerCall: 0.001,
    totalUsd: 0.015,
    criteria: {},
    checks: {},
  };

  it("flags drops in quality and rises in latency or cost", () => {
    const after = {
      ...before,
      passRate: 0.8,
      judgeMean: 4.1,
      p50LatencyMs: 3_000,
      usdPerCall: 0.0011,
    };
    const [delta] = compareRows([after], [before]);
    const flags = Object.fromEntries(delta!.metrics.map((m) => [m.metric, m.regression]));
    expect(flags).toEqual({
      passRate: true,
      judgeMean: false,
      p50LatencyMs: true,
      usdPerCall: false,
    });
    expect(delta!.metrics[0]!.change).toBeCloseTo(-0.1);
  });

  it("never flags an improvement", () => {
    const after = { ...before, passRate: 1, judgeMean: 4.9, p50LatencyMs: 500, usdPerCall: 0.0001 };
    expect(compareRows([after], [before])[0]!.metrics.some((m) => m.regression)).toBe(false);
  });

  it("ignores a latency rise of under 250 ms, however large in percent", () => {
    const fast = { ...before, p50LatencyMs: 100 };
    const [delta] = compareRows([{ ...fast, p50LatencyMs: 300 }], [fast]);
    expect(delta!.metrics.find((m) => m.metric === "p50LatencyMs")!.regression).toBe(false);
  });

  it("lists rows that are new or gone", () => {
    const other = { ...before, model: "lab/model-b" };
    expect(compareRows([other], [before]).map((d) => `${d.model} ${d.status}`)).toEqual([
      "lab/model-b new",
      "lab/model-a gone",
    ]);
  });
});

describe("markdownReport", () => {
  it("writes the summary, the comparison and the worst cases", () => {
    const rows = summarize(RESULTS);
    const run: RunFile = {
      version: 1,
      startedAt: "2026-11-21T09:00:00.000Z",
      finishedAt: "2026-11-21T09:05:00.000Z",
      judge: "lab/judge-1",
      maxUsd: 2,
      spentUsd: 0.01,
      stoppedByBudget: true,
      options: {
        features: ["fix"],
        models: ["lab/model-a", "lab/model-b"],
        cases: "all",
        liftPriceCap: false,
      },
      rows,
      results: RESULTS,
    };
    const older = rows.map((row) => ({ ...row, passRate: 1 }));
    const text = markdownReport(run, { dir: "../older", deltas: compareRows(rows, older) });
    expect(text).toContain("| fix | lab/model-a | 3 | 33% | 3.00 | 2.0 s | $0.00100 | 1 | 1 |");
    expect(text).toContain("Stopped at the --max-usd cap");
    expect(text).toContain("## Compared with ../older");
    expect(text).toContain("33% (-67 pts, REGRESSION)");
    expect(text).toContain("Failing checks: invented-numbers 1.");
    expect(text).toContain("- `broke`: error: invalid_output: bad shape");
  });
});

describe("readRows", () => {
  it("reads the rows of a results file and rejects anything else", () => {
    const rows = summarize(RESULTS);
    expect(readRows(JSON.parse(JSON.stringify({ version: 1, rows })))).toEqual(rows);
    expect(readRows({ rows: [{ feature: "fix" }] })).toBeNull();
  });
});

const grade = (name: string, pass: boolean) => ({
  name,
  pass,
  detail: pass ? "" : `${name} failed`,
});

const judged = (scores: Record<string, number>): CaseResult["judge"] => {
  const values = Object.values(scores);
  const score = values.reduce((sum, value) => sum + value, 0) / values.length;
  return { score, scores, why: "Fine.", usd: 0.0005, error: null };
};

const RUBRIC = { fix: ["keeps_facts", "strong_line", "useful_asks"] };

const DETAIL: CaseResult[] = [
  result({
    caseId: "one",
    grades: [grade("schema", true), grade("invented-numbers", true)],
    judge: judged({ keeps_facts: 5, strong_line: 4, useful_asks: 4 }),
  }),
  result({
    caseId: "two",
    grades: [
      grade("schema", true),
      grade("invented-numbers", false),
      grade("length", true),
      grade("length", false),
    ],
    judge: judged({ keeps_facts: 3, strong_line: 4, useful_asks: 2 }),
  }),
  result({ caseId: "three", status: "error", error: "timeout", grades: [], judge: null }),
  result({
    model: "lab/model-b",
    caseId: "one",
    grades: [grade("schema", true), grade("invented-numbers", true)],
    judge: judged({ keeps_facts: 4, strong_line: 2, useful_asks: 5 }),
  }),
  result({
    model: "lab/model-b",
    caseId: "two",
    grades: [grade("schema", true), grade("invented-numbers", true), grade("length", true)],
    judge: { score: null, scores: {}, why: "", usd: 0, error: "unreadable verdict" },
  }),
];

// Model a got worse on keeps_facts and invented-numbers; length is new since the older run.
function olderRows(rows: readonly Row[]): Row[] {
  return rows.map((row) =>
    row.model === "lab/model-a"
      ? {
          ...row,
          criteria: { keeps_facts: 4.5, strong_line: 3.8, useful_asks: 3.1 },
          checks: { schema: 1, "invented-numbers": 0.9 },
        }
      : row,
  );
}

function runOf(rows: Row[], results: CaseResult[]): RunFile {
  return {
    version: 1,
    startedAt: "2026-11-21T09:00:00.000Z",
    finishedAt: "2026-11-21T09:05:00.000Z",
    judge: "lab/judge-1",
    maxUsd: 2,
    spentUsd: 0.01,
    stoppedByBudget: false,
    options: {
      features: ["fix"],
      models: ["lab/model-a", "lab/model-b"],
      cases: "all",
      liftPriceCap: false,
    },
    rows,
    results,
  };
}

describe("scores per criterion and pass rates per check", () => {
  it("averages each rubric criterion and rates each check, per model, leaving errors out", () => {
    const [a, b] = summarize(DETAIL, RUBRIC);
    expect(a!.criteria).toEqual({ keeps_facts: 4, strong_line: 4, useful_asks: 3 });
    expect(a!.checks).toEqual({ schema: 1, "invented-numbers": 0.5, length: 0 });
    expect(b!.criteria).toEqual({ keeps_facts: 4, strong_line: 2, useful_asks: 5 });
    expect(b!.checks).toEqual({ schema: 1, "invented-numbers": 1, length: 1 });
  });

  it("keeps a rubric criterion that no case was scored on, as unknown", () => {
    const [a] = summarize(DETAIL, { fix: ["tone", ...RUBRIC.fix] });
    expect(Object.keys(a!.criteria)).toEqual(["tone", "keeps_facts", "strong_line", "useful_asks"]);
    expect(a!.criteria.tone).toBeNull();
    const [errored] = summarize([DETAIL[2]!], RUBRIC);
    expect(errored!.criteria).toEqual({ keeps_facts: null, strong_line: null, useful_asks: null });
    expect(errored!.checks).toEqual({});
  });

  it("renders a row per model with a column per criterion, and a row per check", () => {
    const rows = summarize(DETAIL, RUBRIC);
    expect(criteriaTable(rows)).toBe(
      [
        "| Model | keeps_facts | strong_line | useful_asks |",
        "|---|---:|---:|---:|",
        "| lab/model-a | 4.00 | 4.00 | 3.00 |",
        "| lab/model-b | 4.00 | 2.00 | 5.00 |",
      ].join("\n"),
    );
    expect(checksTable(rows)).toBe(
      [
        "| Check | lab/model-a | lab/model-b |",
        "|---|---:|---:|",
        "| schema | 100% | 100% |",
        "| invented-numbers | 50% | 100% |",
        "| length | 0% | 100% |",
      ].join("\n"),
    );
    const nothing = summarize([DETAIL[2]!], RUBRIC);
    expect(criteriaTable(nothing)).toBeNull();
    expect(checksTable(nothing)).toBeNull();
  });

  it("compares each criterion and check, flags drops and counts them as regressions", () => {
    const rows = summarize(DETAIL, RUBRIC);
    const deltas = compareRows(rows, olderRows(rows));
    const a = deltas[0]!;
    expect(a.criteria.map((d) => [d.name, d.regression])).toEqual([
      ["keeps_facts", true],
      ["strong_line", false],
      ["useful_asks", false],
    ]);
    expect(a.criteria[0]!.change).toBeCloseTo(-0.5);
    expect(a.checks.find((d) => d.name === "invented-numbers")).toMatchObject({
      before: 0.9,
      after: 0.5,
      regression: true,
    });
    expect(a.checks.find((d) => d.name === "length")).toEqual({
      name: "length",
      before: null,
      after: 0,
      change: null,
      regression: false,
    });
    expect(regressionCount(deltas)).toBe(2);
    expect(regressionCount(deltas, "summary")).toBe(0);
    expect(regressionCount(deltas, "detail")).toBe(2);
    expect(regressionSummary(deltas)).toBe(
      "2 regressions flagged, 2 of them per criterion or per check.",
    );
    expect(criteriaChangeTable(deltas)).toBe(
      [
        "| Model | keeps_facts | strong_line | useful_asks |",
        "|---|---:|---:|---:|",
        "| lab/model-a | 4.00 (-0.50, REGRESSION) | 4.00 (+0.20) | 3.00 (-0.10) |",
        "| lab/model-b | 4.00 (+0.00) | 2.00 (+0.00) | 5.00 (+0.00) |",
      ].join("\n"),
    );
    expect(checksChangeTable(deltas)).toBe(
      [
        "| Check | lab/model-a | lab/model-b |",
        "|---|---:|---:|",
        "| schema | 100% (+0 pts) | 100% (+0 pts) |",
        "| invented-numbers | 50% (-40 pts, REGRESSION) | 100% (+0 pts) |",
        "| length | 0% | 100% (+0 pts) |",
      ].join("\n"),
    );
  });

  it("shows a criterion or check this run lost as unknown, with its older value", () => {
    const rows = summarize(DETAIL, RUBRIC);
    const older = rows.map((row) => ({ ...row, checks: { ...row.checks, "novel-words": 0.8 } }));
    const deltas = compareRows(rows, older);
    expect(deltas[0]!.checks.at(-1)).toMatchObject({ name: "novel-words", after: null });
    expect(checksChangeTable(deltas)).toContain("| novel-words | - (was 80%) | - (was 80%) |");
    expect(regressionCount(deltas)).toBe(0);
  });

  it("reads an older results file without them and treats every criterion and check as unknown", () => {
    const rows = summarize(DETAIL, RUBRIC);
    const stripped = rows.map((row) => {
      const copy: Partial<Row> = { ...row };
      delete copy.criteria;
      delete copy.checks;
      return copy;
    });
    const older = readRows(JSON.parse(JSON.stringify({ version: 1, rows: stripped })));
    expect(older).not.toBeNull();
    expect(older!.map((row) => [row.criteria, row.checks])).toEqual([
      [{}, {}],
      [{}, {}],
    ]);
    const deltas = compareRows(rows, older!);
    const details = deltas.flatMap((delta) => [...delta.criteria, ...delta.checks]);
    expect(details).toHaveLength(12);
    expect(details.every((d) => d.before === null && d.change === null && !d.regression)).toBe(
      true,
    );
    expect(regressionCount(deltas)).toBe(0);
    expect(criteriaChangeTable(deltas)).toBeNull();
    expect(checksChangeTable(deltas)).toBeNull();
    const text = markdownReport(runOf(rows, DETAIL), { dir: "../old", deltas });
    expect(text).toContain("0 regressions flagged.");
    expect(text).toContain(
      "Change per criterion: ../old has no scores per criterion for these models.",
    );
    expect(text).toContain(
      "Change per check: ../old has no pass rates per check for these models.",
    );
  });

  it("puts the tables under each feature, before the per-model notes, and keeps the summary", () => {
    const rows = summarize(DETAIL, RUBRIC);
    const deltas = compareRows(rows, olderRows(rows));
    const text = markdownReport(runOf(rows, DETAIL), { dir: "../older", deltas });
    expect(text).toContain("## Summary");
    expect(text).toContain("| fix | lab/model-a | 3 | 33% | 3.67 | 1.0 s | $0.00100 | 1 | 0 |");
    expect(text).toContain("2 regressions flagged, 2 of them per criterion or per check.");
    const order = [
      "## fix",
      "Judge score per criterion (mean, 1-5):\n\n| Model | keeps_facts | strong_line | useful_asks |",
      "Pass rate per check (share of the outputs the check graded; errors are left out):\n\n| Check | lab/model-a | lab/model-b |",
      "Change per criterion since ../older (a drop of 0.25 or more is a regression):\n\n| Model |",
      "Change per check since ../older (a drop of 5 points or more is a regression):\n\n| Check |",
      "### lab/model-a",
    ].map((part) => text.indexOf(part));
    expect(order.every((at) => at !== -1)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order);
    expect(text).toContain("| invented-numbers | 50% (-40 pts, REGRESSION) | 100% (+0 pts) |");
  });

  it("says so when no case was scored, as with the judge off", () => {
    const unjudged = DETAIL.map((item) => ({ ...item, judge: null }));
    const rows = summarize(unjudged, RUBRIC);
    const text = markdownReport({ ...runOf(rows, unjudged), judge: null }, null);
    expect(text).toContain("Judge score per criterion: no case was scored.");
    expect(text).toContain("| length | 0% | 100% |");
    expect(text).not.toContain("Change per criterion");
  });
});
