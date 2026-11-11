import { isPaidPlan, type PlanId } from "@/config/plans";

// Pro and Max, the trial included, can build and publish a portfolio (owner, 2026-11-11). A page
// whose owner drops to Free goes offline but stays saved.

export function canBuildPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function canPublishPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}
