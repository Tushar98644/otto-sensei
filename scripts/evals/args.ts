import type { CaseLimit } from "./harness";

export type CliOptions = {
  features: string[] | "all";
  models: string[];
  cases: CaseLimit;
  judge: string | null;
  maxUsd: number;
  dryRun: boolean;
  compare: string | null;
  out: string | null;
  concurrency: number;
  liftPriceCap: boolean;
  verbose: boolean;
};

export type Parsed = { ok: true; options: CliOptions } | { ok: false; error: string };

export const USAGE = `Usage: bun scripts/evals/run.ts [options]
  --feature <name|all>     a suite name, a comma list, or all (default all)
  --models <ids>           comma list of OpenRouter model ids (default AI_MODEL)
  --cases <n|all>          the first n cases of each suite (default all)
  --judge <id|none>        judge model (default the match-eval judge); none skips judging
  --max-usd <usd>          hard spending cap for the whole run (default 2)
  --dry-run                check cases and graders offline and print the cost estimate
  --compare <dir>          an older results folder (or its results.json) to compare with
  --out <dir>              write results.json and report.md into this folder (default ../otto-sensei-evals/<timestamp>)
  --concurrency <n>        cases run at once per model (default 4)
  --lift-price-cap         drop the product's provider.max_price so pricier models can answer
  --verbose                keep the product's info logs`;

const VALUE_FLAGS = new Set([
  "--feature",
  "--models",
  "--cases",
  "--judge",
  "--max-usd",
  "--compare",
  "--out",
  "--concurrency",
]);
const SWITCHES = new Set(["--dry-run", "--lift-price-cap", "--verbose"]);

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function parseArgs(
  argv: readonly string[],
  defaults: { model: string; judge: string },
): Parsed {
  const values = new Map<string, string>();
  const switches = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const [flag, inline] = arg.includes("=")
      ? [arg.slice(0, arg.indexOf("=")), arg.slice(arg.indexOf("=") + 1)]
      : [arg, undefined];
    if (flag === "--help" || flag === "-h") return { ok: false, error: USAGE };
    if (SWITCHES.has(flag) && inline === undefined) {
      switches.add(flag);
      continue;
    }
    if (!VALUE_FLAGS.has(flag)) return { ok: false, error: `Unknown option ${arg}\n\n${USAGE}` };
    const value = inline ?? argv[++i];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, error: `${flag} needs a value\n\n${USAGE}` };
    }
    values.set(flag, value);
  }

  const feature = values.get("--feature") ?? "all";
  const features = feature === "all" ? "all" : list(feature);
  if (features !== "all" && features.length === 0) {
    return { ok: false, error: "--feature is empty" };
  }

  const models = list(values.get("--models") ?? defaults.model);
  if (models.length === 0) return { ok: false, error: "--models is empty" };

  const casesText = values.get("--cases") ?? "all";
  const cases = casesText === "all" ? "all" : Number(casesText);
  if (cases !== "all" && !(Number.isInteger(cases) && cases > 0)) {
    return { ok: false, error: "--cases must be a whole number above 0, or all" };
  }

  const maxUsd = Number(values.get("--max-usd") ?? 2);
  if (!(Number.isFinite(maxUsd) && maxUsd > 0)) {
    return { ok: false, error: "--max-usd must be a number of dollars above 0" };
  }

  const concurrency = Number(values.get("--concurrency") ?? 4);
  if (!(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 16)) {
    return { ok: false, error: "--concurrency must be a whole number from 1 to 16" };
  }

  const judge = values.get("--judge") ?? defaults.judge;
  return {
    ok: true,
    options: {
      features,
      models: [...new Set(models)],
      cases,
      judge: judge === "none" ? null : judge,
      maxUsd,
      dryRun: switches.has("--dry-run"),
      compare: values.get("--compare") ?? null,
      out: values.get("--out") ?? null,
      concurrency,
      liftPriceCap: switches.has("--lift-price-cap"),
      verbose: switches.has("--verbose"),
    },
  };
}
