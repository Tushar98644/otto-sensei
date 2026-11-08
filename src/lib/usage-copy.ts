import type { AllowancePeriod, UsagePeriod } from "@/config/plans";

// Client-safe. How an allowance period is written. No period (signed out, or a server from before
// weekly allowances) reads as the calendar month, the period everyone but weekly subscribers has.

type PeriodLike = UsagePeriod | AllowancePeriod | null | undefined;

/** "month" or "week". */
export function periodNoun(period: PeriodLike): AllowancePeriod {
  const kind = typeof period === "string" ? period : period?.kind;
  return kind === "week" ? "week" : "month";
}

/** "this month" or "this week". */
export function thisPeriod(period: PeriodLike): string {
  return `this ${periodNoun(period)}`;
}

/** "a month" or "a week". */
export function perPeriod(period: PeriodLike): string {
  return `a ${periodNoun(period)}`;
}

/**
 * "the 1st", or the day a weekly allowance starts over ("Nov 14"). Pass timeZone "UTC" on the
 * server; the browser's own zone is right for the person reading it.
 */
export function resetDay(period: UsagePeriod | null | undefined, timeZone?: string): string {
  if (period?.kind !== "week") return "the 1st";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(
    period.resetsAt,
  );
}

/** "They reset on the 1st." or "They reset on Nov 14." */
export function resetSentence(period: UsagePeriod | null | undefined, timeZone?: string): string {
  return `They reset on ${resetDay(period, timeZone)}.`;
}
