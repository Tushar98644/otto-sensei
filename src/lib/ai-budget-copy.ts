import type { Usage, UsagePeriod } from "@/config/plans";
import { resetDay, resetSentence, thisPeriod } from "@/lib/usage-copy";

// Client-safe. How the AI token budget is written. It's an abuse guard, not something to sell, so
// it gets round numbers and one quiet line.

const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const long = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});

/** "1.2M", "5M", "500K". */
export function tokenCount(tokens: number): string {
  return short.format(tokens);
}

/** "5 million", "10 million", "half a million". */
export function tokensInWords(tokens: number): string {
  return tokens === 500_000 ? "half a million" : long.format(tokens);
}

/** "AI budget: 1.2M of 5M used this month". */
export function aiBudgetLine(budget: Usage, period: UsagePeriod | null | undefined): string {
  return `AI budget: ${tokenCount(budget.used)} of ${tokenCount(budget.limit)} used ${thisPeriod(period)}`;
}

/**
 * "You've used this month's AI budget. It resets on Dec 4." On a trial, when the plan's full
 * allowance starts instead. Pass timeZone "UTC" on the server.
 */
export function budgetReachedText(
  period: UsagePeriod | null | undefined,
  timeZone?: string,
): string {
  const used = `You've used ${thisPeriod(period)}'s AI budget.`;
  if (period?.kind === "trial") return `${used} ${resetSentence(period, timeZone)}`;
  const day = resetDay(period, timeZone);
  return `${used} It resets ${day ? `on ${day}` : "when your plan renews"}.`;
}
