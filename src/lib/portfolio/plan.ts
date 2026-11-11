import { isPaidPlan, type PlanId } from "@/config/plans";

// A page whose owner drops to Free goes offline but stays saved.

export function canBuildPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function canPublishPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}
