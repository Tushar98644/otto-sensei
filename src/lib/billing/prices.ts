import {
  PLANS,
  PRICES_USD,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";

export const INTERVAL_NAMES: Record<BillingInterval, string> = {
  month: "Monthly",
  year: "Yearly",
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

export function planPrice(plan: PaidPlanId, interval: BillingInterval): string {
  return usd.format(PRICES_USD[plan][interval]);
}

export function planPriceLabel(plan: PaidPlanId, interval: BillingInterval): string {
  return `${planPrice(plan, interval)}/${interval}`;
}

export function yearlySavingsPercent(plan: PaidPlanId): number {
  const monthly = PRICES_USD[plan].month * 12;
  // Whole cents, so an exact 20% isn't floored to 19 by floating point.
  const saved = Math.round((monthly - PRICES_USD[plan].year) * 100);
  return monthly > 0 ? Math.max(0, Math.floor((saved * 100) / Math.round(monthly * 100))) : 0;
}

export function perMonth(plan: PaidPlanId): string {
  return usd.format(Math.round((PRICES_USD[plan].year / 12) * 100) / 100);
}

export function renewalPeriods(intervals: readonly BillingInterval[]): string {
  const names: string[] = intervals.length ? [...intervals] : ["month"];
  const last = names.pop();
  return names.length ? `${names.join(", ")} or ${last}` : `${last}`;
}

export function priceSentence(plan: PaidPlanId, interval: BillingInterval): string {
  const price = planPrice(plan, interval);
  if (interval === "year") {
    const savings = yearlySavingsPercent(plan);
    return savings > 0
      ? `${price} once a year, about ${perMonth(plan)} a month. ${savings}% less than paying monthly.`
      : `${price} once a year.`;
  }
  return `${price} a month. Cancel anytime.`;
}

export function trialOffer(): string {
  return `${PLANS[PRO_TRIAL.plan].name} for ${PRO_TRIAL.days} days`;
}

export function trialHeadline(): string {
  return `Try ${trialOffer()}`;
}

export function endsTrialSentence(plan: PaidPlanId, interval: BillingInterval): string {
  return `Ends your ${PLANS[PRO_TRIAL.plan].name} trial today and starts ${PLANS[plan].name} at ${planPriceLabel(plan, interval)}.`;
}

export function trialPrice(): string {
  return usd.format(PRO_TRIAL.priceUsd);
}

export function trialSentence(): string {
  const { days, interval, plan, priceUsd } = PRO_TRIAL;
  return `${usd.format(priceUsd)} for ${days} days, then ${planPrice(plan, interval)} a ${interval}. Cancel anytime before the trial ends.`;
}
