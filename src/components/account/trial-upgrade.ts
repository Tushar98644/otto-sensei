import { PLANS, PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { planPrice, trialPrice } from "@/lib/billing/prices";

// Moving up from the trial changes the plan in place: no checkout page, the card on file pays the full price at once.
export function trialUpgradeCharge(plan: PaidPlanId, interval: BillingInterval): string {
  return `You pay ${planPrice(plan, interval)} (plus any tax) right away, charged to your card on file. The ${trialPrice()} trial charge isn't taken off.`;
}

export function trialUpgradeNotice(plan: PaidPlanId, interval: BillingInterval): string {
  return `${PLANS[plan].name} starts now and your ${PLANS[PRO_TRIAL.plan].name} trial ends. ${trialUpgradeCharge(plan, interval)}`;
}

export function trialUpgradeButton(plan: PaidPlanId, interval: BillingInterval): string {
  return `Pay ${planPrice(plan, interval)} and start ${PLANS[plan].name}`;
}

export const PAYMENT_ISSUE_NOTICE =
  "Your last payment didn't go through, so you're on Free for now. Update your card in Manage billing to get your plan back.";

// Dodo won't change a plan that's set to end, so the upgrade waits until it's resumed in the portal.
export function resumeFirstNotice(plan: PaidPlanId, onTrial: boolean): string {
  return onTrial
    ? `Your trial is set to end. Resume it in Manage billing, then start ${PLANS[plan].name}.`
    : "Your plan is set to end. Resume it in Manage billing to change plans.";
}
