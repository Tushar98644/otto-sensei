import { ROUTES, upgradeHref } from "@/components/site/routes";
import { isTrialing, type BillingInterval, type PaidPlanId } from "@/config/plans";
import type { Me } from "./use-me";

/**
 * The billing option an upgrade link opens: the user's own interval when that plan sells it, so a
 * weekly subscriber is offered the next plan weekly, with the allowances they're used to.
 */
export function upgradeInterval(me: Me | null | undefined, plan: PaidPlanId): BillingInterval {
  const current = me?.user?.planInterval;
  return current && me?.billing.offer[plan].includes(current) ? current : "month";
}

/**
 * Where an upgrade link goes. Max bought during the Pro trial ends that trial the same day, so
 * those links go to pricing, whose Max card says so, instead of straight to checkout.
 */
export function upgradeLink(me: Me | null | undefined, plan: PaidPlanId): string {
  const user = me?.user;
  if (plan === "max" && user?.plan === "pro" && isTrialing(user)) return ROUTES.pricing;
  return upgradeHref(plan, upgradeInterval(me, plan));
}
