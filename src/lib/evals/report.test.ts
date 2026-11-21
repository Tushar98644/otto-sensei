import { describe, expect, it } from "vitest";
import type { CaseResult } from "../../../scripts/evals/harness";
import {
  compareRows,
  markdownReport,
  median,
  readRows,
  reasonsFor,
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
