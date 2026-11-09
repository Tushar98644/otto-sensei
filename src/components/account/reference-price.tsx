import {
  REFERENCE_MONTHLY_USD,
  SHOW_REFERENCE_PRICES,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { cn } from "@/lib/utils";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

// The struck-through reference price before a monthly price ("$33" before "$15/month"). Monthly
// only, and nothing at all while SHOW_REFERENCE_PRICES is off (see src/config/plans.ts).
export function ReferencePrice({
  plan,
  interval,
  className,
}: {
  plan: PaidPlanId;
  interval: BillingInterval;
  className?: string;
}) {
  if (!SHOW_REFERENCE_PRICES || interval !== "month") return null;
  return (
    <s className={cn("font-normal text-subtle tabular-nums", className)}>
      <span className="sr-only">Reference price </span>
      {usd.format(REFERENCE_MONTHLY_USD[plan])}
    </s>
  );
}
