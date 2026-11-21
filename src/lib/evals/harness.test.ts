import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { modelFor, runStructured } from "@/lib/ai/client";
import { resetEnvForTests } from "@/lib/env";
import { Budget, type Price } from "../../../scripts/evals/cost";
import {
  dryRun,
  estimateRun,
  runEvals,
  switchModel,
  validateRegistry,
  validateSuite,
  type RunOptions,
} from "../../../scripts/evals/harness";
import { createMeter } from "../../../scripts/evals/meter";
import { defineSuite, type EvalSuite } from "../../../scripts/evals/suite";

const JUDGE = "lab/judge-1";
const PRICE: Price = { prompt: 1, completion: 1 };
const Answer = z.object({ answer: z.string() });

type Input = { text: string };
type Output = z.infer<typeof Answer>;

function echoSuite(overrides: Partial<EvalSuite<Input, Output>> = {}) {
  return defineSuite<Input, Output>({
    name: "echo",
    description: "Repeats the text.",
    inputSchema: z.object({ text: z.string().min(1) }),
    cases: [
      { id: "one", input: { text: "hello" }, golden: { answer: "hello" } },
      { id: "two", input: { text: "world" } },
    ],
    run: (kase) =>
      runStructured({
        task: "fix",
        system: "Repeat the text.",
        user: kase.input.text,
        schema: Answer,
        effort: "low",
      }),
    graders: [
      (output, kase) => ({
        name: "same-text",
        pass: output.answer === kase.input.text,
        detail: output.answer,
      }),
    ],
    rubric: { task: "Repeat the text.", criteria: [{ id: "faithful", description: "Same text." }] },
    estimate: () => ({ calls: 1, inputTokens: 100, outputTokens: 100 }),
    ...overrides,
  });
}

type Sent = { model: string; messages: { role: string; content: unknown }[] };

function fakeOpenRouter(answer: (user: string, model: string) => string) {
  const sent: Sent[] = [];
  const realFetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Sent;
    sent.push(body);
    const user = String(body.messages.at(-1)?.content ?? "");
    const content =
      body.model === JUDGE
        ? '{"scores": {"faithful": 4}, "why": "Close."}'
        : JSON.stringify({ answer: answer(user, body.model) });
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content } }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 10,
        cost: body.model === JUDGE ? 0.001 : 0.002,
      },
    });
  });
  return { realFetch, sent };
}

function options(realFetch: typeof fetch, overrides: Partial<RunOptions> = {}): RunOptions {
  const budget = overrides.budget ?? new Budget(1);
  const meter = createMeter({ realFetch, budget, priceOf: () => PRICE, fallbackPrice: PRICE });
  vi.stubGlobal("fetch", meter.fetch);
  return {
    suites: [echoSuite()],
    models: ["lab/model-a", "lab/model-b"],
    limit: "all",
    judgeModel: JUDGE,
    apiKey: "test-key",
    budget,
    meter,
    prices: { product: () => PRICE, judge: PRICE },
    concurrency: 2,
    ...overrides,
  };
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  resetEnvForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY;
  resetEnvForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("switchModel", () => {
  it("points every task at the model, then puts the env back", () => {
    const before = { model: modelFor("fix"), env: process.env.AI_MODEL };
    const restore = switchModel("lab/model-a");
    expect(modelFor("fix")).toBe("lab/model-a");
    expect(modelFor("structure")).toBe("lab/model-a");
    restore();
    expect(modelFor("fix")).toBe(before.model);
    expect(process.env.AI_MODEL).toBe(before.env);
  });
});

describe("validateSuite", () => {
  it("accepts a well-formed suite", () => {
    expect(validateSuite(echoSuite())).toEqual([]);
  });

  it("names every problem", () => {
    const suite = echoSuite({
      name: "Echo Suite",
      cases: [
        { id: "one", input: { text: "" } },
        { id: "one", input: { text: "again" } },
      ],
      graders: [],
      rubric: {
        task: "",
        criteria: [
          { id: "Bad Id", description: "" },
          { id: "same", description: "a" },
          { id: "same", description: "b" },
        ],
        scale: { 1: "a", 2: "b", 3: "", 4: "d", 5: "e" },
      },
    });
    const problems = validateSuite(suite).join("\n");
    for (const expected of [
      'name "Echo Suite"',
      "no deterministic graders",
      'case "one": input text:',
      'case "one": id is used twice',
      "rubric task is empty",
      'criterion "Bad Id": id must be',
      'criterion "Bad Id" has no description',
      'criterion "same" is listed twice',
      "every level from 1 to 5",
    ]) {
      expect(problems).toContain(expected);
    }
  });

  it("flags two suites with one name", () => {
    expect(validateRegistry([echoSuite(), echoSuite()])).toEqual(['two suites are named "echo"']);
  });
});

describe("dryRun", () => {
  it("grades goldens offline and reports a golden that fails", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const [good] = dryRun([echoSuite()]);
    expect(good).toEqual({
      name: "echo",
      problems: [],
      cases: [
        { id: "one", grades: [{ name: "same-text", pass: true, detail: "hello" }] },
        { id: "two", grades: null },
      ],
    });
    const broken = echoSuite({
      cases: [{ id: "bad", input: { text: "hi" }, golden: { answer: "bye" } }],
      graders: [
        () => ({ name: "always", pass: true, detail: "" }),
        (output, kase) => [
          { name: "same-text", pass: output.answer === kase.input.text, detail: "differs" },
        ],
        () => {
          throw new Error("oops");
        },
      ],
    });
    expect(dryRun([broken])[0]!.problems).toEqual([
      'case "bad": golden fails same-text: differs',
      'case "bad": golden fails grader-3: threw: oops',
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("estimateRun", () => {
  it("prices every case for the product and the judge, and leaves unknown prices open", () => {
    const [known, unknown] = estimateRun([echoSuite()], ["lab/model-a", "lab/new"], 1, true, {
      product: (model) => (model === "lab/new" ? null : PRICE),
      judge: PRICE,
    });
    expect(known).toMatchObject({ feature: "echo", model: "lab/model-a", cases: 1 });
    expect(known!.productUsd).toBeCloseTo(0.0002, 8);
    expect(known!.judgeUsd).toBeGreaterThan(0);
    expect(unknown!.productUsd).toBeNull();
    const [unjudged] = estimateRun([echoSuite()], ["lab/model-a"], "all", false, {
      product: () => PRICE,
      judge: null,
    });
    expect(unjudged!.judgeUsd).toBe(0);
  });
});

describe("runEvals", () => {
  it("runs the real product call on each model, grades it and judges it blind", async () => {
    const { realFetch, sent } = fakeOpenRouter((user, model) =>
      model === "lab/model-b" && user === "world" ? "wrld" : user,
    );
    const run = options(realFetch as typeof fetch);
    const results = await runEvals(run);

    expect(results.map((r) => `${r.model} ${r.caseId} ${r.status}`)).toEqual([
      "lab/model-a one ok",
      "lab/model-a two ok",
      "lab/model-b one ok",
      "lab/model-b two ok",
    ]);
    const productModels = sent.filter((body) => body.model !== JUDGE).map((body) => body.model);
    expect(productModels.sort()).toEqual([
      "lab/model-a",
      "lab/model-a",
      "lab/model-b",
      "lab/model-b",
    ]);
    const judged = sent.filter((body) => body.model === JUDGE).map((body) => JSON.stringify(body));
    expect(judged).toHaveLength(4);
    for (const body of judged) expect(body).not.toMatch(/model-a|model-b/);

    const wrong = results.find((r) => r.model === "lab/model-b" && r.caseId === "two")!;
    expect(wrong.grades).toEqual([{ name: "same-text", pass: false, detail: "wrld" }]);
    expect(wrong).toMatchObject({ calls: 1, inputTokens: 50, outputTokens: 10, usd: 0.002 });
    expect(wrong.judge).toEqual({
      score: 4,
      scores: { faithful: 4 },
      why: "Close.",
      usd: 0.001,
      error: null,
    });
    expect(run.budget.spentUsd).toBeCloseTo(4 * 0.003);
    expect(modelFor("fix")).not.toMatch(/lab\//);
  });

  it("records product errors without judging them", async () => {
    const realFetch = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "{}" } }] }),
    );
    const results = await runEvals(
      options(realFetch as typeof fetch, { models: ["lab/model-a"], judgeModel: null }),
    );
    expect(results[0]).toMatchObject({ status: "error", judge: null, grades: [] });
    expect(results[0]!.error).toContain("invalid_output");
  });

  it("skips cases the budget can't cover, without calling anyone", async () => {
    const { realFetch } = fakeOpenRouter((user) => user);
    const results = await runEvals(
      options(realFetch as typeof fetch, { budget: new Budget(0.0001), models: ["lab/model-a"] }),
    );
    expect(results.map((r) => r.status)).toEqual(["skipped", "skipped"]);
    expect(results[0]!.error).toBe("budget");
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("counts a case as skipped when the product hides the budget stop behind its own failure", async () => {
    const { realFetch } = fakeOpenRouter((user) => user);
    const budget = new Budget(1);
    const fallsBack = echoSuite({
      cases: [{ id: "one", input: { text: "hello" } }],
      run: async (kase) => {
        budget.add(1);
        try {
          return await runStructured({
            task: "fix",
            system: "Repeat the text.",
            user: kase.input.text,
            schema: Answer,
            effort: "low",
          });
        } catch {
          throw new Error("fell back to the rule-based read");
        }
      },
    });
    const results = await runEvals(
      options(realFetch as typeof fetch, {
        budget,
        suites: [fallsBack],
        models: ["lab/model-a"],
        judgeModel: null,
      }),
    );
    expect(results[0]).toMatchObject({ status: "skipped", error: "budget", latencyMs: null });
    expect(realFetch).not.toHaveBeenCalled();
  });

  it("stops mid-run once actual spending reaches the cap", async () => {
    const { realFetch } = fakeOpenRouter((user) => user);
    const budget = new Budget(0.0045);
    const results = await runEvals(
      options(realFetch as typeof fetch, {
        budget,
        concurrency: 1,
        models: ["lab/model-a"],
        prices: { product: () => ({ prompt: 0, completion: 0 }), judge: null },
      }),
    );
    expect(results.map((r) => r.status)).toEqual(["ok", "ok"]);
    expect(results[1]!.judge?.error).toBe("budget");
    expect(budget.spentUsd).toBeLessThan(0.0045 + 0.003);
  });
});
