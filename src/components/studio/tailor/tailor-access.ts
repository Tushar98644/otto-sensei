import { currentPlan, meSnapshot } from "@/components/account/use-me";
import { planIncludes, type PlanId, type Usage } from "@/config/plans";

// Free tailors only when its allowance has room; a plan that can't be read leaves the decision to the server.
export function canTailor(plan: PlanId | null, allowance: Usage | null | undefined): boolean {
  if (plan === null || planIncludes(plan, "tailor")) return true;
  return allowance != null && allowance.used < allowance.limit;
}

export async function tailorIncluded(): Promise<boolean> {
  const plan = await currentPlan();
  return canTailor(plan, meSnapshot().me?.usage?.tailor);
}
