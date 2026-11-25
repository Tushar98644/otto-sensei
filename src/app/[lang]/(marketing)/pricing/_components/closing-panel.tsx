"use client";

import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import type { BillingInterval, PaidPlanId } from "@/config/plans";
import type { Locale } from "@/i18n/config";
import { formatFor } from "@/i18n/intl";
import { cn } from "@/lib/utils";
import { closingCta, type PlanMessages } from "../../_components/plan-ctas";
import { usePlanViewer } from "../../_components/pricing-plans";

export function ClosingPanel({
  t,
  locale,
  studioLabel,
  offer,
  trial: trialOnSale,
  className,
}: {
  t: PlanMessages;
  locale: Locale;
  studioLabel: string;
  offer: Record<PaidPlanId, readonly BillingInterval[]>;
  trial: boolean;
  className?: string;
}) {
  const { viewer, trial } = usePlanViewer();
  const cta = closingCta({
    t,
    format: formatFor(locale),
    offer,
    trial: trial ?? trialOnSale,
    viewer,
  });
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
        {studioLabel}
      </TextLink>
    </div>
  );
}
