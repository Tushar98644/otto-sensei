import { ROUTES } from "@/components/site/routes";
import { FEATURE_LABELS, PLANS, PRO_TRIAL } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { planPrice, trialPrice } from "@/lib/billing/prices";
import { cn } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import { Section, SectionHeader, SectionLink } from "./section";

type TeaserPlan = { name: string; price: string; per?: string; text: string };

export function PricingTeaser() {
  const { free, pro } = PLANS;
  const plans: readonly TeaserPlan[] = [
    {
      name: free.name,
      price: "$0",
      text: `Check, fix and download one resume as a PDF, with ${free.limits.fix} ${FEATURE_LABELS.fix} a month from Otto.`,
    },
    {
      name: pro.name,
      price: planPrice("pro", "month"),
      per: "/month",
      text: `Tailoring, cover letters, every job match and the full tracker. ${
        trialOffered() ? `Try ${PRO_TRIAL.days} days for ${trialPrice()}.` : "Cancel anytime."
      }`,
    },
  ];
  return (
    <Section labelledBy="pricing-teaser-title">
      <SectionHeader
        id="pricing-teaser-title"
        eyebrow="Pricing"
        title={
          <>
            Free for the basics.{" "}
            <em className={cn("block", displayItalic.className)}>More when the hunt gets busy.</em>
          </>
        }
      />
      <ul
        role="list"
        className="mt-12 grid divide-y divide-border border-y border-border sm:mt-16 md:grid-cols-2 md:divide-x md:divide-y-0"
      >
        {plans.map((plan) => (
          <li
            key={plan.name}
            className="flex flex-col gap-3 py-8 md:px-10 md:py-10 md:first:pl-0 md:last:pr-0"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="font-display text-3xl/9 font-normal text-ink sm:text-4xl/10">
                {plan.name}
              </h3>
              <p className="text-2xl/8 font-semibold text-ink lining-nums tabular-nums">
                {plan.price}
                {plan.per ? (
                  <span className="text-base font-normal text-muted">{plan.per}</span>
                ) : null}
              </p>
            </div>
            <p className="max-w-prose text-base/7 text-pretty text-muted">{plan.text}</p>
          </li>
        ))}
      </ul>
      <SectionLink href={ROUTES.pricing}>See pricing</SectionLink>
    </Section>
  );
}
