import type { AllowancePeriod, BillingInterval, UsagePeriod } from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";

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
  if (period?.kind === "trial")
    return `Your full allowance starts on ${resetDay(period, timeZone)}.`;
  return `They reset ${resetWhen(period, timeZone)}.`;
}

export function resetRule(interval: BillingInterval): string {
  if (interval === "year")
    return "Limits reset each month, on the day of the month your plan started.";
  return "Limits reset each month, when your plan renews.";
}

export const PLAN_PROMISES =
  "Uploads always work, read by the basic reader past the AI reads. PDF downloads stay free on every plan.";

export function trialEndDay(trialEndsAt: number, timeZone?: string): string {
  return shortDate(trialEndsAt, timeZone);
}

export type UsageWords = Messages["app"]["usage"];

// The lines above in the reader's language; English reads exactly as they do.
export function usageCopy(words: UsageWords, format: Format) {
  const day = (period: UsagePeriod, timeZone?: string) =>
    format.date(period.resetsAt, { month: "short", day: "numeric", timeZone });
  const when = (period: UsagePeriod | null | undefined, timeZone?: string) => {
    if (!period) return words.renews;
    return fmt(period.renews ? words.onDayRenews : words.onDay, { day: day(period, timeZone) });
  };
  return {
    thisPeriod: (period: PeriodLike) => words.thisPeriod[kindOf(period)],
    perPeriod: (period: PeriodLike) => words.perPeriod[kindOf(period)],
    resetWhen: when,
    resetSentence: (period: UsagePeriod | null | undefined, timeZone?: string) =>
      period?.kind === "trial"
        ? fmt(words.trialStarts, { day: day(period, timeZone) })
        : fmt(words.reset, { when: when(period, timeZone) }),
  };
}
