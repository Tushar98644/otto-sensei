"use client";

import type { ReactNode } from "react";
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
  note,
  className,
}: {
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial: boolean;
  note?: ReactNode;
  className?: string;
}) {
  const { viewer, trial } = usePlanViewer();
  const cta = closingCta({ offer, trial: trial ?? trialOnSale, viewer });
  if (!cta) return null;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-8 rounded-3xl bg-surface-muted px-6 py-12",
        className,
      )}
    >
      {note ? <div className="max-w-xl">{note}</div> : null}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <IntentLink href={cta.href} className={buttonClasses({ variant: "primary", size: "lg" })}>
          {cta.label}
        </IntentLink>
        <TextLink href={ROUTES.studio} className="inline-flex min-h-11 items-center text-base">
          Or check your resume free
        </TextLink>
      </div>
    </div>
  );
}
