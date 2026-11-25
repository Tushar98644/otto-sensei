import { fmt } from "@/i18n/format";
import type { TailorRequirement, TailorResult } from "@/lib/ai/types";
import { droppedSupport, verbsAdded } from "@/lib/ai/writing-guards";
import type { Resume } from "@/lib/resume/schema";
import { lintResume } from "@/lib/lint/bullets";
import { findTerm } from "@/lib/tailor/keywords";
import {
  jobLines,
  rowReasons,
  tailorFixFirst,
  type FixFirst,
  type JobLine,
  type RowReason,
} from "@/lib/tailor/reasons";
import {
  summaryCheck,
  titleCheck,
  type SummaryCheck,
  type TitleCheck,
} from "@/lib/tailor/title-checks";
import {
  screenerCounts,
  screenerHeadline,
  screenerRows,
  type RequirementRow,
  type ScreenerCounts,
} from "@/lib/tailor/requirements";
import { screenerOptions, screenerResume, type TailorChoices } from "./apply";

export { lineQuestion } from "./line-question";
export { writingAllowance } from "./writing-allowance";

export type Screener = {
  rows: RequirementRow[];
  counts: ScreenerCounts;
  headline: string;
  reasons: Record<string, RowReason>;
  lines: JobLine[];
  unrelated: number;
  title: TitleCheck | null;
  summary: SummaryCheck;
  fixFirst: FixFirst[];
};

export function buildScreener(
  source: Resume,
  result: TailorResult,
  choices: TailorChoices,
  now: number,
): Screener {
  const resume = screenerResume(source, result, choices);
  const rows = screenerRows(resume, result.requirements, screenerOptions(choices));
  const counts = screenerCounts(rows);
  const context = { resume, lint: lintResume(resume), now };
  const reasons = rowReasons(rows, context);
  const { lines, unrelated } = jobLines(rows, context);
  const title = titleCheck(source, result.job.title);
  const top =
    choices.useSummary && result.summary ? { ...source, summary: result.summary } : source;
  const summary = summaryCheck(top, rows, result.job.title);
  return {
    rows,
    counts,
    headline: screenerHeadline(counts),
    reasons,
    lines,
    unrelated,
    title,
    summary,
    fixFirst: tailorFixFirst({ rows, reasons, lines, title, summary }),
  };
}

type LineNotes = { nameIt: string; claimsMore: string; droppedHelp: string };

export function missingName(
  t: LineNotes,
  requirement: TailorRequirement,
  line: string,
): string | null {
  const [first] = requirement.terms;
  if (!first || !line.trim()) return null;
  if (requirement.terms.some((term) => findTerm(line, term).found)) return null;
  return fmt(t.nameIt, { name: first });
}

export function verbNote(t: LineNotes, answer: string, line: string): string | null {
  const [verb] = verbsAdded(answer, line);
  if (verb) return fmt(t.claimsMore, { verb });
  if (droppedSupport(answer, line)) return t.droppedHelp;
  return null;
}

const TRAILING_BLANK = /\s*[,;:–—-]?\s*\[[^\]\n]*\]\s*\.?\s*$/u;

export function tidyLine(line: string): string {
  let text = line.trim();
  while (TRAILING_BLANK.test(text)) text = text.replace(TRAILING_BLANK, "");
  return text.replace(/(?<!\.)\.$/u, "").trim();
}

export function hasBlank(line: string): boolean {
  return /\[[^\]\n]*\]/u.test(line);
}
