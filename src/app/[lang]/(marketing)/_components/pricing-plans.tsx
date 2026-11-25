"use client";

import { useId, useState, type ReactNode } from "react";
import { useMe } from "@/components/account/use-me";
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
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import { rich } from "@/i18n/rich";
import { yearlySavingsPercent } from "@/lib/billing/prices";
import type { JobCounts } from "@/lib/job-feed/counts";
import { cn } from "@/lib/utils";
import { PlanCard, plansPanelClasses, type PlanPrice } from "./plan-card";
import { planCards, type PlanMessages, type PlanViewer } from "./plan-ctas";
import { planCopy, plansOnSale } from "./plan-features";
import { usd } from "./price-copy";

export type PricingPlansProps = {
  t: PlanMessages;
  locale: Locale;
  termsHref: string;
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial?: boolean;
  headingAs?: "h2" | "h3";
  otto?: ReactNode;
  jobCounts?: JobCounts;
  className?: string;
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

function priceOf(
  t: PlanMessages,
  format: Format,
  plan: PlanId,
  interval: BillingInterval,
): PlanPrice {
  const period = (of: BillingInterval) => ({
    period: t.plans.period[of].short,
    spoken: t.plans.period[of].spoken,
  });
  if (!isPaidPlan(plan)) return { amount: usd(format, 0), ...period("month") };
  const price: PlanPrice = {
    amount: usd(format, PRICES_USD[plan][interval]),
    ...period(interval),
  };
  if (interval === "month" && SHOW_REFERENCE_PRICES) {
    price.reference = usd(format, REFERENCE_MONTHLY_USD[plan]);
    price.badge = fmt(t.plans.discount, {
      percent: format.number(referenceDiscountPercent(plan)),
    });
  }
  if (interval === "year") {
    const savings = yearlySavingsPercent(plan);
    if (savings > 0) price.badge = fmt(t.plans.yearlySavings, { percent: format.number(savings) });
  }
  return price;
}

export function PricingPlans({
  t,
  locale,
  termsHref,
  offer,
  trial: trialOnSale = false,
  headingAs,
  otto,
  jobCounts,
  className,
}: PricingPlansProps) {
  const name = useId();
  const format = formatFor(locale);
  const { viewer, trial } = usePlanViewer();
  const [picked, setPicked] = useState<BillingInterval>("month");
  const plans = plansOnSale(offer);
  const { cards, intervals, first } = planCards({
    t,
    format,
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
              <legend className="sr-only">{t.plans.howOften}</legend>
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
                      {t.prices.intervalNames[interval]}
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
            copy={planCopy(t, format, card.plan, "month", jobCounts)}
            labels={t.plans}
            headingAs={headingAs}
            badge={card.badge}
            price={priceOf(t, format, card.plan, card.interval)}
            cta={card.cta}
            manage={card.manage}
            notes={card.notes}
            className={first ? DESKTOP_ORDER[card.plan] : undefined}
          />
        ))}
      </div>
      <p className="text-center text-sm text-muted">
        {rich(t.plans.fairLimits, {
          link: (chunk) => <TextLink href={termsHref}>{chunk}</TextLink>,
        })}
      </p>
    </div>
  );
}
