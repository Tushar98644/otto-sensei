import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODERATION_MODEL } from "@/lib/ai/moderation";
import { env } from "@/lib/env";
import { parseArgs, type CliOptions } from "./args";
import {
  Budget,
  cappedPrice,
  DEFAULT_JUDGE,
  fetchPrices,
  OFFLINE_PRICES,
  UNKNOWN_PRICE,
  type Price,
} from "./cost";
import {
  dryRun,
  estimateRun,
  runEvals,
  validateRegistry,
  type CaseResult,
  type Estimate,
  type Prices,
} from "./harness";
import { createMeter } from "./meter";
import {
  compareRows,
  compareTable,
  markdownReport,
  readRows,
  regressionCount,
  regressionSummary,
  summarize,
  summaryTable,
  type RunFile,
} from "./report";
import type { AnySuite } from "./suite";
import { SUITES } from "./suites";

// Outside the repo, next to it, like scripts/match-eval.ts.
const OUT_ROOT = fileURLToPath(new URL("../../../otto-sensei-evals/", import.meta.url));
// Analytics and error reports must not fire for eval traffic.
const QUIET_ENV = ["NEXT_PUBLIC_POSTHOG_KEY", "SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN"];

const dollars = (value: number | null) => (value === null ? "unknown" : `$${value.toFixed(4)}`);

function pickSuites(options: CliOptions): AnySuite[] {
  if (options.features === "all") return [...SUITES];
  const names = SUITES.map((suite) => suite.name);
  const unknown = options.features.filter((name) => !names.includes(name));
  if (unknown.length > 0) {
    throw new Error(
      `No suite named ${unknown.join(", ")}. Suites: ${names.join(", ") || "(none registered)"}.`,
    );
  }
  return SUITES.filter((suite) => options.features.includes(suite.name));
}

function productPrices(
  options: CliOptions,
  listed: (model: string) => Price | undefined,
): Prices["product"] {
  return (model) => (options.liftPriceCap ? (listed(model) ?? null) : cappedPrice(listed(model)));
}

function printEstimate(estimates: readonly Estimate[], options: CliOptions) {
  console.log("\nEstimated cost of a real run:");
  let total = 0;
  let unknown = false;
  for (const item of estimates) {
    const sum =
      item.productUsd === null || item.judgeUsd === null ? null : item.productUsd + item.judgeUsd;
    if (sum === null) unknown = true;
    else total += sum;
    const judged = options.judge ? `judge ${dollars(item.judgeUsd)}` : "judge off";
    console.log(
      `  ${item.feature} x ${item.model}: ${item.cases} case${item.cases === 1 ? "" : "s"}, product ${dollars(item.productUsd)}, ${judged}`,
    );
  }
  console.log(
    `  Total: about $${total.toFixed(3)}${unknown ? " plus models with no known price" : ""}, capped at $${options.maxUsd.toFixed(2)} by --max-usd.`,
  );
  if (total > options.maxUsd) {
    console.log("  That is over the cap: the run stops when the cap is reached.");
  }
}

function blockNetwork() {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    throw new Error(`--dry-run makes no network calls; something asked for ${url}`);
  }) as typeof fetch;
}

function dry(options: CliOptions, suites: readonly AnySuite[]): number {
  blockNetwork();
  const checked = dryRun(suites, options.cases);
  const problems = validateRegistry(suites);
  for (const problem of problems) console.log(`problem: ${problem}`);
  for (const suite of checked) {
    const goldens = suite.cases.filter((kase) => kase.grades !== null);
    const grades = goldens.flatMap((kase) => kase.grades ?? []);
    const count = suite.cases.length;
    console.log(
      `${suite.name}: ${count} case${count === 1 ? "" : "s"}, ${goldens.length} with a golden output, ${grades.filter((grade) => grade.pass).length}/${grades.length} checks pass on the goldens`,
    );
    for (const problem of suite.problems) console.log(`  problem: ${problem}`);
    problems.push(...suite.problems.map((problem) => `${suite.name}: ${problem}`));
  }
  const listed = (model: string) => OFFLINE_PRICES[model];
  printEstimate(
    estimateRun(suites, options.models, options.cases, options.judge !== null, {
      product: productPrices(options, listed),
      judge: options.judge ? (listed(options.judge) ?? null) : null,
    }),
    options,
  );
  console.log(
    options.liftPriceCap
      ? "  Prices are offline guesses; a real run reads live prices from OpenRouter."
      : "  Product calls are priced at the product's own cap (AI_MAX_PRICE), an upper bound; a real run reads live prices.",
  );
  console.log(problems.length === 0 ? "\nDry run passed." : `\n${problems.length} problem(s).`);
  return problems.length === 0 ? 0 : 1;
}

function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d+Z$/, "Z")
    .replace(/:/g, "-");
}

function readCompare(where: string) {
  const file = where.endsWith(".json") ? where : path.join(where, "results.json");
  if (!existsSync(file)) throw new Error(`No results file at ${file}`);
  const rows = readRows(JSON.parse(readFileSync(file, "utf8")));
  if (!rows) throw new Error(`${file} is not an eval results file`);
  return rows;
}

function progress(result: CaseResult, budget: Budget) {
  const checks = `${result.grades.filter((grade) => grade.pass).length}/${result.grades.length}`;
  const judged =
    result.judge?.score === null || !result.judge ? "-" : result.judge.score.toFixed(1);
  const status =
    result.status === "ok"
      ? `ok ${((result.latencyMs ?? 0) / 1000).toFixed(1)} s, checks ${checks}, judge ${judged}`
      : `${result.status}: ${result.error}`;
  console.log(
    `  ${result.feature} ${result.model} ${result.caseId}: ${status} (spent $${budget.spentUsd.toFixed(3)})`,
  );
}

async function real(options: CliOptions, suites: readonly AnySuite[]): Promise<number> {
  const apiKey = env().OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY isn't set (bun reads it from .env.local).");
  for (const name of QUIET_ENV) delete process.env[name];
  const compareWith = options.compare ? readCompare(options.compare) : null;

  const wanted = [...options.models, ...(options.judge ? [options.judge] : []), MODERATION_MODEL];
  const live = await fetchPrices(wanted);
  const listed = (model: string) => live.get(model);
  const prices: Prices = {
    product: productPrices(options, listed),
    judge: options.judge ? (listed(options.judge) ?? null) : null,
  };
  const unpriced = [
    ...options.models.filter((model) => !prices.product(model)),
    ...(options.judge && !prices.judge ? [options.judge] : []),
  ];
  if (unpriced.length > 0) {
    throw new Error(`OpenRouter lists no price for ${unpriced.join(", ")}: check the model ids.`);
  }
  printEstimate(
    estimateRun(suites, options.models, options.cases, options.judge !== null, prices),
    options,
  );

  const budget = new Budget(options.maxUsd);
  const realFetch = globalThis.fetch;
  const meter = createMeter({
    realFetch,
    budget,
    priceOf: (model) => live.get(model) ?? null,
    fallbackPrice: UNKNOWN_PRICE,
    liftPriceCap: options.liftPriceCap,
  });
  const info = console.info;
  if (!options.verbose) console.info = () => {};
  globalThis.fetch = meter.fetch;
  const startedAt = new Date();
  console.log("\nRunning:");
  let results: CaseResult[];
  try {
    results = await runEvals({
      suites,
      models: options.models,
      limit: options.cases,
      judgeModel: options.judge,
      apiKey,
      budget,
      meter,
      prices,
      concurrency: options.concurrency,
      onCase: (result) => progress(result, budget),
    });
  } finally {
    globalThis.fetch = realFetch;
    console.info = info;
  }

  const rows = summarize(
    results,
    Object.fromEntries(
      suites.map((suite) => [suite.name, suite.rubric.criteria.map((criterion) => criterion.id)]),
    ),
  );
  const run: RunFile = {
    version: 1,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    judge: options.judge,
    maxUsd: options.maxUsd,
    spentUsd: budget.spentUsd,
    stoppedByBudget: budget.stopped || results.some((result) => result.status === "skipped"),
    options: {
      features: suites.map((suite) => suite.name),
      models: options.models,
      cases: options.cases,
      liftPriceCap: options.liftPriceCap,
    },
    rows,
    results,
  };
  const deltas = compareWith ? compareRows(rows, compareWith) : null;
  const dir = path.join(OUT_ROOT, stamp(startedAt));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "results.json"), `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(
    path.join(dir, "report.md"),
    markdownReport(run, deltas && options.compare ? { dir: options.compare, deltas } : null),
  );

  console.log(`\n${summaryTable(rows)}`);
  if (deltas) {
    console.log(`\nCompared with ${options.compare}: ${regressionSummary(deltas)}`);
    console.log(compareTable(deltas));
  }
  console.log(`\nSpent $${budget.spentUsd.toFixed(4)}. Saved ${dir}/results.json and report.md.`);
  return deltas && regressionCount(deltas) > 0 ? 2 : 0;
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2), { model: env().AI_MODEL, judge: DEFAULT_JUDGE });
  if (!parsed.ok) {
    console.error(parsed.error);
    return process.argv.includes("--help") || process.argv.includes("-h") ? 0 : 1;
  }
  const suites = pickSuites(parsed.options);
  if (suites.length === 0)
    throw new Error("No suites are registered in scripts/evals/suites/index.ts.");
  return parsed.options.dryRun ? dry(parsed.options, suites) : real(parsed.options, suites);
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
