import type { Metadata } from "next";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { PAID_PLANS } from "@/config/plans";
import { creditPricingLine } from "@/config/topup";
import { billingOffer, creditOffered, trialOffered } from "@/lib/billing/intervals";
import { renewalPeriods } from "@/lib/billing/prices";
import { appUrl } from "@/lib/env";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { faqJsonLd, softwareJsonLd } from "@/lib/seo/json-ld";
import { pricingPage } from "@/lib/seo-pages/pages";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { plansOnSale } from "../_components/plan-features";
import { PricingPlans } from "../_components/pricing-plans";
import { ClosingPanel } from "./_components/closing-panel";
import { PlanTable } from "./_components/plan-table";
import { BILLING_FAQ, CREDIT_FAQ } from "./billing-faq";

export function generateMetadata(): Metadata {
  return pageMetadata(pricingPage(trialOffered()));
}

export const revalidate = 3600;

export default async function PricingPage() {
  const offer = billingOffer();
  const jobCounts = await loadJobCounts();
  const trial = trialOffered();
  const plans = plansOnSale(offer);
  const renewals = [...new Set(PAID_PLANS.flatMap((plan) => offer[plan]))];
  const credit = creditOffered();
  const faq = credit ? [...BILLING_FAQ, CREDIT_FAQ] : BILLING_FAQ;
  return (
    <div className="container-page pt-16 pb-24 sm:pt-24 sm:pb-32">
      <JsonLd data={softwareJsonLd(offer, appUrl())} />
      <JsonLd data={faqJsonLd(faqEntries(faq))} />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
          Free for the basics.{" "}
          <em className={cn("block", displayItalic.className)}>More when the hunt gets busy.</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg/7 text-pretty text-muted sm:text-xl/8">
          Checking, fixing and downloading are free. Pro adds Otto&apos;s AI help, every job match
          and the tracker.
        </p>
      </div>

      <PricingPlans
        offer={offer}
        trial={trial}
        headingAs="h2"
        otto={<Otto pose="point" size={96} />}
        jobCounts={jobCounts}
        className="mx-auto mt-16 max-w-6xl"
      />
      <OttoNote
        size="sm"
        live={false}
        message={OTTO.pricing.samePrinciples}
        className="mx-auto mt-8 w-fit max-w-xl"
      />
      <p className="mt-6 text-center text-sm text-subtle">
        Prices in US dollars. Taxes may apply. Paid plans renew each {renewalPeriods(renewals)}{" "}
        until you cancel.
      </p>
      {credit ? (
        <p className="mt-2 text-center text-sm text-subtle">{creditPricingLine()}</p>
      ) : null}

      <PlanTable plans={plans} className="mt-24 sm:mt-32" />

      <section
        aria-labelledby="billing-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2
          id="billing-faq-title"
          className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13"
        >
          Billing questions
        </h2>
        <FaqList items={faq} className="lg:col-span-2" />
      </section>

      <ClosingPanel offer={offer} trial={trial} className="mt-24 sm:mt-32" />
    </div>
  );
}
