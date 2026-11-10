import { isPaidPlan, type PlanId } from "@/config/plans";

// Pure and client-safe. Portfolios are Pro and Max. A trial can build and preview one; going live
// needs a paid (not trial) Pro or Max subscription. No page carries an Otto Sensei line (owner
// decision, 2026-11-09); the "Design based on …" credit to each template's author always shows.

export function canBuildPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function canPublishPortfolio(plan: PlanId, trialing: boolean): boolean {
  return isPaidPlan(plan) && !trialing;
}
