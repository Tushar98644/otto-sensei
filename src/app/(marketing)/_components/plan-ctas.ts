import { ROUTES, upgradeHref } from "@/components/site/routes";
import type { BillingInterval, PlanId } from "@/config/plans";

// Free sends people straight to the studio. A paid plan goes to the account page, which signs the
// visitor in first if needed and then opens checkout for that plan and billing option directly.
export function planCta(plan: PlanId, interval: BillingInterval): { href: string; label: string } {
  if (plan === "free") return { href: ROUTES.studio, label: "Check my resume, free" };
  return { href: upgradeHref(plan, interval), label: plan === "pro" ? "Get Pro" : "Get Max" };
}
