import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { billingOffer, trialOffered } from "@/lib/billing/intervals";
import { countClaim, type JobCounts } from "@/lib/job-feed/counts";
import { PricingPlans } from "./pricing-plans";
import { Section, SectionHeader } from "./section";

export function PricingTeaser({ jobCounts }: { jobCounts: JobCounts }) {
  const open = countClaim(jobCounts.open);
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
        Checking, fixing and downloading one resume as a PDF never costs a thing. Otto&apos;s AI
        help, every match from {open ? `${open} open jobs` : "open jobs"} and the full tracker come
        with Pro, and you can try it free for 3 days.
      </SectionHeader>
      <PricingPlans
        offer={billingOffer()}
        trial={trialOffered()}
        jobCounts={jobCounts}
        className="mt-12 sm:mt-16"
      />
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
