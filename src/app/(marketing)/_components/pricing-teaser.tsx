import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { billingOffer } from "@/lib/billing/intervals";
import { PricingPlans } from "./pricing-plans";
import { Section, SectionHeader } from "./section";

export function PricingTeaser() {
  return (
    <Section labelledBy="pricing-teaser-title">
      <SectionHeader
        id="pricing-teaser-title"
        eyebrow="Pricing"
        title={
          <>
            Free for the basics. <em className="block">More when the hunt gets busy.</em>
          </>
        }
      >
        Checking, editing and PDF downloads never cost a thing.
      </SectionHeader>
      {/* Read when the page is built, like the rest of its config. */}
      <PricingPlans offer={billingOffer()} className="mt-12 sm:mt-16" />
      <Link
        href={ROUTES.pricing}
        className={buttonClasses({ variant: "ghost", className: "mt-6 -ml-5" })}
      >
        See pricing details
        <ArrowRight />
      </Link>
    </Section>
  );
}
