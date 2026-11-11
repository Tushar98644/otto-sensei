import { isPaidPlan, type PlanId } from "@/config/plans";

// Pure and client-safe. Portfolios are Pro and Max. A trial can build and preview one; going live
// needs a paid (not trial) Pro or Max subscription. No page carries an Otto Sensei line (owner
// decision, 2026-11-09), and no design credit either (2026-11-11): the MIT notices for the rebuilt
// designs are in THIRD_PARTY_NOTICES.md.

export function canBuildPortfolio(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function canPublishPortfolio(plan: PlanId, trialing: boolean): boolean {
  return isPaidPlan(plan) && !trialing;
}
