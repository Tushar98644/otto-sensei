import type { Usage, UsagePeriod } from "@/config/plans";
import { resetDay, resetSentence, thisPeriod } from "@/lib/usage-copy";

// An abuse guard, not a selling point, so round numbers and one quiet line.

const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const long = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});

export function tokenCount(tokens: number): string {
  return short.format(tokens);
}

/** "5 million", "10 million", "half a million". */
export function tokensInWords(tokens: number): string {
  return tokens === 500_000 ? "half a million" : long.format(tokens);
}

export function aiBudgetLine(budget: Usage, period: UsagePeriod | null | undefined): string {
  return `AI budget: ${tokenCount(budget.used)} of ${tokenCount(budget.limit)} used ${thisPeriod(period)}`;
}

/** On a trial, names when the full allowance starts. Pass timeZone "UTC" on the server. */
export function budgetReachedText(
  period: UsagePeriod | null | undefined,
  timeZone?: string,
): string {
  const used = `You've used ${thisPeriod(period)}'s AI budget.`;
  if (period?.kind === "trial") return `${used} ${resetSentence(period, timeZone)}`;
  const day = resetDay(period, timeZone);
  return `${used} It resets ${day ? `on ${day}` : "when your plan renews"}.`;
}
