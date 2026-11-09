import { isPaidPlan, type PlanId } from "@/config/plans";

// Pure and client-safe. Portfolios are Pro and Max. A trial can build and preview one; going live
// needs a paid (not trial) Pro or Max subscription. Pro and Max may also take the "Made with
// Otto Sensei" line off it.

export function canBuildPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function canPublishPortfolio(plan: PlanId, trialing: boolean): boolean {
  return isPaidPlan(plan) && !trialing;
}

export function canHideCredit(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

// Read against the owner's plan when the page renders, so a plan that ends brings the line back
// without anyone editing the page.
export function showsCredit(hideCredit: boolean, ownerPlan: PlanId): boolean {
  return !(hideCredit && canHideCredit(ownerPlan));
}
