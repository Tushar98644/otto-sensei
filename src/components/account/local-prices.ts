import { PRICES_USD, PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import type { Format } from "@/i18n/intl";

// Prices stay in USD, written the reader's way; in English these match lib/billing/prices.
const WHOLE = { trailingZeroDisplay: "stripIfInteger" } as const;

export function usdIn(format: Format, amount: number): string {
  return format.currency(amount, "USD", WHOLE);
}

export function planPriceIn(format: Format, plan: PaidPlanId, interval: BillingInterval): string {
  return usdIn(format, PRICES_USD[plan][interval]);
}

export function trialPriceIn(format: Format): string {
  return usdIn(format, PRO_TRIAL.priceUsd);
}

// Under a dollar it reads in cents, as config/topup's centsText does.
export function centsIn(format: Format, cents: number): string {
  if (cents < 100) return `${cents}¢`;
  return usdIn(format, cents / 100);
}
