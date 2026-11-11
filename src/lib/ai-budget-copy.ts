import type { Usage, UsagePeriod } from "@/config/plans";
import { resetDay, resetSentence, thisPeriod } from "@/lib/usage-copy";

const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const long = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});

export function tokenCount(tokens: number): string {
  return short.format(tokens);
}

export function tokensInWords(tokens: number): string {
  return tokens === 500_000 ? "half a million" : long.format(tokens);
}

export function aiBudgetLine(budget: Usage, period: UsagePeriod | null | undefined): string {
  return `AI budget: ${tokenCount(budget.used)} of ${tokenCount(budget.limit)} used ${thisPeriod(period)}`;
}

export function budgetReachedText(
  period: UsagePeriod | null | undefined,
  timeZone?: string,
): string {
  const used = `You've used ${thisPeriod(period)}'s AI budget.`;
  if (period?.kind === "trial") return `${used} ${resetSentence(period, timeZone)}`;
  const day = resetDay(period, timeZone);
  return `${used} It resets ${day ? `on ${day}` : "when your plan renews"}.`;
}
