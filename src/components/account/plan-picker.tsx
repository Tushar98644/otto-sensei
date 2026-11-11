"use client";

import { useId } from "react";
import { PLANS, type BillingInterval, type PaidPlanId } from "@/config/plans";
import { planPriceLabel } from "@/lib/billing/prices";
import { cn } from "@/lib/utils";
import { ReferencePrice } from "./reference-price";

export type PlanPickerProps = {
  plans: readonly PaidPlanId[];
  value: PaidPlanId;
  onChange: (plan: PaidPlanId) => void;
  interval: BillingInterval;
  offer?: Partial<Record<PaidPlanId, readonly BillingInterval[]>>;
  className?: string;
};

export function PlanPicker({ plans, value, onChange, interval, offer, className }: PlanPickerProps) {
  const name = useId();
  if (plans.length < 2) return null;
  const shownFor = (plan: PaidPlanId): BillingInterval =>
    !offer || offer[plan]?.includes(interval) ? interval : "month";
  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className="mb-2 text-sm font-medium text-ink">Plan</legend>
      <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
        {plans.map((plan) => (
          <label key={plan} className="relative min-w-0 flex-1">
            <input
              type="radio"
              name={name}
              value={plan}
              checked={value === plan}
              onChange={() => onChange(plan)}
              className="peer sr-only"
            />
            <span className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-control peer-checked:ring-1 peer-checked:ring-ink/5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink hover:text-ink">
              {PLANS[plan].name}
              <ReferencePrice plan={plan} interval={shownFor(plan)} />
              <span className="font-normal text-subtle tabular-nums">
                {planPriceLabel(plan, shownFor(plan))}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
