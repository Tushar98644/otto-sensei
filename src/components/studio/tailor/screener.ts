import { PLANS, type PlanId, type Usage, type UsagePeriod } from "@/config/plans";
import type { TailorRequirement, TailorResult } from "@/lib/ai/types";
import { droppedSupport, verbsAdded } from "@/lib/ai/writing-guards";
import type { Resume } from "@/lib/resume/schema";
import { findTerm } from "@/lib/tailor/keywords";
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

export type Screener = { rows: RequirementRow[]; counts: ScreenerCounts; headline: string };

export function buildScreener(
  source: Resume,
  result: TailorResult,
  choices: TailorChoices,
): Screener {
  const rows = screenerRows(
    screenerResume(source, result, choices),
    result.requirements,
    screenerOptions(choices),
  );
  const counts = screenerCounts(rows);
  return { rows, counts, headline: screenerHeadline(counts) };
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
export function writingAllowance(
  plan: PlanId | null | undefined,
  usage: Usage | null | undefined,
  period?: UsagePeriod | null,
): string | null {
  if (!plan) {
    const limit = PLANS.free.limits.letter;
    return `Needs a free account, with ${limit} cover letters and answers a month.`;
  }
  if (!usage) return null;
  const free = plan === "free" ? "free " : "";
  const left = Math.max(0, usage.limit - usage.used);
  if (left === 0) {
    return `No ${free}cover letters or answers left ${thisPeriod(period)}. ${resetSentence(period)}`;
  }
  return `${left} of ${usage.limit} ${free}cover letters and answers left ${thisPeriod(period)}.`;
}
