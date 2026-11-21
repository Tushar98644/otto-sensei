"use client";

import { useId, useState, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import {
  isPaidPlan,
  PRICES_USD,
  REFERENCE_MONTHLY_USD,
  referenceDiscountPercent,
  SHOW_REFERENCE_PRICES,
  type BillingInterval,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import { INTERVAL_NAMES, yearlySavingsPercent } from "@/lib/billing/prices";
import type { JobCounts } from "@/lib/job-feed/counts";
import { cn } from "@/lib/utils";
import { PlanCard, plansPanelClasses, type PlanPrice } from "./plan-card";
import { planCards, type PlanViewer } from "./plan-ctas";
import { formatUsd, plansOnSale } from "./plan-features";

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

// Phones stack the lead card first, so desktop puts each card back in plan order.
const DESKTOP_ORDER: Record<PlanId, string> = {
  free: "lg:order-1",
  pro: "lg:order-2",
  max: "lg:order-3",
};

export function usePlanViewer(): { viewer: PlanViewer | null; trial: boolean | null } {
  const { me, user } = useMe();
  if (!user) return { viewer: null, trial: me ? me.billing.trial === true : null };
  return {
    viewer: {
      plan: user.plan,
      interval: user.planInterval,
      trialEndsAt: user.trialEndsAt ?? null,
      cancelScheduled: me?.billing.cancelScheduled === true,
    },
    trial: me?.billing.trial === true,
  };
}

function priceOf(plan: PlanId, interval: BillingInterval): PlanPrice {
  if (!isPaidPlan(plan)) return { amount: formatUsd(0), ...periodOf("month") };
  const price: PlanPrice = { amount: formatUsd(PRICES_USD[plan][interval]), ...periodOf(interval) };
  if (interval === "month" && SHOW_REFERENCE_PRICES) {
    price.reference = formatUsd(REFERENCE_MONTHLY_USD[plan]);
    price.badge = `${referenceDiscountPercent(plan)}% off`;
  }
  if (interval === "year") {
    const savings = yearlySavingsPercent(plan);
    if (savings > 0) price.badge = `Save ${savings}% vs monthly`;
  }
  return price;
}

export function PricingPlans({
  offer,
  trial: trialOnSale = false,
  headingAs,
  otto,
  jobCounts,
  className,
}: PricingPlansProps) {
  const name = useId();
  const { viewer, trial } = usePlanViewer();
  const [picked, setPicked] = useState<BillingInterval>("month");
  const plans = plansOnSale(offer);
  const { cards, intervals, first } = planCards({
    plans,
    offer,
    picked,
    trial: trial ?? trialOnSale,
    viewer,
  });
  const ordered = first
    ? [
        ...cards.filter((card) => card.plan === first),
        ...cards.filter((card) => card.plan !== first),
      ]
    : cards;

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
        {ordered.map((card) => (
          <PlanCard
            key={card.plan}
            planId={card.plan}
            headingAs={headingAs}
            badge={card.badge}
            price={priceOf(card.plan, card.interval)}
            cta={card.cta}
            manage={card.manage}
            notes={card.notes}
            jobCounts={jobCounts}
            className={first ? DESKTOP_ORDER[card.plan] : undefined}
          />
        ))}
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
