import type { AllowancePeriod, UsagePeriod } from "@/config/plans";

// Client-safe. How an allowance period is written. No period (signed out, or a server from before
// weekly allowances) reads as the calendar month, the period everyone but weekly subscribers and
// trials has.

type PeriodLike = UsagePeriod | AllowancePeriod | null | undefined;

function kindOf(period: PeriodLike): AllowancePeriod {
  const kind = typeof period === "string" ? period : period?.kind;
  return kind === "week" || kind === "trial" ? kind : "month";
}

/** "month", "week" or "trial". */
export function periodNoun(period: PeriodLike): AllowancePeriod {
  return kindOf(period);
}

/** "this month", "this week" or "this trial". */
export function thisPeriod(period: PeriodLike): string {
  return `this ${kindOf(period)}`;
}

/** "a month", "a week" or "during the trial". */
export function perPeriod(period: PeriodLike): string {
  const kind = kindOf(period);
  return kind === "trial" ? "during the trial" : `a ${kind}`;
}

const shortDate = (at: number, timeZone?: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(at);

/**
 * "the 1st", or the day a weekly allowance starts over or a trial ends ("Nov 14"). Pass timeZone
 * "UTC" on the server; the browser's own zone is right for the person reading it.
 */
export function resetDay(period: UsagePeriod | null | undefined, timeZone?: string): string {
  if (period?.kind !== "week" && period?.kind !== "trial") return "the 1st";
  return shortDate(period.resetsAt, timeZone);
}

/** "They reset on the 1st.", "They reset on Nov 14." or, on a trial, when the plan's own starts. */
export function resetSentence(period: UsagePeriod | null | undefined, timeZone?: string): string {
  if (period?.kind === "trial") return `Your full allowance starts on ${resetDay(period, timeZone)}.`;
  return `They reset on ${resetDay(period, timeZone)}.`;
}

/** "Nov 11", the day a trial ends, written in the reader's zone (or the one given). */
export function trialEndDay(trialEndsAt: number, timeZone?: string): string {
  return shortDate(trialEndsAt, timeZone);
}
