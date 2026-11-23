import { ROUTES } from "@/components/site/routes";
import { applicationLimit, FEATURE_LABELS, PLANS, PRO_TRIAL, resumeLimit } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { planPrice, trialPrice } from "@/lib/billing/prices";
import { cn, pluralize } from "@/lib/utils";
import { displayItalic } from "./display-italic";
import { Section, SectionHeader, SectionLink } from "./section";

const count = new Intl.NumberFormat("en-US");

export function PricingTeaser() {
  const { free, pro } = PLANS;
  return (
    <Section
      labelledBy="pricing-teaser-title"
      lazySize="[contain-intrinsic-size:auto_430px] sm:[contain-intrinsic-size:auto_360px]"
    >
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
      <ul role="list" className="mt-8 flex max-w-prose flex-col gap-3 text-lg/7 text-muted">
        <li>
          <strong className="font-medium text-ink">{free.name}:</strong> check, fix and download{" "}
          {pluralize(resumeLimit("free"), "resume")} as a PDF, with {free.limits.fix}{" "}
          {FEATURE_LABELS.fix} a month from Otto.
        </li>
        <li>
          <strong className="font-medium text-ink">
            {pro.name}, {planPrice("pro", "month")} a month:
          </strong>{" "}
          tailoring, cover letters, every job match, up to {count.format(resumeLimit("pro"))}{" "}
          resumes and {count.format(applicationLimit("pro"))} tracked applications.{" "}
          {trialOffered() ? `Try ${PRO_TRIAL.days} days for ${trialPrice()}.` : "Cancel anytime."}
        </li>
      </ul>
      <SectionLink href={ROUTES.pricing}>See pricing</SectionLink>
    </Section>
  );
}
