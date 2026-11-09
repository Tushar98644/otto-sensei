"use client";

import { useId, useState, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import {
  allowancePeriodFor,
  BILLING_INTERVALS,
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
  INTERVAL_NAMES,
  perMonth,
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
  // How often each paid plan can bill here (src/lib/billing/intervals.ts), read when the page is
  // built. A plan with none isn't on sale and gets no card.
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  // Whether Pro monthly starts with the free trial here, read when the page is built. Once
  // /api/me answers, someone who has already trialed or paid sees the normal price instead.
  trial?: boolean;
  headingAs?: "h2" | "h3";
  // Otto pointing at the switch (the pricing page only). Decorative.
  otto?: ReactNode;
  // Live job counts for Pro's jobs line (src/lib/job-feed/live-counts.ts), read when the page is
  // built and revalidated.
  jobCounts?: JobCounts;
  className?: string;
};

const PERIOD: Record<BillingInterval, { short: string; spoken: string }> = {
  month: { short: "/month", spoken: "per month" },
  year: { short: "/year", spoken: "per year" },
  week: { short: "/week", spoken: "per week" },
};

// The plans with a Monthly / Yearly / Weekly switch. Each paid card shows the price and allowances
// for the picked option (or monthly, when that plan isn't sold that way) and its button goes
// straight to that checkout.
export function PricingPlans({
  offer,
  trial: trialOnSale = false,
  headingAs,
  otto,
  jobCounts,
  className,
}: PricingPlansProps) {
  const name = useId();
  const { me } = useMe();
  const trial = me ? me.billing.trial === true : trialOnSale;
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
      if (plan === "pro") price.comparison = proComparison() ?? undefined;
    }
    if (interval === "year") {
      // A real saving, from the prices themselves: $120 a year against 12 x $15.
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
          return (
            <PlanCard
              key={plan}
              planId={plan}
              headingAs={headingAs}
              featured={plan === "pro"}
              price={price}
              allowance={allowancePeriodFor(plan, interval)}
              cta={planCta(plan, interval, onTrial)}
              priceNote={note}
              jobCounts={jobCounts}
              note={onTrial ? trialSentence() : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

function periodOf(interval: BillingInterval): { period: string; spoken: string } {
  return { period: PERIOD[interval].short, spoken: PERIOD[interval].spoken };
}
