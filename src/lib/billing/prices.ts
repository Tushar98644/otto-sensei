import {
  PLANS,
  PRICES_USD,
  PRO_PRICE_COMPARISON,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";

export const INTERVAL_NAMES: Record<BillingInterval, string> = {
  month: "Monthly",
  year: "Yearly",
  week: "Weekly",
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
  return monthly > 0 ? Math.max(0, Math.floor((1 - PRICES_USD[plan].year / monthly) * 100)) : 0;
}

export function perMonth(plan: PaidPlanId): string {
  return usd.format(Math.round((PRICES_USD[plan].year / 12) * 100) / 100);
}

export function proComparison(): string | null {
  const ratio = PRICES_USD.pro.month / PRO_PRICE_COMPARISON.priceUsd;
  if (ratio < 0.4 || ratio > 0.6) return null;
  return `About half the price of ${PRO_PRICE_COMPARISON.name} (${usd.format(PRO_PRICE_COMPARISON.priceUsd)}/mo)`;
}

export const PIZZA_MAX_USD = 20;

export function pizzaLine(): string | null {
  return PRICES_USD.pro.month <= PIZZA_MAX_USD ? "Less than a pizza a month." : null;
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
  if (interval === "week") return `${price} a week, for a short, busy search. Cancel anytime.`;
  return `${price} a month. Cancel anytime.`;
}

export function trialHeadline(): string {
  return `Try ${PLANS[PRO_TRIAL.plan].name} free for ${PRO_TRIAL.days} days`;
}

export function endsTrialSentence(plan: PaidPlanId, interval: BillingInterval): string {
  return `Ends your free ${PLANS[PRO_TRIAL.plan].name} trial today and starts ${PLANS[plan].name} at ${planPriceLabel(plan, interval)}.`;
}

export function trialSentence(): string {
  return `Free for ${PRO_TRIAL.days} days, then ${planPriceLabel(PRO_TRIAL.plan, PRO_TRIAL.interval)}. Cancel anytime before the trial ends.`;
}
