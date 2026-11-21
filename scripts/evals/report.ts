import { z } from "zod";
import type { CaseResult } from "./harness";

const WORST = 5;
const SHOWN_REASONS = 4;

export type Row = {
  feature: string;
  model: string;
  cases: number;
  errors: number;
  skipped: number;
  passRate: number | null;
  judgeMean: number | null;
  judged: number;
  p50LatencyMs: number | null;
  usdPerCall: number | null;
  totalUsd: number;
  criteria: Record<string, number | null>;
  // Over the cases with an output that this check graded, so errors are left out.
  checks: Record<string, number>;
};

export type CriteriaByFeature = Readonly<Record<string, readonly string[]>>;

export type RunFile = {
  version: 1;
  startedAt: string;
  finishedAt: string;
  judge: string | null;
  maxUsd: number;
  spentUsd: number;
  stoppedByBudget: boolean;
  options: { features: string[]; models: string[]; cases: number | "all"; liftPriceCap: boolean };
  rows: Row[];
  results: CaseResult[];
};

export type Metric = "passRate" | "judgeMean" | "p50LatencyMs" | "usdPerCall";

type Change = {
  before: number | null;
  after: number | null;
  change: number | null;
  regression: boolean;
};

export type MetricDelta = Change & { metric: Metric };

export type ScoreDelta = Change & { name: string };

export type RowDelta = {
  feature: string;
  model: string;
  status: "both" | "new" | "gone";
  metrics: MetricDelta[];
  criteria: ScoreDelta[];
  checks: ScoreDelta[];
};

const UNKNOWN: Change = { before: null, after: null, change: null, regression: false };

const METRICS: readonly Metric[] = ["passRate", "judgeMean", "p50LatencyMs", "usdPerCall"];

// A change at least this bad is flagged: pass rate in points of 1, judge on the 1-5 scale, the rest relative.
const REGRESSION = {
  passRate: 0.05,
  judgeMean: 0.25,
  p50LatencyMs: 0.25,
  usdPerCall: 0.25,
} as const;
// Latency must also rise by this much, so a few milliseconds of noise on a fast feature isn't flagged.
const LATENCY_FLOOR_MS = 250;

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

const mean = (values: readonly number[]) =>
  values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;

const passed = (result: CaseResult) =>
  result.status === "ok" && result.grades.every((grade) => grade.pass);

function groups(results: readonly CaseResult[]): CaseResult[][] {
  const byKey = new Map<string, CaseResult[]>();
  for (const result of results) {
    const key = `${result.feature}\u0000${result.model}`;
    byKey.set(key, [...(byKey.get(key) ?? []), result]);
  }
  return [...byKey.values()];
}

function criterionMeans(
  ok: readonly CaseResult[],
  ids: readonly string[],
): Record<string, number | null> {
  const scored = ok.map((result) => result.judge?.scores ?? {});
  const names = new Set([...ids, ...scored.flatMap((scores) => Object.keys(scores))]);
  return Object.fromEntries(
    [...names].map((name) => [name, mean(scored.flatMap((scores) => scores[name] ?? []))]),
  );
}

// A check that grades one output more than once passes only if every grade of that name passed.
function checkRates(ok: readonly CaseResult[]): Record<string, number> {
  const tally = new Map<string, { passed: number; graded: number }>();
  for (const result of ok) {
    const byName = new Map<string, boolean>();
    for (const grade of result.grades) {
      byName.set(grade.name, (byName.get(grade.name) ?? true) && grade.pass);
    }
    for (const [name, pass] of byName) {
      const count = tally.get(name) ?? { passed: 0, graded: 0 };
      tally.set(name, { passed: count.passed + (pass ? 1 : 0), graded: count.graded + 1 });
    }
  }
  return Object.fromEntries([...tally].map(([name, count]) => [name, count.passed / count.graded]));
}

export function summarize(results: readonly CaseResult[], criteria: CriteriaByFeature = {}): Row[] {
  return groups(results).map((group) => {
    const ran = group.filter((result) => result.status !== "skipped");
    const ok = ran.filter((result) => result.status === "ok");
    const scores = ok.flatMap((result) =>
      result.judge?.score === null || result.judge?.score === undefined ? [] : [result.judge.score],
    );
    const productUsd = ran.reduce((sum, result) => sum + result.usd, 0);
    const judgeUsd = group.reduce((sum, result) => sum + (result.judge?.usd ?? 0), 0);
    return {
      feature: group[0]!.feature,
      model: group[0]!.model,
      cases: ran.length,
      errors: ran.length - ok.length,
      skipped: group.length - ran.length,
      passRate: ran.length === 0 ? null : ran.filter(passed).length / ran.length,
      judgeMean: mean(scores),
      judged: scores.length,
      p50LatencyMs: median(ok.flatMap((result) => result.latencyMs ?? [])),
      usdPerCall: ran.length === 0 ? null : productUsd / ran.length,
      totalUsd: productUsd + judgeUsd,
      criteria: criterionMeans(ok, criteria[group[0]!.feature] ?? []),
      checks: checkRates(ok),
    };
  });
}

export function reasonsFor(result: CaseResult): string[] {
  if (result.status === "skipped") return [];
  const reasons: string[] = [];
  if (result.error) reasons.push(`error: ${result.error}`);
  for (const grade of result.grades)
    if (!grade.pass) reasons.push(`${grade.name}: ${grade.detail}`);
  if (result.judge?.score !== null && result.judge?.score !== undefined) {
    reasons.push(
      `judge ${result.judge.score.toFixed(1)}/5: ${result.judge.why || "no reason given"}`,
    );
  } else if (result.judge?.error) {
    reasons.push(`judge failed: ${result.judge.error}`);
  }
  return reasons;
}

function badness(result: CaseResult): number {
  const failed = result.grades.filter((grade) => !grade.pass).length;
  const score = result.judge?.score ?? 5;
  return (result.status === "error" ? 1_000 : 0) + failed * 100 + (5 - score) * 10;
}

export function worstCases(
  results: readonly CaseResult[],
  limit = WORST,
): { caseId: string; reasons: string[] }[] {
  return results
    .filter((result) => result.status !== "skipped" && badness(result) > 0)
    .sort((a, b) => badness(b) - badness(a))
    .slice(0, limit)
    .map((result) => ({ caseId: result.caseId, reasons: reasonsFor(result) }));
}

function isRegression(metric: Metric, before: number, after: number): boolean {
  const limit = REGRESSION[metric];
  if (metric === "passRate" || metric === "judgeMean") return before - after >= limit - 1e-9;
  if (metric === "p50LatencyMs" && after - before < LATENCY_FLOOR_MS) return false;
  return before > 0 && (after - before) / before >= limit - 1e-9;
}

function changeOf(
  metric: Metric,
  before: number | null = null,
  after: number | null = null,
): Change {
  const both = before !== null && after !== null;
  return {
    before,
    after,
    change: both ? after - before : null,
    regression: both && isRegression(metric, before, after),
  };
}

function scoreDeltas(
  metric: Metric,
  before: Readonly<Record<string, number | null>>,
  after: Readonly<Record<string, number | null>>,
): ScoreDelta[] {
  const names = new Set([...Object.keys(after), ...Object.keys(before)]);
  return [...names].map((name) => ({ name, ...changeOf(metric, before[name], after[name]) }));
}

export function compareRows(current: readonly Row[], previous: readonly Row[]): RowDelta[] {
  const key = (row: Row) => `${row.feature}\u0000${row.model}`;
  const old = new Map(previous.map((row) => [key(row), row]));
  const now = new Map(current.map((row) => [key(row), row]));
  const unmatched = (row: Row, status: "new" | "gone"): RowDelta => ({
    feature: row.feature,
    model: row.model,
    status,
    metrics: [],
    criteria: [],
    checks: [],
  });
  const deltas: RowDelta[] = current.map((row) => {
    const before = old.get(key(row));
    if (!before) return unmatched(row, "new");
    return {
      feature: row.feature,
      model: row.model,
      status: "both",
      metrics: METRICS.map((metric) => ({
        metric,
        ...changeOf(metric, before[metric], row[metric]),
      })),
      criteria: scoreDeltas("judgeMean", before.criteria, row.criteria),
      checks: scoreDeltas("passRate", before.checks, row.checks),
    };
  });
  for (const row of previous) if (!now.has(key(row))) deltas.push(unmatched(row, "gone"));
  return deltas;
}

const RowSchema = z.object({
  feature: z.string(),
  model: z.string(),
  cases: z.number(),
  errors: z.number(),
  skipped: z.number(),
  passRate: z.number().nullable(),
  judgeMean: z.number().nullable(),
  judged: z.number(),
  p50LatencyMs: z.number().nullable(),
  usdPerCall: z.number().nullable(),
  totalUsd: z.number(),
  // Older results files have neither, so every criterion and check reads as unknown there.
  criteria: z.record(z.string(), z.number().nullable()).default({}),
  checks: z.record(z.string(), z.number()).default({}),
});

export function readRows(json: unknown): Row[] | null {
  const parsed = z.object({ rows: z.array(RowSchema) }).safeParse(json);
  return parsed.success ? parsed.data.rows : null;
}

const percent = (value: number | null) => (value === null ? "-" : `${Math.round(value * 100)}%`);
const score = (value: number | null) => (value === null ? "-" : value.toFixed(2));
const seconds = (ms: number | null) => (ms === null ? "-" : `${(ms / 1000).toFixed(1)} s`);
const usd = (value: number | null) =>
  value === null ? "-" : `$${value < 0.01 ? value.toFixed(5) : value.toFixed(3)}`;
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s+/g, " ");

const FORMAT: Record<Metric, (value: number | null) => string> = {
  passRate: percent,
  judgeMean: score,
  p50LatencyMs: seconds,
  usdPerCall: usd,
};

function changeText(delta: Change, metric: Metric): string {
  if (delta.after === null && delta.before !== null)
    return `- (was ${FORMAT[metric](delta.before)})`;
  if (delta.change === null || delta.before === null) return FORMAT[metric](delta.after);
  const { change, before } = delta;
  const shown =
    metric === "passRate"
      ? `${change >= 0 ? "+" : ""}${Math.round(change * 100)} pts`
      : metric === "judgeMean"
        ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}`
        : before === 0
          ? "n/a"
          : `${change >= 0 ? "+" : ""}${Math.round((change / before) * 100)}%`;
  return `${FORMAT[metric](delta.after)} (${shown}${delta.regression ? ", REGRESSION" : ""})`;
}

const namesOf = (records: readonly Readonly<Record<string, unknown>>[]) => [
  ...new Set(records.flatMap((record) => Object.keys(record))),
];

const header = (first: string, columns: readonly string[]) => [
  `| ${[first, ...columns].map(cell).join(" | ")} |`,
  `|---|${columns.map(() => "---:").join("|")}|`,
];

const known = (values: readonly (number | null | undefined)[]) =>
  values.some((value) => value !== null && value !== undefined);

export function criteriaTable(rows: readonly Row[]): string | null {
  const names = namesOf(rows.map((row) => row.criteria));
  if (!known(rows.flatMap((row) => Object.values(row.criteria)))) return null;
  return [
    ...header("Model", names),
    ...rows.map(
      (row) =>
        `| ${cell(row.model)} | ${names.map((name) => score(row.criteria[name] ?? null)).join(" | ")} |`,
    ),
  ].join("\n");
}

export function checksTable(rows: readonly Row[]): string | null {
  const names = namesOf(rows.map((row) => row.checks));
  if (names.length === 0) return null;
  return [
    ...header(
      "Check",
      rows.map((row) => row.model),
    ),
    ...names.map(
      (name) =>
        `| ${cell(name)} | ${rows.map((row) => percent(row.checks[name] ?? null)).join(" | ")} |`,
    ),
  ].join("\n");
}

const deltaFor = (deltas: readonly ScoreDelta[], name: string): Change =>
  deltas.find((delta) => delta.name === name) ?? UNKNOWN;

export function criteriaChangeTable(deltas: readonly RowDelta[]): string | null {
  const both = deltas.filter((delta) => delta.status === "both");
  const names = [...new Set(both.flatMap((delta) => delta.criteria.map((item) => item.name)))];
  if (!known(both.flatMap((delta) => delta.criteria.map((item) => item.before)))) return null;
  return [
    ...header("Model", names),
    ...both.map(
      (delta) =>
        `| ${cell(delta.model)} | ${names.map((name) => changeText(deltaFor(delta.criteria, name), "judgeMean")).join(" | ")} |`,
    ),
  ].join("\n");
}

export function checksChangeTable(deltas: readonly RowDelta[]): string | null {
  const both = deltas.filter((delta) => delta.status === "both");
  const names = [...new Set(both.flatMap((delta) => delta.checks.map((item) => item.name)))];
  if (!known(both.flatMap((delta) => delta.checks.map((item) => item.before)))) return null;
  return [
    ...header(
      "Check",
      both.map((delta) => delta.model),
    ),
    ...names.map(
      (name) =>
        `| ${cell(name)} | ${both.map((delta) => changeText(deltaFor(delta.checks, name), "passRate")).join(" | ")} |`,
    ),
  ].join("\n");
}

export function summaryTable(rows: readonly Row[]): string {
  const lines = [
    "| Feature | Model | Cases | Pass rate | Judge (1-5) | p50 latency | Cost per call | Errors | Skipped |",
    "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ...rows.map(
      (row) =>
        `| ${row.feature} | ${row.model} | ${row.cases} | ${percent(row.passRate)} | ${score(row.judgeMean)} | ${seconds(row.p50LatencyMs)} | ${usd(row.usdPerCall)} | ${row.errors} | ${row.skipped} |`,
    ),
  ];
  return lines.join("\n");
}

export function compareTable(deltas: readonly RowDelta[]): string {
  const lines = [
    "| Feature | Model | Pass rate | Judge (1-5) | p50 latency | Cost per call |",
    "|---|---|---:|---:|---:|---:|",
  ];
  for (const delta of deltas) {
    if (delta.status !== "both") {
      lines.push(
        `| ${delta.feature} | ${delta.model} | ${delta.status === "new" ? "new in this run" : "only in the older run"} | | | |`,
      );
      continue;
    }
    lines.push(
      `| ${delta.feature} | ${delta.model} | ${delta.metrics.map((m) => changeText(m, m.metric)).join(" | ")} |`,
    );
  }
  return lines.join("\n");
}

const flaggedIn = (changes: readonly Change[]) => changes.filter((item) => item.regression).length;

// "detail" counts the per-criterion and per-check changes, "summary" the summary table's.
export function regressionCount(
  deltas: readonly RowDelta[],
  scope: "all" | "summary" | "detail" = "all",
): number {
  return deltas.reduce((sum, delta) => {
    const summary = scope === "detail" ? 0 : flaggedIn(delta.metrics);
    const detail = scope === "summary" ? 0 : flaggedIn([...delta.criteria, ...delta.checks]);
    return sum + summary + detail;
  }, 0);
}

export function regressionSummary(deltas: readonly RowDelta[]): string {
  const total = regressionCount(deltas);
  const detail = regressionCount(deltas, "detail");
  const where = detail > 0 ? `, ${detail} of them per criterion or per check` : "";
  return `${total} regression${total === 1 ? "" : "s"} flagged${where}.`;
}

function featureTables(
  rows: readonly Row[],
  compared: { dir: string; deltas: readonly RowDelta[] } | null,
): string[] {
  const criteria = criteriaTable(rows);
  const checks = checksTable(rows);
  const parts = [
    criteria
      ? `Judge score per criterion (mean, 1-5):\n\n${criteria}`
      : "Judge score per criterion: no case was scored.",
    checks
      ? `Pass rate per check (share of the outputs the check graded; errors are left out):\n\n${checks}`
      : "Pass rate per check: no output was graded.",
  ];
  if (!compared) return parts;
  const criteriaChange = criteriaChangeTable(compared.deltas);
  const checksChange = checksChangeTable(compared.deltas);
  parts.push(
    criteriaChange
      ? `Change per criterion since ${compared.dir} (a drop of ${REGRESSION.judgeMean} or more is a regression):\n\n${criteriaChange}`
      : `Change per criterion: ${compared.dir} has no scores per criterion for these models.`,
    checksChange
      ? `Change per check since ${compared.dir} (a drop of ${Math.round(REGRESSION.passRate * 100)} points or more is a regression):\n\n${checksChange}`
      : `Change per check: ${compared.dir} has no pass rates per check for these models.`,
  );
  return parts;
}

export function markdownReport(
  run: RunFile,
  compared: { dir: string; deltas: RowDelta[] } | null,
): string {
  const parts = [
    `# Otto evals, ${run.startedAt}`,
    [
      `Judge: ${run.judge ? `${run.judge} (blind: it never sees the model name)` : "off"}.`,
      `Spent ${usd(run.spentUsd)} of $${run.maxUsd.toFixed(2)}.`,
      run.stoppedByBudget ? "Stopped at the --max-usd cap: some cases were skipped." : "",
      run.options.liftPriceCap ? "The product's price cap was lifted for this run." : "",
    ]
      .filter(Boolean)
      .join(" "),
    "Pass rate: share of cases where every deterministic check passed (errors count as fails). Cost per call: product spend per case, judge excluded.",
    "## Summary",
    summaryTable(run.rows),
  ];
  if (compared) {
    parts.push(
      `## Compared with ${compared.dir}`,
      regressionSummary(compared.deltas),
      compareTable(compared.deltas),
    );
  }
  for (const feature of [...new Set(run.rows.map((row) => row.feature))]) {
    const rows = run.rows.filter((item) => item.feature === feature);
    const deltas = compared?.deltas.filter((delta) => delta.feature === feature) ?? [];
    parts.push(
      `## ${feature}`,
      ...featureTables(rows, compared ? { dir: compared.dir, deltas } : null),
    );
    for (const row of rows) {
      const results = run.results.filter(
        (result) => result.feature === feature && result.model === row.model,
      );
      const failing = new Map<string, number>();
      for (const result of results) {
        for (const grade of result.grades) {
          if (!grade.pass) failing.set(grade.name, (failing.get(grade.name) ?? 0) + 1);
        }
      }
      const worst = worstCases(results);
      parts.push(
        `### ${row.model}`,
        failing.size === 0
          ? "Failing checks: none."
          : `Failing checks: ${[...failing].map(([name, count]) => `${name} ${count}`).join(", ")}.`,
        worst.length === 0
          ? "Worst cases: none stood out."
          : [
              "Worst cases:",
              ...worst.map(
                (item) =>
                  `- \`${item.caseId}\`: ${item.reasons.slice(0, SHOWN_REASONS).map(cell).join("; ")}`,
              ),
            ].join("\n"),
      );
    }
  }
  return `${parts.join("\n\n")}\n`;
}
