import { useMemo } from "react";
import { PLANS, PRO_TRIAL, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { useFormat, useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import EN_UPGRADE from "@/i18n/messages/en/upgrade";
import { planPrice } from "@/lib/billing/prices";
import { planPriceIn, trialPriceIn } from "./local-prices";

export type TrialUpgradeWords = Messages["upgrade"]["trial"];

// Moving up from the trial changes the plan in place: no checkout page, the card on file pays the full price at once.
export function trialUpgradeCopy(words: TrialUpgradeWords, format: Format) {
  const charge = (plan: PaidPlanId, interval: BillingInterval) =>
    fmt(words.charge, {
      price: planPriceIn(format, plan, interval),
      trial: trialPriceIn(format),
    });
  return {
    charge,
    notice: (plan: PaidPlanId, interval: BillingInterval) =>
      fmt(words.notice, {
        plan: PLANS[plan].name,
        trialPlan: PLANS[PRO_TRIAL.plan].name,
        charge: charge(plan, interval),
      }),
    paymentIssue: words.paymentIssue,
    // Dodo won't change a plan that's set to end, so the upgrade waits until it's resumed in the portal.
    resumeFirstNotice: (plan: PaidPlanId, onTrial: boolean) =>
      onTrial ? fmt(words.resumeTrial, { plan: PLANS[plan].name }) : words.resumePlan,
  };
}

export function useTrialUpgradeCopy() {
  const { trial } = useMessagesOr("upgrade", EN_UPGRADE);
  const format = useFormat();
  return useMemo(() => trialUpgradeCopy(trial, format), [trial, format]);
}

const ENGLISH = trialUpgradeCopy(EN_UPGRADE.trial, formatFor("en"));

export const trialUpgradeCharge = ENGLISH.charge;
export const trialUpgradeNotice = ENGLISH.notice;
export const PAYMENT_ISSUE_NOTICE = ENGLISH.paymentIssue;
export const resumeFirstNotice = ENGLISH.resumeFirstNotice;

export function trialUpgradeButton(plan: PaidPlanId, interval: BillingInterval): string {
  return `Pay ${planPrice(plan, interval)} and start ${PLANS[plan].name}`;
}
