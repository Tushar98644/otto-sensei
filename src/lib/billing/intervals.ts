import {
  BILLING_INTERVALS,
  PAID_PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { env } from "@/lib/env";
import { billingMode } from "./mode";

// Server-only. The paid products, one per plan and billing interval, plus Pro monthly with the
// trial. Apart from ./index so the pricing page can read them without loading the payment SDK.

export function productId(plan: PaidPlanId, interval: BillingInterval): string | undefined {
  const e = env();
  if (plan === "max") {
    if (interval === "year") return e.CREEM_MAX_YEARLY_PRODUCT_ID;
    if (interval === "week") return e.CREEM_MAX_WEEKLY_PRODUCT_ID;
    return e.CREEM_MAX_MONTHLY_PRODUCT_ID;
  }
  if (interval === "year") return e.CREEM_PRO_YEARLY_PRODUCT_ID;
  if (interval === "week") return e.CREEM_PRO_WEEKLY_PRODUCT_ID;
  return e.CREEM_PRO_MONTHLY_PRODUCT_ID;
}

/** The Pro monthly product that starts with the paid trial, when one is set. */
export function trialProductId(): string | undefined {
  return env().CREEM_PRO_TRIAL_PRODUCT_ID;
}

/**
 * The plan's billing options whose product id is set, monthly first. Pro monthly is always
 * listed: billingMode() decides whether checkout works at all. Empty for a plan not on sale.
 */
export function offeredIntervals(plan: PaidPlanId = "pro"): BillingInterval[] {
  // Mock checkout (development without Creem keys) can sell every option, so every card shows.
  if (billingMode() === "mock") return [...BILLING_INTERVALS];
  return BILLING_INTERVALS.filter(
    (interval) =>
      (plan === "pro" && interval === "month") || productId(plan, interval) !== undefined,
  );
}

/** Whether new customers can start Pro on the trial here. Mock checkout always can. */
export function trialOffered(): boolean {
  const mode = billingMode();
  return mode === "mock" || (mode === "creem" && trialProductId() !== undefined);
}

export type BillingOffer = Record<PaidPlanId, BillingInterval[]>;

export function billingOffer(): BillingOffer {
  return { pro: offeredIntervals("pro"), max: offeredIntervals("max") };
}

/** What a Creem product sells: a paid plan, and how often it bills. */
export type ProductPlan = { plan: PaidPlanId; interval: BillingInterval };

/** The plan and billing interval a Creem product sells, or null for a product that isn't ours. */
export function planForProduct(id: string | null | undefined): ProductPlan | null {
  if (!id) return null;
  // After its trial the trial product simply bills Pro monthly.
  if (id === trialProductId()) return { plan: PRO_TRIAL.plan, interval: PRO_TRIAL.interval };
  for (const plan of PAID_PLANS) {
    const interval = BILLING_INTERVALS.find((candidate) => productId(plan, candidate) === id);
    if (interval) return { plan, interval };
  }
  return null;
}

/** Every configured paid product id, the trial's included. A subscription to any is a paid plan. */
export function paidProductIds(): string[] {
  return [
    ...PAID_PLANS.flatMap((plan) => BILLING_INTERVALS.map((interval) => productId(plan, interval))),
    trialProductId(),
  ].filter((id): id is string => id !== undefined);
}
