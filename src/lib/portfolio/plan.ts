import { isPaidPlan, type PlanId } from "@/config/plans";

export function canBuildPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function canPublishPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}
