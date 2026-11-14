import type { AllowancePeriod, BillingInterval, UsagePeriod } from "@/config/plans";

type PeriodLike = UsagePeriod | AllowancePeriod | null | undefined;

function kindOf(period: PeriodLike): AllowancePeriod {
  const kind = typeof period === "string" ? period : period?.kind;
  return kind === "trial" ? kind : "month";
}

export function periodNoun(period: PeriodLike): AllowancePeriod {
  return kindOf(period);
}

export function thisPeriod(period: PeriodLike): string {
  return `this ${kindOf(period)}`;
}

export function perPeriod(period: PeriodLike): string {
  const kind = kindOf(period);
  return kind === "trial" ? "during the trial" : `a ${kind}`;
}

const shortDate = (at: number, timeZone?: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(at);

export function resetDay(period: UsagePeriod | null | undefined, timeZone?: string): string | null {
  return period ? shortDate(period.resetsAt, timeZone) : null;
}

export function resetWhen(period: UsagePeriod | null | undefined, timeZone?: string): string {
  const day = resetDay(period, timeZone);
  if (!day) return "when your plan renews";
  return period?.renews ? `on ${day}, when your plan renews` : `on ${day}`;
}

export function resetSentence(period: UsagePeriod | null | undefined, timeZone?: string): string {
  if (period?.kind === "trial") return `Your full allowance starts on ${resetDay(period, timeZone)}.`;
  return `They reset ${resetWhen(period, timeZone)}.`;
}

export function resetRule(interval: BillingInterval): string {
  if (interval === "year") return "Limits reset each month, on the day of the month your plan started.";
  return "Limits reset each month, when your plan renews.";
}

export const PLAN_PROMISES =
  "Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.";

export function trialEndDay(trialEndsAt: number, timeZone?: string): string {
  return shortDate(trialEndsAt, timeZone);
}
