import type { AllowancePeriod, BillingInterval, UsagePeriod } from "@/config/plans";

// No period (signed out) reads as a month. Months start over on renewal, so never "the 1st".

type PeriodLike = UsagePeriod | AllowancePeriod | null | undefined;

function kindOf(period: PeriodLike): AllowancePeriod {
  const kind = typeof period === "string" ? period : period?.kind;
  return kind === "week" || kind === "trial" ? kind : "month";
}

export function periodNoun(period: PeriodLike): AllowancePeriod {
  return kindOf(period);
}

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

// null with no period. Pass timeZone "UTC" on the server; the browser's own zone suits the reader.
export function resetDay(period: UsagePeriod | null | undefined, timeZone?: string): string | null {
  return period ? shortDate(period.resetsAt, timeZone) : null;
}

/** "on Dec 17, when your plan renews", "on Dec 17" (mid-term reset) or "when your plan renews". */
export function resetWhen(period: UsagePeriod | null | undefined, timeZone?: string): string {
  const day = resetDay(period, timeZone);
  if (!day) return "when your plan renews";
  return period?.renews ? `on ${day}, when your plan renews` : `on ${day}`;
}

// On a trial, says when the plan's own allowance starts.
export function resetSentence(period: UsagePeriod | null | undefined, timeZone?: string): string {
  if (period?.kind === "trial") return `Your full allowance starts on ${resetDay(period, timeZone)}.`;
  return `They reset ${resetWhen(period, timeZone)}.`;
}

// For a plan not bought yet: no date is known, only the rule.
export function resetRule(interval: BillingInterval): string {
  if (interval === "week") return "Limits reset each billing week, when the plan renews.";
  if (interval === "year") return "Limits reset each month, on the day of the month your plan started.";
  return "Limits reset each month, when your plan renews.";
}

// Shown under every plan offer, after its reset rule. The owner's wording.
export const PLAN_PROMISES =
  "Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.";

export function trialEndDay(trialEndsAt: number, timeZone?: string): string {
  return shortDate(trialEndsAt, timeZone);
}
