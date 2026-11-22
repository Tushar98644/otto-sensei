import { AIError } from "@/lib/ai/types";
import { resetEnvForTests } from "@/lib/env";
import type { Grade } from "@/lib/evals/graders";
import { BudgetError, tokensOf, usdOf, type Budget, type Price } from "./cost";
import { judge, judgeSystem, judgeUser, JUDGE_REPLY_TOKENS } from "./judge";
import type { CallRecord, Meter } from "./meter";
import type { AnyCase, AnySuite, CallEstimate } from "./suite";

const NAME = /^[a-z][a-z0-9-]*$/;
const CASE_ID = /^[a-z0-9][a-z0-9-]*$/;
const CRITERION_ID = /^[a-z][a-z0-9_]*$/;
const DEFAULT_SYSTEM_TOKENS = 2_000;
const DEFAULT_OUTPUT_TOKENS = 1_500;
const JUDGED_OUTPUT_TOKENS = 1_000;

export type CaseLimit = number | "all";

export type JudgeScore = {
  score: number | null;
  scores: Record<string, number>;
  why: string;
  usd: number;
  error: string | null;
};

export type CaseResult = {
  feature: string;
  model: string;
  caseId: string;
  status: "ok" | "error" | "skipped";
  error: string | null;
  latencyMs: number | null;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  usd: number;
  grades: Grade[];
  judge: JudgeScore | null;
  output: unknown;
};

// modelFor() reads these from the cached env(); the interview's technical round follows AI_MODEL unless AI_INTERVIEW_MODEL is set.
export function switchModel(model: string): () => void {
  const before = {
    AI_MODEL: process.env.AI_MODEL,
    AI_STRUCTURE_MODEL: process.env.AI_STRUCTURE_MODEL,
  };
  process.env.AI_MODEL = model;
  process.env.AI_STRUCTURE_MODEL = model;
  resetEnvForTests();
  return () => {
    for (const [name, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    resetEnvForTests();
  };
}

export function casesOf(suite: AnySuite, limit: CaseLimit): readonly AnyCase[] {
  return limit === "all" ? suite.cases : suite.cases.slice(0, limit);
}

function messageOf(error: unknown): string {
  if (error instanceof AIError) return `${error.code}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

function isGrade(value: Grade | readonly Grade[]): value is Grade {
  return !Array.isArray(value);
}

export function gradeOutput(suite: AnySuite, output: unknown, kase: AnyCase): Grade[] {
  return suite.graders.flatMap((grader, index) => {
    try {
      const graded = grader(output, kase);
      return isGrade(graded) ? [graded] : [...graded];
    } catch (error) {
      return [{ name: `grader-${index + 1}`, pass: false, detail: `threw: ${messageOf(error)}` }];
    }
  });
}

export function validateSuite(suite: AnySuite): string[] {
  const problems: string[] = [];
  if (!NAME.test(suite.name)) problems.push(`name "${suite.name}" must be lowercase-with-dashes`);
  if (!suite.description.trim()) problems.push("description is empty");
  if (suite.cases.length === 0) problems.push("there are no cases");
  if (suite.graders.length === 0) problems.push("there are no deterministic graders");
  const ids = new Set<string>();
  for (const kase of suite.cases) {
    if (!CASE_ID.test(kase.id))
      problems.push(`case "${kase.id}": id must be lowercase-with-dashes`);
    if (ids.has(kase.id)) problems.push(`case "${kase.id}": id is used twice`);
    ids.add(kase.id);
    const parsed = suite.inputSchema?.safeParse(kase.input);
    if (parsed && !parsed.success) {
      const issue = parsed.error.issues[0];
      problems.push(
        `case "${kase.id}": input ${issue?.path.join(".") || "(root)"}: ${issue?.message}`,
      );
    }
  }
  const { rubric } = suite;
  if (!rubric.task.trim()) problems.push("rubric task is empty");
  if (rubric.criteria.length === 0) problems.push("rubric has no criteria");
  const criteria = new Set<string>();
  for (const criterion of rubric.criteria) {
    if (!CRITERION_ID.test(criterion.id)) {
      problems.push(`criterion "${criterion.id}": id must be lowercase_with_underscores`);
    }
    if (criteria.has(criterion.id)) problems.push(`criterion "${criterion.id}" is listed twice`);
    if (!criterion.description.trim())
      problems.push(`criterion "${criterion.id}" has no description`);
    criteria.add(criterion.id);
  }
  if (rubric.scale && ([1, 2, 3, 4, 5] as const).some((level) => !rubric.scale?.[level]?.trim())) {
    problems.push("rubric scale must describe every level from 1 to 5");
  }
  return problems;
}

export function validateRegistry(suites: readonly AnySuite[]): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const suite of suites) {
    if (seen.has(suite.name)) problems.push(`two suites are named "${suite.name}"`);
    seen.add(suite.name);
  }
  return problems;
}

export type DryRunCase = { id: string; grades: Grade[] | null };

export type DryRunSuite = { name: string; problems: string[]; cases: DryRunCase[] };

export function dryRun(suites: readonly AnySuite[], limit: CaseLimit = "all"): DryRunSuite[] {
  return suites.map((suite) => {
    const problems = validateSuite(suite);
    const cases = casesOf(suite, limit).map((kase) => {
      if (kase.golden === undefined) return { id: kase.id, grades: null };
      const grades = gradeOutput(suite, kase.golden, kase);
      for (const grade of grades.filter((item) => !item.pass)) {
        problems.push(`case "${kase.id}": golden fails ${grade.name}: ${grade.detail}`);
      }
      return { id: kase.id, grades };
    });
    return { name: suite.name, problems, cases };
  });
}

const inputText = (suite: AnySuite, kase: AnyCase) =>
  suite.judgeInput?.(kase) ?? JSON.stringify(kase.input, null, 2);

const outputText = (suite: AnySuite, output: unknown, kase: AnyCase) =>
  suite.judgeOutput?.(output, kase) ?? JSON.stringify(output, null, 2);

export function estimateCase(suite: AnySuite, kase: AnyCase): CallEstimate {
  return (
    suite.estimate?.(kase) ?? {
      calls: 1,
      inputTokens: DEFAULT_SYSTEM_TOKENS + tokensOf(JSON.stringify(kase.input)),
      outputTokens: DEFAULT_OUTPUT_TOKENS,
    }
  );
}

export function judgeTokens(suite: AnySuite, kase: AnyCase): CallEstimate {
  const shownOutput =
    kase.golden === undefined
      ? Math.min(estimateCase(suite, kase).outputTokens, JUDGED_OUTPUT_TOKENS)
      : tokensOf(outputText(suite, kase.golden, kase));
  const prompt = judgeSystem(suite.rubric) + judgeUser(inputText(suite, kase), "");
  return {
    calls: 1,
    inputTokens: tokensOf(prompt) + shownOutput,
    outputTokens: JUDGE_REPLY_TOKENS,
  };
}

export type Prices = { product: (model: string) => Price | null; judge: Price | null };

function usdFor(estimate: CallEstimate, price: Price): number {
  return estimate.calls * usdOf(estimate, price);
}

export type Estimate = {
  feature: string;
  model: string;
  cases: number;
  productUsd: number | null;
  judgeUsd: number | null;
};

export function estimateRun(
  suites: readonly AnySuite[],
  models: readonly string[],
  limit: CaseLimit,
  judging: boolean,
  prices: Prices,
): Estimate[] {
  return suites.flatMap((suite) =>
    models.map((model) => {
      const cases = casesOf(suite, limit);
      const price = prices.product(model);
      const sum = (pick: (kase: AnyCase) => number) =>
        cases.reduce((total, kase) => total + pick(kase), 0);
      return {
        feature: suite.name,
        model,
        cases: cases.length,
        productUsd: price ? sum((kase) => usdFor(estimateCase(suite, kase), price)) : null,
        judgeUsd: !judging
          ? 0
          : prices.judge
            ? sum((kase) => usdFor(judgeTokens(suite, kase), prices.judge!))
            : null,
      };
    }),
  );
}

export type RunOptions = {
  suites: readonly AnySuite[];
  models: readonly string[];
  limit: CaseLimit;
  judgeModel: string | null;
  apiKey: string;
  budget: Budget;
  meter: Meter;
  prices: Prices;
  concurrency: number;
  onCase?: (result: CaseResult) => void;
};

async function pool<T, R>(
  items: readonly T[],
  size: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      out[index] = await work(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, worker));
  return out;
}

function totals(calls: readonly CallRecord[]) {
  return {
    calls: calls.length,
    inputTokens: calls.reduce((sum, call) => sum + call.inputTokens, 0),
    outputTokens: calls.reduce((sum, call) => sum + call.outputTokens, 0),
    usd: calls.reduce((sum, call) => sum + call.usd, 0),
  };
}

async function judged(
  options: RunOptions,
  suite: AnySuite,
  kase: AnyCase,
  output: unknown,
): Promise<JudgeScore> {
  const { outcome, calls } = await options.meter.scope(() =>
    judge({
      apiKey: options.apiKey,
      model: options.judgeModel!,
      rubric: suite.rubric,
      input: inputText(suite, kase),
      output: outputText(suite, output, kase),
      hide: options.models,
    }),
  );
  const usd = totals(calls).usd;
  if (outcome.status === "rejected") {
    return { score: null, scores: {}, why: "", usd, error: messageOf(outcome.reason) };
  }
  const { verdict, error } = outcome.value;
  return {
    score: verdict?.score ?? null,
    scores: verdict?.scores ?? {},
    why: verdict?.why ?? "",
    usd,
    error,
  };
}

async function runCase(
  options: RunOptions,
  suite: AnySuite,
  model: string,
  kase: AnyCase,
): Promise<CaseResult> {
  const base = { feature: suite.name, model, caseId: kase.id };
  const empty = { calls: 0, inputTokens: 0, outputTokens: 0, usd: 0 };
  const price = options.prices.product(model);
  const reserved =
    (price ? usdFor(estimateCase(suite, kase), price) : 0) +
    (options.judgeModel && options.prices.judge
      ? usdFor(judgeTokens(suite, kase), options.prices.judge)
      : 0);
  if (!options.budget.reserve(reserved)) {
    return {
      ...base,
      ...empty,
      status: "skipped",
      error: "budget",
      latencyMs: null,
      grades: [],
      judge: null,
      output: null,
    };
  }
  try {
    const started = performance.now();
    const { outcome, calls, refused } = await options.meter.scope(() => suite.run(kase, model));
    const latencyMs = Math.round(performance.now() - started);
    const spent = totals(calls);
    if (outcome.status === "rejected") {
      const budget = refused || outcome.reason instanceof BudgetError;
      return {
        ...base,
        ...spent,
        status: budget ? "skipped" : "error",
        error: budget ? "budget" : messageOf(outcome.reason),
        latencyMs: budget ? null : latencyMs,
        grades: [],
        judge: null,
        output: null,
      };
    }
    const output = outcome.value;
    const grades = gradeOutput(suite, output, kase);
    const score = options.judgeModel ? await judged(options, suite, kase, output) : null;
    return {
      ...base,
      ...spent,
      status: "ok",
      error: null,
      latencyMs,
      grades,
      judge: score,
      output,
    };
  } finally {
    options.budget.release(reserved);
  }
}

// Models run one after another because the product reads its model from the process env.
export async function runEvals(options: RunOptions): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (const suite of options.suites) {
    for (const model of options.models) {
      const restore = switchModel(model);
      try {
        const done = await pool(
          casesOf(suite, options.limit),
          options.concurrency,
          async (kase) => {
            const result = await runCase(options, suite, model, kase);
            options.onCase?.(result);
            return result;
          },
        );
        results.push(...done);
      } finally {
        restore();
      }
    }
  }
  return results;
}
