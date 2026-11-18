import { OTTO } from "@/components/mascot/lines";
import type { PlanId, Usage, UsagePeriod } from "@/config/plans";
import { resetSentence, thisPeriod } from "@/lib/usage-copy";

// Its own module so the writing dialogs don't pull in the screener's checks.
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
    return `No cover letters, messages or answers left ${thisPeriod(period)}. ${resetSentence(period)}`;
  }
  return `${left} of ${usage.limit} cover letters, messages and answers left ${thisPeriod(period)}.`;
}
