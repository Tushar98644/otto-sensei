import type { BillingInterval, PaidPlanId } from "@/config/plans";
import type { Me } from "./use-me";

/**
 * The billing option an upgrade link opens: the user's own interval when that plan sells it, so a
 * weekly subscriber is offered the next plan weekly, with the allowances they're used to.
 */
export function upgradeInterval(me: Me | null | undefined, plan: PaidPlanId): BillingInterval {
  const current = me?.user?.planInterval;
  return current && me?.billing.offer[plan].includes(current) ? current : "month";
}
