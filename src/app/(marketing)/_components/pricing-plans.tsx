"use client";

import { useId, useState, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import {
  BILLING_INTERVALS,
  isTrialing,
  PLAN_ORDER,
  PRICES_USD,
  PRO_TRIAL,
  REFERENCE_MONTHLY_USD,
  referenceDiscountPercent,
  SHOW_REFERENCE_PRICES,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import {
  endsTrialSentence,
  INTERVAL_NAMES,
  perMonth,
  pizzaLine,
  proComparison,
  trialSentence,
  yearlySavingsPercent,
} from "@/lib/billing/prices";
import type { JobCounts } from "@/lib/job-feed/counts";
import { cn } from "@/lib/utils";
import { PlanCard, plansPanelClasses, type PlanPrice } from "./plan-card";
import { planCta } from "./plan-ctas";
import { formatUsd } from "./plan-features";

export type PricingPlansProps = {
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial?: boolean;
  headingAs?: "h2" | "h3";
  otto?: ReactNode;
  jobCounts?: JobCounts;
  className?: string;
};

const PERIOD: Record<BillingInterval, { short: string; spoken: string }> = {
  month: { short: "/month", spoken: "per month" },
  year: { short: "/year", spoken: "per year" },
};

export function PricingPlans({
  offer,
  trial: trialOnSale = false,
  headingAs,
  otto,
  jobCounts,
  className,
}: PricingPlansProps) {
  const name = useId();
  const { me, user } = useMe();
  const trial = me ? me.billing.trial === true : trialOnSale;
  const proTrialing = user !== null && user.plan === "pro" && isTrialing(user);
  const intervals = BILLING_INTERVALS.filter((interval) =>
    (["pro", "max"] as const).some((plan) => offer[plan].includes(interval)),
  );
  const [picked, setPicked] = useState<BillingInterval>("month");
  const plans = PLAN_ORDER.filter((plan) => plan === "free" || offer[plan].length > 0);

  function priceFor(plan: PlanId): {
    price: PlanPrice;
    interval: BillingInterval;
    note: string | null;
  } {
    if (plan === "free") {
      return {
        price: { amount: formatUsd(0), ...periodOf("month") },
        interval: "month",
        note: null,
      };
    }
    const interval = offer[plan].includes(picked) ? picked : "month";
    const price: PlanPrice = {
      amount: formatUsd(PRICES_USD[plan][interval]),
      ...periodOf(interval),
    };
    let note: string | null = null;
    if (interval === "month") {
      if (SHOW_REFERENCE_PRICES) {
        price.reference = formatUsd(REFERENCE_MONTHLY_USD[plan]);
        price.badge = `${referenceDiscountPercent(plan)}% off`;
      }
      if (plan === "pro") {
        price.comparison = proComparison() ?? undefined;
        note = pizzaLine();
      }
    }
    if (interval === "year") {
      const savings = yearlySavingsPercent(plan);
      if (savings > 0) price.badge = `Save ${savings}% vs monthly`;
      note = `About ${perMonth(plan)} a month, instead of ${formatUsd(PRICES_USD[plan].month * 12)} a year paid monthly.`;
    } else if (picked !== interval) {
      note = `Sold monthly only, for now.`;
    }
    return { price, interval, note };
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {intervals.length > 1 || otto ? (
        <div className="flex items-end justify-center gap-4">
          {otto ? (
            <span aria-hidden className="shrink-0 max-sm:hidden">
              {otto}
            </span>
          ) : null}
          {intervals.length > 1 ? (
            <fieldset className="self-center">
              <legend className="sr-only">How often to pay</legend>
              <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
                {intervals.map((interval) => (
                  <label key={interval} className="relative">
                    <input
                      type="radio"
                      name={name}
                      value={interval}
                      checked={picked === interval}
                      onChange={() => setPicked(interval)}
                      className="peer sr-only"
                    />
                    <span className="flex h-11 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
                      {INTERVAL_NAMES[interval]}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      ) : null}
      <div className={plansPanelClasses(plans.length)}>
        {plans.map((plan) => {
          const { price, interval, note } = priceFor(plan);
          const onTrial = trial && plan === PRO_TRIAL.plan && interval === PRO_TRIAL.interval;
          const endsTrial = proTrialing && plan === "max";
          const cta = planCta(plan, interval, onTrial);
          return (
            <PlanCard
              key={plan}
              planId={plan}
              headingAs={headingAs}
              featured={plan === "pro"}
              price={price}
              cta={endsTrial ? { ...cta, label: "Start Max now" } : cta}
              priceNote={note}
              jobCounts={jobCounts}
              note={
                onTrial
                  ? trialSentence()
                  : endsTrial
                    ? endsTrialSentence("max", interval)
                    : undefined
              }
            />
          );
        })}
      </div>
      <p className="text-center text-sm text-muted">
        Fair limits on every AI feature, all listed in the{" "}
        <TextLink href={ROUTES.terms}>terms</TextLink>.
      </p>
    </div>
  );
}

function periodOf(interval: BillingInterval): { period: string; spoken: string } {
  return { period: PERIOD[interval].short, spoken: PERIOD[interval].spoken };
}
