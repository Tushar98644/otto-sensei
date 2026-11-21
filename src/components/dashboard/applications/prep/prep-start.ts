import { FEATURE_LABELS, type Usage, type UsagePeriod } from "@/config/plans";
import { resetSentence, thisPeriod } from "@/lib/usage-copy";

const count = new Intl.NumberFormat("en-US");

export function prepAllowance(
  usage: Usage | null | undefined,
  period?: UsagePeriod | null,
): string | null {
  if (!usage || usage.limit <= 0) return null;
  const left = Math.max(0, usage.limit - usage.used);
  const pool = `${count.format(usage.limit)} ${FEATURE_LABELS.letter}`;
  if (left === 0) return `You've used all ${pool} ${thisPeriod(period)}. ${resetSentence(period)}`;
  return `Uses 1 of your ${count.format(left)} left ${thisPeriod(period)}, shared with letters and messages.`;
}

export type StartFacts = {
  // The link carried ?start=1, as "Move and prepare" does; a plain link or bookmark never spends allowance.
  asked: boolean;
  pro: boolean | null;
  usage: Usage | null | undefined;
  resumes: number;
  jobKnown: boolean;
};

// Prep only starts by itself when it was asked for and can run: Pro, room left and a job to read.
export function startsByItself({ asked, pro, usage, resumes, jobKnown }: StartFacts): boolean {
  if (!asked || pro !== true || !jobKnown || resumes === 0) return false;
  return !usage || usage.used < usage.limit;
}
