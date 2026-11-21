"use client";

import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { closingCta } from "../../_components/plan-ctas";
import { usePlanViewer } from "../../_components/pricing-plans";

export function ClosingPanel({
  offer,
  trial: trialOnSale,
  className,
}: {
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial: boolean;
  className?: string;
}) {
  const { viewer, trial } = usePlanViewer();
  const cta = closingCta({ offer, trial: trial ?? trialOnSale, viewer });
  if (!cta) return null;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-3xl bg-surface-muted px-6 py-10 sm:flex-row sm:gap-6",
        className,
      )}
    >
      <IntentLink href={cta.href} className={buttonClasses({ variant: "primary", size: "lg" })}>
        {cta.label}
      </IntentLink>
      <TextLink href={ROUTES.studio} className="inline-flex min-h-11 items-center text-base">
        Or check your resume free
      </TextLink>
    </div>
  );
}
