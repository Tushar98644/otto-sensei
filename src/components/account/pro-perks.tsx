import { Check } from "lucide-react";
import {
  allowancePeriodFor,
  FEATURE_LABELS,
  FEATURES,
  PLANS,
  planLimits,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { perPeriod } from "@/lib/usage-copy";
import { cn } from "@/lib/utils";

const count = new Intl.NumberFormat("en-US");

export type PlanPerksProps = {
  plan: PaidPlanId;
  // The billing option being offered: a weekly one gives weekly limits.
  interval?: BillingInterval;
  className?: string;
};

// What a paid plan gives each period next to the plan below it, read from PLANS so the copy can't
// drift from the real limits.
export function PlanPerks({ plan, interval = "month", className }: PlanPerksProps) {
  const period = allowancePeriodFor(plan, interval);
  const limits = planLimits(plan, period);
  const belowId = plan === "max" ? "pro" : "free";
  // Free is monthly even next to a weekly option, so its period is named when they differ.
  const belowPeriod = allowancePeriodFor(belowId, interval);
  const below = planLimits(belowId, belowPeriod);
  const belowSuffix = belowPeriod === period ? "" : ` ${perPeriod(belowPeriod)}`;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ul className="flex flex-col gap-3">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="font-medium text-ink">
                {count.format(limits[feature])} {FEATURE_LABELS[feature]} {perPeriod(period)}
              </p>
              <p className="text-muted">
                {PLANS[belowId].name} has {count.format(below[feature])}
                {belowSuffix}.
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {period === "week"
          ? "Limits reset each billing week, when the plan renews."
          : "Limits reset on the 1st."}{" "}
        Uploads past the AI reads still work, read by the basic reader. PDF downloads stay free on
        every plan.
      </p>
    </div>
  );
}
