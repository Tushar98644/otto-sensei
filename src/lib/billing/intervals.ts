import {
  BILLING_INTERVALS,
  PAID_PLANS,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { env } from "@/lib/env";
import { billingMode } from "./mode";

// Server-only. The paid products, one per plan and billing interval. Apart from ./index so the
// pricing page can read them without loading the payment SDK.

export function productId(plan: PaidPlanId, interval: BillingInterval): string | undefined {
  const e = env();
  if (plan === "max") {
    if (interval === "year") return e.DODO_PAYMENTS_MAX_PRODUCT_ID_YEARLY;
    if (interval === "week") return e.DODO_PAYMENTS_MAX_PRODUCT_ID_WEEKLY;
    return e.DODO_PAYMENTS_MAX_PRODUCT_ID;
  }
  if (interval === "year") return e.DODO_PAYMENTS_PRODUCT_ID_YEARLY;
  if (interval === "week") return e.DODO_PAYMENTS_PRODUCT_ID_WEEKLY;
  return e.DODO_PAYMENTS_PRODUCT_ID;
}

/**
 * The plan's billing options whose product id is set, monthly first. Pro monthly is always
 * listed: billingMode() decides whether checkout works at all. Empty for a plan not on sale.
 */
export function offeredIntervals(plan: PaidPlanId = "pro"): BillingInterval[] {
  // Mock checkout (development without Dodo keys) can sell every option, so every card shows.
  if (billingMode() === "mock") return [...BILLING_INTERVALS];
  return BILLING_INTERVALS.filter(
    (interval) =>
      (plan === "pro" && interval === "month") || productId(plan, interval) !== undefined,
  );
}

export type BillingOffer = Record<PaidPlanId, BillingInterval[]>;

export function billingOffer(): BillingOffer {
  return { pro: offeredIntervals("pro"), max: offeredIntervals("max") };
}

/** What a Dodo product sells: a paid plan, and how often it bills. */
export type ProductPlan = { plan: PaidPlanId; interval: BillingInterval };

/** The plan and billing interval a Dodo product sells, or null for a product that isn't ours. */
export function planForProduct(id: string | null | undefined): ProductPlan | null {
  if (!id) return null;
  for (const plan of PAID_PLANS) {
    const interval = BILLING_INTERVALS.find((candidate) => productId(plan, candidate) === id);
    if (interval) return { plan, interval };
  }
  return null;
}

/** Every configured paid product id. A subscription to any of them is a paid plan. */
export function paidProductIds(): string[] {
  return PAID_PLANS.flatMap((plan) =>
    BILLING_INTERVALS.map((interval) => productId(plan, interval)),
  ).filter((id): id is string => id !== undefined);
}
