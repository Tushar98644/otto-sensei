// Pure and client-safe. Numbers pulled out of resume lines by rules (no AI), for a job's
// highlight ("-72% failed payouts"), a project's outcome line and the page's headline stats.
// A rule that isn't sure says nothing: a missing highlight looks fine, a wrong one doesn't.

export type MetricKind = "change" | "range" | "multiple" | "money" | "count";
export type Metric = { value: string; label: string; kind: MetricKind; score: number };

const DOWN =
  /^(?:cut|cuts|reduc\w*|lower\w*|fell|fall\w*|drop\w*|decreas\w*|shrank|shrunk|halv\w*|trimm?\w*|saved|sav\w*|slash\w*|down)$/i;
const UP =
  /^(?:rais\w*|increas\w*|grew|grow\w*|improv\w*|boost\w*|lift\w*|doubl\w*|tripl\w*|up|gain\w*|expand\w*|rose|ris\w*)$/i;
// Words a label stops at: what follows them is how, not what.
const STOP = new Set(
  "a an the by with in on at across from using for and that which while to via so after before into through over under of as now per".split(
    " ",
  ),
);
const LEADING = new Set("the a an our my their its his her this".split(" "));
// "a month", "a day": part of what was counted.
const RATE = /^(?:a|per|each|every)\s+(?:second|minute|hour|day|week|month|quarter|year)\b/i;
const MONTHLY = /^(?:daily|weekly|monthly|yearly|annually)\b/i;

const NUMBER = String.raw`\d+(?:[.,]\d+)*`;
const UNIT = String.raw`(?:\s?(?:%|ms|s|sec|secs|seconds?|mins?|minutes?|h|hrs?|hours?|days?|x|kb|mb|gb|tb|k|m|b))?`;

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function cleanLabel(raw: string): string {
  const list = words(raw.replace(/[()"“”]/g, " "))
    .map((word) => word.replace(/^[^\p{L}\p{N}$#+]+|[^\p{L}\p{N}%+]+$/gu, ""))
    .filter(Boolean);
  // "Grew MRR" is about MRR; the verb is how it moved.
  while (
    list.length > 1 &&
    (LEADING.has(list[0]!.toLowerCase()) || UP.test(list[0]!) || DOWN.test(list[0]!))
  )
    list.shift();
  return list.slice(0, 5).join(" ");
}

/** The words after a number, up to a stop word or punctuation, keeping "a month". */
function labelAfter(rest: string): string {
  const head = rest.split(/[;:,.!?](?:\s|$)|\s[-–—]\s/)[0] ?? "";
  const list = words(head);
  const kept: string[] = [];
  for (let i = 0; i < list.length && kept.length < 5; i++) {
    const word = list[i]!;
    const lower = word.toLowerCase().replace(/[^a-z]/g, "");
    const tail = list.slice(i).join(" ");
    if (RATE.test(tail)) {
      // Nothing counted before "a month": the label is the rate alone, kept as written.
      if (kept.length === 0) return list.slice(i, i + 2).join(" ");
      kept.push(...list.slice(i, i + 2));
      break;
    }
    if (MONTHLY.test(word)) {
      kept.push(word);
      break;
    }
    if (STOP.has(lower) || /\d/.test(word)) break;
    kept.push(word);
  }
  return cleanLabel(kept.join(" "));
}

/** The words before an index, back to punctuation or the line's start, at most five. */
function labelBefore(text: string): string {
  const parts = text.split(/[;:,.!?](?:\s|$)|\s[-–—]\s/);
  const list = words(parts.at(-1) ?? "");
  const kept: string[] = [];
  for (let i = list.length - 1; i >= 0 && kept.length < 5; i--) {
    const lower = list[i]!.toLowerCase().replace(/[^a-z]/g, "");
    if (STOP.has(lower) && kept.length > 0) break;
    if (STOP.has(lower)) continue;
    kept.unshift(list[i]!);
  }
  return cleanLabel(kept.join(" "));
}

function amount(raw: string): number {
  const match = /(\d+(?:[.,]\d+)*)\s?([kmb])?/i.exec(raw);
  if (!match) return 0;
  const base = Number(match[1]!.replace(/,(?=\d{3}\b)/g, "").replace(",", "."));
  const scale = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() as "k" | "m" | "b"] ?? 1;
  return Number.isFinite(base) ? base * scale : 0;
}

const tidy = (value: string) =>
  value.replace(/\s+/g, "").replace(/(\d)([KMB])$/i, (_, d, u) => `${d}${u.toUpperCase()}`);

function percentChanges(line: string): Metric[] {
  const found: Metric[] = [];
  const pattern = new RegExp(String.raw`(?:^|[^\w.])(${NUMBER})\s?(?:%|percent\b)`, "gi");
  for (const match of line.matchAll(pattern)) {
    const at = (match.index ?? 0) + match[0].indexOf(match[1]!);
    const before = line.slice(0, at);
    const prior = words(before);
    const previous = prior.at(-1)?.toLowerCase() ?? "";
    // "to 90%" is where something ended up, not a change.
    if (previous === "to" || previous === "at") {
      const label = labelBefore(
        before
          .replace(/\s+(?:to|at)\s*$/i, "")
          .replace(/^.*?\b(?:raised|got|brought|took|pushed)\b/i, ""),
      );
      if (label) found.push({ value: `${match[1]}%`, label, kind: "change", score: 70 });
      continue;
    }
    // The nearest direction word within eight words before the number.
    let direction: "up" | "down" | null = null;
    let verbAt = -1;
    for (let i = prior.length - 1; i >= Math.max(0, prior.length - 8); i--) {
      const word = prior[i]!.replace(/[^a-z]/gi, "");
      if (DOWN.test(word)) direction = "down";
      else if (UP.test(word)) direction = "up";
      if (direction) {
        verbAt = i;
        break;
      }
    }
    const tail = line.slice((match.index ?? 0) + match[0].length).trimStart();
    let label = "";
    if (verbAt >= 0) {
      // "failed payouts fell 72%": the subject; "cut load time by 40%": the object.
      const between = prior
        .slice(verbAt + 1)
        .join(" ")
        .replace(/\s*\bby\s*$/i, "");
      label = cleanLabel(between) || labelBefore(prior.slice(0, verbAt).join(" "));
    }
    if (!label) label = labelAfter(tail.replace(/^(?:fewer|less|more|lower|higher)\s+/i, ""));
    if (!label) continue;
    const sign = direction === "down" ? "-" : direction === "up" ? "+" : "";
    const fewer = /^(?:fewer|less|lower|faster|cheaper|smaller)\b/i.test(tail);
    const more = /^(?:more|higher|bigger|greater)\b/i.test(tail);
    const signed = sign || (fewer ? "-" : more ? "+" : "");
    found.push({ value: `${signed}${match[1]}%`, label, kind: "change", score: signed ? 100 : 60 });
  }
  return found;
}

function ranges(line: string): Metric[] {
  const found: Metric[] = [];
  const pattern = new RegExp(
    String.raw`\bfrom\s+(?:about\s+|~)?(\$?${NUMBER}${UNIT})\s+(?:down\s+|up\s+)?to\s+(?:about\s+|~)?(\$?${NUMBER}${UNIT})(?![\w])`,
    "gi",
  );
  for (const match of line.matchAll(pattern)) {
    const before = line.slice(0, match.index ?? 0);
    const prior = words(before);
    let start = 0;
    for (let i = prior.length - 1; i >= 0; i--) {
      const word = prior[i]!.replace(/[^a-z]/gi, "");
      if (DOWN.test(word) || UP.test(word)) {
        start = i + 1;
        break;
      }
    }
    const label = cleanLabel(prior.slice(start).join(" ")) || labelBefore(before);
    if (!label) continue;
    found.push({
      value: `${tidy(match[1]!)} → ${tidy(match[2]!)}`,
      label,
      kind: "range",
      score: 90,
    });
  }
  return found;
}

function multiples(line: string): Metric[] {
  const found: Metric[] = [];
  const pattern = new RegExp(String.raw`(?:^|[^\w.])(${NUMBER})\s?[x×](?![\w])\s*(\w+)?`, "gi");
  for (const match of line.matchAll(pattern)) {
    const next = match[2] ?? "";
    const label =
      /^(faster|quicker|cheaper|smaller|more|fewer|less|growth|increase|throughput|speedup)$/i.test(
        next,
      )
        ? next.toLowerCase()
        : labelBefore(line.slice(0, match.index ?? 0).replace(/\b(?:by|up)\s*$/i, ""));
    if (!label) continue;
    found.push({ value: `${match[1]}x`, label, kind: "multiple", score: 85 });
  }
  return found;
}

function money(line: string): Metric[] {
  const found: Metric[] = [];
  const pattern = new RegExp(String.raw`([$€£])\s?(${NUMBER})\s?([kmb](?![a-z]))?\s*(?:\+)?`, "gi");
  for (const match of line.matchAll(pattern)) {
    const rest = line.slice((match.index ?? 0) + match[0].length);
    const before = labelBefore(line.slice(0, match.index ?? 0).replace(/\b(?:by|to|of)\s*$/i, ""));
    const after = labelAfter(rest);
    const label = /^(?:MRR|ARR|GMV)\b/.test(rest)
      ? rest.slice(0, 3)
      : RATE.test(after)
        ? `${before} ${after}`.trim()
        : after || before;
    if (!label) continue;
    const value = `${match[1]}${match[2]}${match[3] ? match[3].toUpperCase() : ""}`;
    found.push({ value, label, kind: "money", score: 80 });
  }
  return found;
}

const YEAR = /^(?:19|20)\d{2}$/;

function counts(line: string): Metric[] {
  const found: Metric[] = [];
  // 1.4M, 300K, 4,800, 20+, 600: not money, not a percent, not p95 or v2 or a year.
  const pattern = new RegExp(
    String.raw`(?<![\w$€£.#/-])(${NUMBER})(\s?[kmb](?![a-z]))?(\+)?(?![\w%×.]|\s?(?:%|percent|x\b|[kmgt]b\b|ms\b|s\b|seconds?\b|mins?\b|minutes?\b|hours?\b))`,
    "gi",
  );
  for (const match of line.matchAll(pattern)) {
    const digits = match[1]!;
    const unit = match[2]?.trim().toUpperCase() ?? "";
    if (!unit && YEAR.test(digits)) continue;
    const size = amount(`${digits}${unit}`);
    if (size < 10) continue;
    const rest = line.slice((match.index ?? 0) + match[0].length);
    const label = labelAfter(rest);
    if (!label) continue;
    const score = size >= 1e6 ? 75 : size >= 1e3 ? 65 : size >= 100 ? 45 : 30;
    found.push({ value: `${digits}${unit}${match[3] ?? ""}`, label, kind: "count", score });
  }
  return found;
}

/** Every number worth showing in one resume line, best first. */
export function metricsIn(line: string): Metric[] {
  const text = line.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const rangesFound = ranges(text);
  // A range's two ends would otherwise come back as counts and percents of their own.
  const rest = rangesFound.length > 0 ? text.replace(/\bfrom\s+.*?\s+to\s+\S+/gi, " ") : text;
  const all = [
    ...rangesFound,
    ...percentChanges(rest),
    ...multiples(rest),
    ...money(rest),
    ...counts(rest.replace(/[$€£]\s?\d[\d.,]*\s?[kmb]?/gi, " ")),
  ];
  const seen = new Set<string>();
  return all
    .filter((metric) => metric.label.length >= 2 && metric.label.length <= 60)
    .sort((a, b) => b.score - a.score)
    .filter((metric) => {
      const key = metric.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** The strongest number in these lines, or null when none is clear. */
export function bestMetric(lines: readonly string[]): Metric | null {
  let best: Metric | null = null;
  for (const line of lines) {
    for (const metric of metricsIn(line)) {
      if (!best || metric.score > best.score) best = metric;
    }
  }
  return best;
}

/** "-72% failed payouts", "3.1s → 0.9s dashboard p95 load". */
export function metricText(metric: Metric): string {
  return `${metric.value} ${metric.label}`.trim();
}

/** Up to `max` different numbers from these lines, for an outcome line. */
export function topMetrics(lines: readonly string[], max = 3): Metric[] {
  const all = lines.flatMap((line) => metricsIn(line)).sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const picked: Metric[] = [];
  for (const metric of all) {
    if (picked.length >= max) break;
    if (seen.has(metric.value)) continue;
    seen.add(metric.value);
    picked.push(metric);
  }
  return picked;
}

/** 4200 -> "4.2k", 950 -> "950", 1_400_000 -> "1.4M". */
export function compactNumber(value: number): string {
  if (value >= 1e6) return `${trimZero(value / 1e6)}M`;
  if (value >= 1e3) return `${trimZero(value / 1e3)}k`;
  return String(Math.round(value));
}

function trimZero(value: number): string {
  return (value >= 100 ? Math.round(value) : Math.round(value * 10) / 10).toString();
}
