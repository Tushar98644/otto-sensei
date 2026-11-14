import {
  BILLING_INTERVALS,
  PAID_PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { env } from "@/lib/env";
import { billingMode } from "./mode";

function priceIds(): Record<PaidPlanId, Partial<Record<BillingInterval, string>>> {
  const e = env();
  return {
    pro: { month: e.PADDLE_PRO_MONTHLY_PRICE_ID, year: e.PADDLE_PRO_YEARLY_PRICE_ID },
    max: { month: e.PADDLE_MAX_MONTHLY_PRICE_ID, year: e.PADDLE_MAX_YEARLY_PRICE_ID },
  };
}

export function priceId(plan: PaidPlanId, interval: BillingInterval): string | undefined {
  return priceIds()[plan][interval];
}

export function trialPriceId(): string | undefined {
  return env().PADDLE_PRO_TRIAL_PRICE_ID;
}

export function offeredIntervals(plan: PaidPlanId = "pro"): BillingInterval[] {
  if (billingMode() === "mock") return [...BILLING_INTERVALS];
  return BILLING_INTERVALS.filter(
    (interval) =>
      (plan === "pro" && interval === "month") || priceId(plan, interval) !== undefined,
  );
}

export function trialOffered(): boolean {
  const mode = billingMode();
  return mode === "mock" || (mode === "paddle" && trialPriceId() !== undefined);
}

export type BillingOffer = Record<PaidPlanId, BillingInterval[]>;

export function billingOffer(): BillingOffer {
  return { pro: offeredIntervals("pro"), max: offeredIntervals("max") };
}

export type ProductPlan = { plan: PaidPlanId; interval: BillingInterval };

export function planForPrice(id: string | null | undefined): ProductPlan | null {
  if (!id) return null;
  if (id === trialPriceId()) return { plan: PRO_TRIAL.plan, interval: PRO_TRIAL.interval };
  for (const plan of PAID_PLANS) {
    const interval = BILLING_INTERVALS.find((candidate) => priceId(plan, candidate) === id);
    if (interval) return { plan, interval };
  }
  return null;
}

export function paidPriceIds(): string[] {
  return [
    ...PAID_PLANS.flatMap((plan) => BILLING_INTERVALS.map((interval) => priceId(plan, interval))),
    trialPriceId(),
  ].filter((id): id is string => id !== undefined);
}
