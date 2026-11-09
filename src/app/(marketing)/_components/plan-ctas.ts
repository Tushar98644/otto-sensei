import { ROUTES, upgradeHref } from "@/components/site/routes";
import { PRO_TRIAL, type BillingInterval, type PlanId } from "@/config/plans";
import { trialHeadline } from "@/lib/billing/prices";

// Free sends people straight to the studio. A paid plan goes to the account page, which signs the
// visitor in first if needed and then opens checkout for that plan and billing option directly
// (on the trial, for someone who hasn't had one).
export function planCta(
  plan: PlanId,
  interval: BillingInterval,
  trial = false,
): { href: string; label: string } {
  if (plan === "free") return { href: ROUTES.studio, label: "Check my resume, free" };
  if (trial && plan === PRO_TRIAL.plan && interval === PRO_TRIAL.interval) {
    return { href: upgradeHref(plan, interval), label: trialHeadline() };
  }
  return { href: upgradeHref(plan, interval), label: plan === "pro" ? "Get Pro" : "Get Max" };
}
