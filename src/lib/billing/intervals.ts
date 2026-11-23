import {
  BILLING_INTERVALS,
  PAID_PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { env } from "@/lib/env";
import { isDodoId } from "./dodo-status";
import { billingMode } from "./mode";

function productIds(): Record<PaidPlanId, Partial<Record<BillingInterval, string>>> {
  const e = env();
  return {
    pro: { month: e.DODO_PRO_MONTHLY_PRODUCT_ID, year: e.DODO_PRO_YEARLY_PRODUCT_ID },
    max: { month: e.DODO_MAX_MONTHLY_PRODUCT_ID, year: e.DODO_MAX_YEARLY_PRODUCT_ID },
  };
}

export function productId(plan: PaidPlanId, interval: BillingInterval): string | undefined {
  return productIds()[plan][interval];
}

export function trialProductId(): string | undefined {
  return env().DODO_PRO_TRIAL_PRODUCT_ID;
}

export function topupProductId(): string | undefined {
  return env().DODO_TOPUP_PRODUCT_ID;
}

// Prepaid credit is shown and sold only once its product is set, in mock mode too.
export function creditOffered(): boolean {
  const mode = billingMode();
  const id = topupProductId();
  if (!id || mode === "disabled") return false;
  return mode === "mock" || isDodoId("pdt", id);
}

export function offeredIntervals(plan: PaidPlanId = "pro"): BillingInterval[] {
  if (billingMode() === "mock") return [...BILLING_INTERVALS];
  return BILLING_INTERVALS.filter(
    (interval) =>
      (plan === "pro" && interval === "month") || productId(plan, interval) !== undefined,
  );
}

export function trialOffered(): boolean {
  const mode = billingMode();
  return mode === "mock" || (mode === "dodo" && trialProductId() !== undefined);
}

export type BillingOffer = Record<PaidPlanId, BillingInterval[]>;

export function billingOffer(): BillingOffer {
  return { pro: offeredIntervals("pro"), max: offeredIntervals("max") };
}

export type ProductPlan = { plan: PaidPlanId; interval: BillingInterval };

export function planForProduct(id: string | null | undefined): ProductPlan | null {
  if (!id) return null;
  if (id === trialProductId()) return { plan: PRO_TRIAL.plan, interval: PRO_TRIAL.interval };
  for (const plan of PAID_PLANS) {
    const interval = BILLING_INTERVALS.find((candidate) => productId(plan, candidate) === id);
    if (interval) return { plan, interval };
  }
  return null;
}

export function paidProductIds(): string[] {
  return [
    ...PAID_PLANS.flatMap((plan) => BILLING_INTERVALS.map((interval) => productId(plan, interval))),
    trialProductId(),
  ].filter((id): id is string => id !== undefined);
}
