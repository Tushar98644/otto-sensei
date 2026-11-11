import { ROUTES, upgradeHref } from "@/components/site/routes";
import { isTrialing, type BillingInterval, type PaidPlanId } from "@/config/plans";
import type { Me } from "./use-me";

// The user's own interval when that plan sells it, so a weekly subscriber is offered weekly.
export function upgradeInterval(me: Me | null | undefined, plan: PaidPlanId): BillingInterval {
  const current = me?.user?.planInterval;
  return current && me?.billing.offer[plan].includes(current) ? current : "month";
}

// Max bought during the Pro trial ends the trial the same day, so those links go to pricing
// (whose Max card says so) instead of checkout.
export function upgradeLink(me: Me | null | undefined, plan: PaidPlanId): string {
  const user = me?.user;
  if (plan === "max" && user?.plan === "pro" && isTrialing(user)) return ROUTES.pricing;
  return upgradeHref(plan, upgradeInterval(me, plan));
}
