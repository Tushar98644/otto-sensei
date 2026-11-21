import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Budget } from "../../../scripts/evals/cost";
import { gradeOutput, runEvals } from "../../../scripts/evals/harness";
import { createMeter } from "../../../scripts/evals/meter";
import { summarize } from "../../../scripts/evals/report";
import type { AnyCase } from "../../../scripts/evals/suite";
import { matchCheckSuite } from "../../../scripts/evals/suites/match-check";

const MODEL = "lab/any-model";
const CASES: [string, AnyCase][] = matchCheckSuite.cases.map((kase) => [kase.id, kase]);

// The match check calls no AI, so its whole eval runs here for free, on the product's real output.
describe("match-check eval on the product's real output", () => {
  const network = vi.fn<typeof fetch>(async () => {
    throw new Error("the match check must not use the network");
  });

  beforeEach(() => {
    vi.stubGlobal("fetch", network);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    network.mockClear();
  });

  it.each(CASES)("%s passes every deterministic grader", async (_id, kase) => {
    const output = await matchCheckSuite.run(kase, MODEL);
    const grades = gradeOutput(matchCheckSuite, output, kase);
    expect(grades.length).toBeGreaterThan(0);
    expect(grades.filter((grade) => !grade.pass)).toEqual([]);
    expect(network).not.toHaveBeenCalled();
  });

  it("reports a 100% pass rate through the harness, with the judge off and nothing spent", async () => {
    const budget = new Budget(0.01);
    const meter = createMeter({
      realFetch: network,
      budget,
      priceOf: () => null,
      fallbackPrice: { prompt: 0, completion: 0 },
    });
    const results = await runEvals({
      suites: [matchCheckSuite],
      models: [MODEL],
      limit: "all",
      judgeModel: null,
      apiKey: "",
      budget,
      meter,
      prices: { product: () => null, judge: null },
      concurrency: 4,
    });

    expect(results.map((result) => result.caseId)).toEqual(CASES.map(([id]) => id));
    expect(results.filter((result) => result.status !== "ok")).toEqual([]);
    const [row] = summarize(results);
    expect(row).toMatchObject({
      feature: "match-check",
      model: MODEL,
      cases: CASES.length,
      errors: 0,
      skipped: 0,
      passRate: 1,
      totalUsd: 0,
    });
    const rates = Object.values(row!.checks);
    expect(rates.length).toBeGreaterThan(0);
    expect(rates.every((rate) => rate === 1)).toBe(true);
    expect(budget.spentUsd).toBe(0);
    expect(network).not.toHaveBeenCalled();
  });
});
