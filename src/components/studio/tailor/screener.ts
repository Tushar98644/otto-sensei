import { OTTO } from "@/components/mascot/lines";
import type { PlanId, Usage, UsagePeriod } from "@/config/plans";
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
import { resetSentence, thisPeriod } from "@/lib/usage-copy";
import { screenerOptions, screenerResume, type TailorChoices } from "./apply";

// Pure logic behind the screener view and its "Have you done this? Where?" flow.

export type Screener = {
  rows: RequirementRow[];
  counts: ScreenerCounts;
  headline: string;
  // Why each row has its status, by row id.
  reasons: Record<string, RowReason>;
  // The resume's lines as this job sees them, and how many show nothing for it.
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
  // A picked suggestion is the summary the copy will have.
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

// The question the line fixer answers from: it names the requirement, so the line it writes does
// too, and asks for the where and the what that make a line worth reading.
export function lineQuestion(requirement: TailorRequirement): string {
  return `${requirement.ask} Where, and what did you do?`;
}

// A screener searches for the name, so a line about Terraform that never says "Terraform" proves
// nothing to it.
export function missingName(requirement: TailorRequirement, line: string): string | null {
  const [first] = requirement.terms;
  if (!first || !line.trim()) return null;
  if (requirement.terms.some((term) => findTerm(line, term).found)) return null;
  return `Name ${first} in the line, so a screener can find it.`;
}

// The line fixer may still turn "helped set up" into "led", or drop the "helped". The person
// decides, but they see it.
export function verbNote(answer: string, line: string): string | null {
  const [verb] = verbsAdded(answer, line);
  if (verb) {
    return `Otto wrote “${verb}”, which claims more than you said. Change it if it isn't right.`;
  }
  if (droppedSupport(answer, line)) {
    return "You said you helped; this line reads as if you did it alone. Add it back if that's fairer.";
  }
  return null;
}

// A trailing blank like ", [add result if known]" is the fixer asking for more, not part of the
// line: it goes. A blank inside the line ("[X times]") stays for the person to fill.
const TRAILING_BLANK = /\s*[,;:–—-]?\s*\[[^\]\n]*\]\s*\.?\s*$/u;

export function tidyLine(line: string): string {
  let text = line.trim();
  while (TRAILING_BLANK.test(text)) text = text.replace(TRAILING_BLANK, "");
  return text.replace(/(?<!\.)\.$/u, "").trim();
}

export function hasBlank(line: string): boolean {
  return /\[[^\]\n]*\]/u.test(line);
}

// Under the letter and question tools, like the tailor allowance note above the job form.
// Free has none at all, so it hears what Pro adds (`trial`: whether the free trial is open to them).
export function writingAllowance(
  plan: PlanId | null | undefined,
  usage: Usage | null | undefined,
  period?: UsagePeriod | null,
  trial = true,
): string | null {
  if (!plan) return OTTO.limit.none("letter", trial);
  if (!usage) return null;
  if (usage.limit === 0) return OTTO.limit.none("letter", trial);
  const left = Math.max(0, usage.limit - usage.used);
  if (left === 0) {
    return `No cover letters or answers left ${thisPeriod(period)}. ${resetSentence(period)}`;
  }
  return `${left} of ${usage.limit} cover letters and answers left ${thisPeriod(period)}.`;
}
