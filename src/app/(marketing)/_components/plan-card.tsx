import { Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { PLANS, type AllowancePeriod, type PlanId } from "@/config/plans";
import { cn } from "@/lib/utils";
import { planCopy } from "./plan-features";

// The stone panel that holds the plans. Side by side, each card is a subgrid over the same four
// rows (name, summary, price and button, features), so a summary that wraps on one card can't push
// that card's price and button lower than the others'.
export function plansPanelClasses(count: number): string {
  return cn(
    "grid gap-3 rounded-3xl bg-surface-muted p-3 sm:p-6",
    count >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
  );
}

export type PlanPrice = {
  // "$15"
  amount: string;
  // "/month"
  period: string;
  // Read out instead of the period: "per month".
  spoken: string;
};

export type PlanCardProps = {
  planId: PlanId;
  // h3 inside a landing page section, h2 on /pricing where the plans are the page's main content.
  headingAs?: "h2" | "h3";
  // Gives the card the ink badge and its button the primary style.
  featured?: boolean;
  price: PlanPrice;
  // The allowance the shown price buys: weekly options list weekly limits.
  allowance?: AllowancePeriod;
  cta: { href: string; label: string };
  // One more small line under the button, e.g. the monthly equivalent of a yearly price.
  priceNote?: string | null;
  className?: string;
};

// A white card for plansPanelClasses: never straight on the page.
export function PlanCard({
  planId,
  headingAs: Heading = "h3",
  featured = false,
  price,
  allowance = "month",
  cta,
  priceNote,
  className,
}: PlanCardProps) {
  const plan = PLANS[planId];
  const copy = planCopy(planId, allowance);
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-surface p-6 sm:p-8 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:gap-0",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <Heading className="font-display text-3xl/9 font-normal text-ink sm:text-4xl/10">
          {plan.name}
        </Heading>
        {featured ? <Badge variant="ink">Most popular</Badge> : null}
      </div>
      <p className="mt-2 text-base/7 text-muted">{copy.summary}</p>
      <div className="mt-6">
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-ink lining-nums tabular-nums">
            {price.amount}
          </span>
          <span aria-hidden="true" className="text-base text-muted">
            {price.period}
          </span>
          <span className="sr-only">{price.spoken}</span>
        </p>
        <Link
          href={cta.href}
          className={buttonClasses({
            variant: featured ? "primary" : "secondary",
            size: "lg",
            className: "mt-6 w-full",
          })}
        >
          {cta.label}
        </Link>
        <p className="mt-3 text-center text-sm text-subtle">{copy.note}</p>
        {/* Under the button, so every card's button stays level. */}
        {priceNote ? <p className="mt-1 text-center text-sm text-muted">{priceNote}</p> : null}
      </div>
      <div className="mt-6 border-t border-border pt-6">
        {copy.lead ? <p className="mb-3 text-base font-medium text-ink">{copy.lead}</p> : null}
        <ul className="flex flex-col gap-3">
          {copy.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-base text-ink">
              <Check className="mt-0.5 size-5 shrink-0 text-ink" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
