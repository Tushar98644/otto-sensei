import { PRICES_USD, type BillingInterval, type PaidPlanId } from "@/config/plans";

// Client-safe. How each paid plan's billing options are written, from PRICES_USD.

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

/** "$120" */
export function planPrice(plan: PaidPlanId, interval: BillingInterval): string {
  return usd.format(PRICES_USD[plan][interval]);
}

/** "$120/year" */
export function planPriceLabel(plan: PaidPlanId, interval: BillingInterval): string {
  return `${planPrice(plan, interval)}/${interval}`;
}

/** Whole percent a year saves over twelve months, or 0 when it saves nothing. */
export function yearlySavingsPercent(plan: PaidPlanId): number {
  const monthly = PRICES_USD[plan].month * 12;
  return monthly > 0 ? Math.max(0, Math.floor((1 - PRICES_USD[plan].year / monthly) * 100)) : 0;
}

/** "about $10 a month" for a yearly price, so plans compare at a glance. */
export function perMonth(plan: PaidPlanId): string {
  return usd.format(Math.round((PRICES_USD[plan].year / 12) * 100) / 100);
}

/** "month, year or week", for "Pro renews each … until you cancel." */
export function renewalPeriods(intervals: readonly BillingInterval[]): string {
  const names: string[] = intervals.length ? [...intervals] : ["month"];
  const last = names.pop();
  return names.length ? `${names.join(", ")} or ${last}` : `${last}`;
}

/** One plain sentence about what the option costs and who it suits. */
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
