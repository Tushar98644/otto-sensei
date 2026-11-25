"use client";

import {
  REFERENCE_MONTHLY_USD,
  SHOW_REFERENCE_PRICES,
  type BillingInterval,
  type PaidPlanId,
} from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { usdIn } from "./local-prices";

export function ReferencePrice({
  plan,
  interval,
  className,
}: {
  plan: PaidPlanId;
  interval: BillingInterval;
  className?: string;
}) {
  const { referencePrice } = useMessages("upgrade").offer;
  const format = useFormat();
  if (!SHOW_REFERENCE_PRICES || interval !== "month") return null;
  return (
    <s className={cn("font-normal text-subtle tabular-nums", className)}>
      <span className="sr-only">{`${referencePrice} `}</span>
      {usdIn(format, REFERENCE_MONTHLY_USD[plan])}
    </s>
  );
}
