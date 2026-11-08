import {
  FEATURE_LABELS,
  FEATURES,
  PLANS,
  planLimits,
  type AllowancePeriod,
  type Feature,
  type PlanId,
} from "@/config/plans";
import { periodNoun, perPeriod } from "@/lib/usage-copy";

// Pricing copy shared by the landing teaser, /pricing and the terms. Numbers come from PLANS, so
// changing a limit or price there updates every page.

export type PlanCopy = {
  summary: string;
  // A plain line above the feature list, e.g. "Everything in Free, plus:".
  lead?: string;
  features: readonly string[];
  // The small gray line under the plan's button.
  note: string;
};

export { PLAN_ORDER } from "@/config/plans";

const count = new Intl.NumberFormat("en-US");

// Free has only monthly allowances, whatever the switch on the pricing page says.
function periodOf(plan: PlanId, period: AllowancePeriod): AllowancePeriod {
  return PLANS[plan].weeklyLimits ? period : "month";
}

/** "60 tailored versions a month", or "15 tailored versions a week" on a weekly plan. */
export function limitLine(plan: PlanId, feature: Feature, period: AllowancePeriod = "month"): string {
  const kind = periodOf(plan, period);
  return `${count.format(planLimits(plan, kind)[feature])} ${FEATURE_LABELS[feature]} ${perPeriod(kind)}`;
}

const limitLines = (plan: PlanId, period: AllowancePeriod) =>
  FEATURES.map((feature) => limitLine(plan, feature, period));

/** A plan card's copy for the allowance its picked billing option gives. */
export function planCopy(plan: PlanId, period: AllowancePeriod = "month"): PlanCopy {
  const each = `each ${periodNoun(periodOf(plan, period))}`;
  switch (plan) {
    case "free":
      return {
        summary: "Everything you need for one great resume.",
        features: ["Editing, recruiter checks and PDF downloads, at no cost", ...limitLines("free", "month")],
        note: "No card needed",
      };
    case "pro":
      return {
        summary: "For a busy job hunt with lots of applications.",
        lead: `Everything in Free, with more ${each}:`,
        features: limitLines("pro", period),
        note: "Cancel anytime from your account",
      };
    case "max":
      return {
        summary: "For a long search, or many roles at once.",
        lead: `Everything in Pro, with more ${each}:`,
        features: limitLines("max", period),
        note: "Cancel anytime from your account",
      };
  }
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

// "$15", or "$12.50" if a price ever has cents.
export function formatUsd(amount: number): string {
  return usd.format(amount);
}
