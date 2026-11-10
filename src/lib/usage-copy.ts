import type { AllowancePeriod, BillingInterval, UsagePeriod } from "@/config/plans";

// Client-safe. How an allowance period is written. No period (signed out, or a server from before
// weekly allowances) reads as a month, the period everyone but weekly subscribers and trials has.
// A month starts over when the plan renews (yearly plans: on the same day each month), so it is
// never "the 1st".

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
 * The day the allowance starts over, or a trial ends ("Dec 17"); null with no period. Pass
 * timeZone "UTC" on the server; the browser's own zone is right for the person reading it.
 */
export function resetDay(period: UsagePeriod | null | undefined, timeZone?: string): string | null {
  return period ? shortDate(period.resetsAt, timeZone) : null;
}

/**
 * "on Dec 17, when your plan renews", "on Dec 17" (a reset between renewals, like a yearly plan's
 * monthly one) or, with no date known, "when your plan renews".
 */
export function resetWhen(period: UsagePeriod | null | undefined, timeZone?: string): string {
  const day = resetDay(period, timeZone);
  if (!day) return "when your plan renews";
  return period?.renews ? `on ${day}, when your plan renews` : `on ${day}`;
}

/**
 * "They reset on Dec 17, when your plan renews.", "They reset on Nov 19." or, on a trial, when the
 * plan's own allowance starts.
 */
export function resetSentence(period: UsagePeriod | null | undefined, timeZone?: string): string {
  if (period?.kind === "trial") return `Your full allowance starts on ${resetDay(period, timeZone)}.`;
  return `They reset ${resetWhen(period, timeZone)}.`;
}

/**
 * When a billing option's limits start over, for a plan not bought yet: no date is known, only
 * the rule.
 */
export function resetRule(interval: BillingInterval): string {
  if (interval === "week") return "Limits reset each billing week, when the plan renews.";
  if (interval === "year") return "Limits reset each month, on the day of the month your plan started.";
  return "Limits reset each month, when your plan renews.";
}

// Said under every plan offer, after when its limits reset (owner's words, 2026-11-11).
export const PLAN_PROMISES =
  "Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.";

/** "Nov 11", the day a trial ends, written in the reader's zone (or the one given). */
export function trialEndDay(trialEndsAt: number, timeZone?: string): string {
  return shortDate(trialEndsAt, timeZone);
}
