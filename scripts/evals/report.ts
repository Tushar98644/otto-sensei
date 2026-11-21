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
};

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

export type MetricDelta = {
  metric: Metric;
  before: number | null;
  after: number | null;
  change: number | null;
  regression: boolean;
};

export type RowDelta = {
  feature: string;
  model: string;
  status: "both" | "new" | "gone";
  metrics: MetricDelta[];
};

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

export function summarize(results: readonly CaseResult[]): Row[] {
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

export function compareRows(current: readonly Row[], previous: readonly Row[]): RowDelta[] {
  const key = (row: Row) => `${row.feature}\u0000${row.model}`;
  const old = new Map(previous.map((row) => [key(row), row]));
  const now = new Map(current.map((row) => [key(row), row]));
  const deltas: RowDelta[] = current.map((row) => {
    const before = old.get(key(row));
    if (!before) return { feature: row.feature, model: row.model, status: "new", metrics: [] };
    const metrics = METRICS.map((metric) => {
      const was = before[metric];
      const is = row[metric];
      const both = was !== null && is !== null;
      return {
        metric,
        before: was,
        after: is,
        change: both ? is - was : null,
        regression: both && isRegression(metric, was, is),
      };
    });
    return { feature: row.feature, model: row.model, status: "both", metrics };
  });
  for (const row of previous) {
    if (!now.has(key(row))) {
      deltas.push({ feature: row.feature, model: row.model, status: "gone", metrics: [] });
    }
  }
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

function changeText(delta: MetricDelta): string {
  if (delta.change === null || delta.before === null) return FORMAT[delta.metric](delta.after);
  const { change, before } = delta;
  const shown =
    delta.metric === "passRate"
      ? `${change >= 0 ? "+" : ""}${Math.round(change * 100)} pts`
      : delta.metric === "judgeMean"
        ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}`
        : before === 0
          ? "n/a"
          : `${change >= 0 ? "+" : ""}${Math.round((change / before) * 100)}%`;
  return `${FORMAT[delta.metric](delta.after)} (${shown}${delta.regression ? ", REGRESSION" : ""})`;
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
      `| ${delta.feature} | ${delta.model} | ${delta.metrics.map(changeText).join(" | ")} |`,
    );
  }
  return lines.join("\n");
}

export function regressionCount(deltas: readonly RowDelta[]): number {
  return deltas.reduce((sum, delta) => sum + delta.metrics.filter((m) => m.regression).length, 0);
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
    const flagged = regressionCount(compared.deltas);
    parts.push(
      `## Compared with ${compared.dir}`,
      `${flagged} regression${flagged === 1 ? "" : "s"} flagged.`,
      compareTable(compared.deltas),
    );
  }
  for (const feature of [...new Set(run.rows.map((row) => row.feature))]) {
    parts.push(`## ${feature}`);
    for (const row of run.rows.filter((item) => item.feature === feature)) {
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
