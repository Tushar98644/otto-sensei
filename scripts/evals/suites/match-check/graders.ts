import { z } from "zod";
import { TEXT_LIMITS } from "@/config/plans";
import { TailorRequestSchema } from "@/lib/api/types";
import {
  matchesSchema,
  noInventedNumbers,
  novelWordsAtMost,
  withinLength,
  type Grade,
} from "@/lib/evals/graders";
import type { MatchCheck, MatchRow, MatchStatus } from "@/lib/match-check/check";
import { MAX_TERMS, type Importance } from "@/lib/match-check/post";
import { visibleResume } from "@/lib/resume/ops";
import { ResumeSchema } from "@/lib/resume/validation";
import type { EvalCase } from "../../suite";

// The /job-match page refuses a resume under 100 characters; both paths share the tailor's post limits.
const JobText = TailorRequestSchema.shape.job.shape.text;

export const MatchInputSchema = z.discriminatedUnion("via", [
  z.object({
    via: z.literal("page"),
    resume: z.string().trim().min(100).max(TEXT_LIMITS.resumeChars),
    job: JobText,
  }),
  z.object({ via: z.literal("studio"), resume: ResumeSchema, job: JobText }),
]);

export type MatchInput = z.infer<typeof MatchInputSchema>;

// One hand label: a skill the post names, how the post ranks it, and where it stands in the resume.
export type Want = {
  term: string;
  importance: Importance;
  status: MatchStatus;
  forms?: readonly string[];
};

export type MatchExpect = {
  terms: readonly Want[];
  traps?: readonly string[];
  asks?: readonly string[];
};

export type MatchCase = EvalCase<MatchInput, MatchCheck, MatchExpect>;

export const ASK_CHARS = 160;
export const EVIDENCE_CHARS = 200;
const MAX_ASKS = 4;
const ELLIPSIS = "…";
const SHOWN_FAILURES = 3;
const SHOWN_CHARS = 70;

const RowSchema = z.object({
  id: z.string().regex(/^m\d+$/),
  term: z.string().trim().min(1),
  importance: z.enum(["must", "nice"]).nullable(),
  status: z.enum(["shown", "listed", "missing"]),
  where: z.object({ place: z.string().trim().min(1), text: z.string().trim().min(1) }).nullable(),
});

const Count = z.number().int().min(0);
const Tally = z.object({ found: Count, total: Count });

export const MatchCheckSchema = z.object({
  rows: z.array(RowSchema).max(MAX_TERMS),
  total: Count,
  found: Count,
  shown: Count,
  listed: Count,
  must: Tally,
  nice: Tally,
  sorted: z.boolean(),
  asks: z.array(z.string().trim().min(1)).max(MAX_ASKS),
});

const RANK: Record<"must" | "nice" | "none", number> = { must: 2, nice: 1, none: 0 };
export const rankOf = (importance: Importance) => RANK[importance ?? "none"];

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

const shown = (text: string) => {
  const line = oneLine(text);
  return line.length > SHOWN_CHARS ? `${line.slice(0, SHOWN_CHARS - 1)}…` : line;
};

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const keyOf = (term: string) => term.toLowerCase().replace(/[^\p{L}\p{N}+#]/gu, "");

// Whole words, any case, a plural allowed; names of three characters or fewer keep their case, so "go" isn't Go.
export function findMention(
  text: string,
  phrase: string,
): { index: number; length: number } | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  const body = escapeRegExp(trimmed).replace(/\s+/g, "[\\s-]+");
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${body}(?:e?s)?(?![\\p{L}\\p{N}])`,
    trimmed.length <= 3 ? "u" : "iu",
  );
  const match = pattern.exec(text);
  return match ? { index: match.index, length: match[0].length } : null;
}

export const mentions = (text: string, phrase: string) => findMention(text, phrase) !== null;

function verdict(name: string, failures: readonly string[], passed: string): Grade {
  if (failures.length === 0) return { name, pass: true, detail: passed };
  const more =
    failures.length > SHOWN_FAILURES ? ` (+${failures.length - SHOWN_FAILURES} more)` : "";
  return { name, pass: false, detail: `${failures.slice(0, SHOWN_FAILURES).join("; ")}${more}` };
}

const wantsOf = (kase: MatchCase) => kase.expect?.terms ?? [];

const keysOf = (want: Want) => [want.term, ...(want.forms ?? [])].map(keyOf);

export function wantFor(kase: MatchCase, term: string): Want | undefined {
  const key = keyOf(term);
  return wantsOf(kase).find((want) => keysOf(want).includes(key));
}

const rowFor = (output: MatchCheck, want: Want) =>
  output.rows.find((row) => keysOf(want).includes(keyOf(row.term)));

// The row's own label plus the spellings the hand label accepts for it.
function formsOf(kase: MatchCase, term: string): string[] {
  const want = wantFor(kase, term);
  return [term, ...(want ? [want.term, ...(want.forms ?? [])] : [])];
}

function strings(value: unknown, out: string[]): string[] {
  if (typeof value === "string") {
    const line = oneLine(value);
    if (line) out.push(line);
  } else if (Array.isArray(value)) {
    for (const item of value) strings(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) strings(item, out);
  }
  return out;
}

// What a match may quote: the pasted text, or every field the studio resume shows.
export function resumeSources(input: MatchInput): string[] {
  return input.via === "page" ? [oneLine(input.resume)] : strings(visibleResume(input.resume), []);
}

const resumeText = (input: MatchInput) => resumeSources(input).join("\n");

// A quote may be cut with an ellipsis, and the studio joins fields with ", " or " at ".
export function quotesFrom(text: string, sources: readonly string[]): boolean {
  const pieces = text
    .split(ELLIPSIS)
    .flatMap((part) => part.split(/,\s+|\s+at\s+/))
    .map(oneLine)
    .filter(Boolean);
  return (
    pieces.length > 0 && pieces.every((piece) => sources.some((source) => source.includes(piece)))
  );
}

export function schemaGrade(output: MatchCheck): Grade {
  return matchesSchema(MatchCheckSchema, output);
}

export function countsGrade(output: MatchCheck): Grade {
  const { rows } = output;
  const failures: string[] = [];
  const tally = (status: MatchStatus) => rows.filter((row) => row.status === status).length;
  if (output.total !== rows.length)
    failures.push(`total is ${output.total} for ${rows.length} rows`);
  if (output.shown !== tally("shown"))
    failures.push(`shown is ${output.shown}, rows say ${tally("shown")}`);
  if (output.listed !== tally("listed"))
    failures.push(`listed is ${output.listed}, rows say ${tally("listed")}`);
  if (output.found !== output.shown + output.listed) {
    failures.push(`found is ${output.found}, not shown + listed`);
  }
  for (const importance of ["must", "nice"] as const) {
    const group = rows.filter((row) => row.importance === importance);
    const found = group.filter((row) => row.status !== "missing").length;
    const count = output[importance];
    if (count.total !== group.length || count.found !== found) {
      failures.push(
        `${importance} is ${count.found}/${count.total}, rows say ${found}/${group.length}`,
      );
    }
  }
  if (output.sorted !== rows.some((row) => row.importance !== null)) {
    failures.push(`sorted is ${output.sorted}`);
  }
  const seen = new Set<string>();
  rows.forEach((row: MatchRow, index) => {
    if (row.id !== `m${index + 1}`) failures.push(`row ${index + 1} has id ${row.id}`);
    if ((row.where === null) !== (row.status === "missing")) {
      failures.push(`${row.term} is ${row.status} with ${row.where ? "a" : "no"} line`);
    }
    const before = rows[index - 1];
    if (before && rankOf(row.importance) > rankOf(before.importance)) {
      failures.push(
        `${row.term} (${row.importance}) comes after ${before.term} (${before.importance ?? "unranked"})`,
      );
    }
    const key = keyOf(row.term);
    if (seen.has(key)) failures.push(`${row.term} is listed twice`);
    seen.add(key);
  });
  return verdict("counts", failures, "counts, ids and order agree with the rows");
}

export function requirementsFoundGrade(output: MatchCheck, kase: MatchCase): Grade {
  const wants = wantsOf(kase);
  const missed = wants
    .filter((want) => !rowFor(output, want))
    .map((want) => `${want.term} isn't listed`);
  return verdict("requirements-found", missed, `lists all ${wants.length} labelled skills`);
}

export function matchStatusGrade(output: MatchCheck, kase: MatchCase): Grade {
  const wrong = wantsOf(kase).flatMap((want) => {
    const row = rowFor(output, want);
    return row && row.status !== want.status
      ? [`${want.term} is ${row.status}, labelled ${want.status}`]
      : [];
  });
  return verdict("match-status", wrong, "every listed skill has its labelled status");
}

export function importanceGrade(output: MatchCheck, kase: MatchCase): Grade {
  const name = (importance: Importance) => importance ?? "unranked";
  const wrong = wantsOf(kase).flatMap((want) => {
    const row = rowFor(output, want);
    return row && row.importance !== want.importance
      ? [`${want.term} is ${name(row.importance)}, labelled ${name(want.importance)}`]
      : [];
  });
  return verdict("importance", wrong, "every listed skill has its labelled importance");
}

export function noExtraTermsGrade(output: MatchCheck, kase: MatchCase): Grade {
  if (kase.expect === undefined) return { name: "no-extra-terms", pass: true, detail: "no labels" };
  const traps = new Set((kase.expect.traps ?? []).map(keyOf));
  const extra = output.rows
    .filter((row) => !wantFor(kase, row.term))
    .map((row) =>
      traps.has(keyOf(row.term))
        ? `${row.term} (a trap: the post doesn't ask for it)`
        : `${row.term} isn't labelled`,
    );
  return verdict("no-extra-terms", extra, "every row is a labelled requirement");
}

export function inventedRequirementsGrade(output: MatchCheck, kase: MatchCase): Grade {
  const invented = output.rows
    .filter((row) => !formsOf(kase, row.term).some((form) => mentions(kase.input.job, form)))
    .map((row) => `${row.term} isn't in the post`);
  return verdict("invented-requirements", invented, "every row is named in the post");
}

export function quotesResumeGrade(output: MatchCheck, kase: MatchCase): Grade {
  const sources = resumeSources(kase.input);
  const failures = output.rows.flatMap((row) => {
    if (!row.where) return [];
    if (!quotesFrom(row.where.text, sources)) {
      return [`${row.term}: "${shown(row.where.text)}" isn't in the resume`];
    }
    const named = formsOf(kase, row.term).some((form) => mentions(row.where!.text, form));
    return named ? [] : [`${row.term}: "${shown(row.where.text)}" doesn't name it`];
  });
  return verdict(
    "quotes-resume",
    failures,
    "every quoted line is from the resume and names its skill",
  );
}

export function falseMissingGrade(output: MatchCheck, kase: MatchCase): Grade {
  const text = resumeText(kase.input);
  const failures = output.rows
    .filter((row) => row.status === "missing")
    .filter((row) => formsOf(kase, row.term).some((form) => mentions(text, form)))
    .map((row) => `${row.term} is marked missing but the resume names it`);
  return verdict("false-missing", failures, "no skill the resume names is marked missing");
}

export function asksGrade(output: MatchCheck, kase: MatchCase): Grade {
  const labelled = kase.expect?.asks;
  if (labelled === undefined) return { name: "asks", pass: true, detail: "asks not labelled" };
  const asks = output.asks.map((ask) => oneLine(ask).toLowerCase());
  const failures = labelled
    .filter((want) => !asks.some((ask) => ask.includes(oneLine(want).toLowerCase())))
    .map((want) => `no ask for "${shown(want)}"`);
  if (output.asks.length !== labelled.length) {
    failures.push(`${output.asks.length} asks, labelled ${labelled.length}`);
  }
  return verdict("asks", failures, "the asks match the labels");
}

export const askNumbersGrade = (output: MatchCheck, kase: MatchCase) =>
  noInventedNumbers(output.asks, [kase.input.job], "ask-numbers");

export const asksFromPostGrade = (output: MatchCheck, kase: MatchCase) =>
  novelWordsAtMost(output.asks, kase.input.job, 0, "asks-from-post");

export const askLengthGrade = (output: MatchCheck) =>
  withinLength(output.asks, { min: 1, max: ASK_CHARS }, "ask-length");

export const evidenceLengthGrade = (output: MatchCheck) =>
  withinLength(
    output.rows.flatMap((row) => (row.where ? [row.where.text] : [])),
    { min: 1, max: EVIDENCE_CHARS },
    "evidence-length",
  );
