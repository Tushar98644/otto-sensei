import type { Metadata } from "next";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import {
  FEATURE_LABELS,
  FEATURES,
  FREE_JOB_MATCHES,
  PAID_PLANS,
  PLANS,
  PRO_TRIAL,
} from "@/config/plans";
import { billingOffer, trialOffered } from "@/lib/billing/intervals";
import { planPriceLabel, renewalPeriods } from "@/lib/billing/prices";
import { appUrl } from "@/lib/env";
import { countClaim } from "@/lib/job-feed/counts";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { softwareJsonLd } from "@/lib/seo/json-ld";
import { type FaqItem, FaqList } from "../_components/faq-list";
import { formatUsd } from "../_components/plan-features";
import { PricingPlans } from "../_components/pricing-plans";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: `Checking, fixing and downloading one resume as a PDF is free. Pro adds Otto's AI help, every format, Word downloads, the full list of job matches and the full tracker for ${formatUsd(PLANS.pro.priceUsd)} a month (${PLANS.pro.limits.tailor} tailored versions, ${PLANS.pro.limits.fix} line fixes), free to try for ${PRO_TRIAL.days} days; Max is ${formatUsd(PLANS.max.priceUsd)} for more. Cancel anytime.`,
  path: ROUTES.pricing,
});

const count = new Intl.NumberFormat("en-US");
const monthlyLimits = `Free has no AI help. Pro and Max limits reset each month, when your plan renews (on a yearly plan, on the day of the month it started): ${FEATURES.map(
  (feature) =>
    `${FEATURE_LABELS[feature]}: ${count.format(PLANS.pro.limits[feature])} on Pro, ${count.format(PLANS.max.limits[feature])} on Max`,
).join("; ")}.`;
const trialLimits = `The ${PRO_TRIAL.days}-day Pro trial has its own allowance for the whole trial: ${FEATURES.map(
  (feature) => `${count.format(PRO_TRIAL.limits[feature])} ${FEATURE_LABELS[feature]}`,
).join(", ")}.`;
const weeklyLimits = `Weekly plans count each billing week instead: ${FEATURES.map(
  (feature) =>
    `${FEATURE_LABELS[feature]}: ${count.format(PLANS.pro.weeklyLimits[feature])} on Pro, ${count.format(PLANS.max.weeklyLimits[feature])} on Max`,
).join("; ")}.`;
const uploadsNote =
  "Uploads always work: on Free, or past the AI reads, the basic reader reads them instead.";

// The weekly numbers only while a weekly option is on sale.
function limitsAnswer(weeklyOnSale: boolean): string {
  return [monthlyLimits, ...(weeklyOnSale ? [weeklyLimits] : []), trialLimits, uploadsNote].join(
    " ",
  );
}

const billingFaq = (weeklyOnSale: boolean): readonly FaqItem[] => [
  {
    question: "How does the free trial work?",
    answer: `New accounts can try Pro free for ${PRO_TRIAL.days} days, once per person. You add a card at checkout and nothing is charged during the trial. When it ends, Pro starts at ${planPriceLabel(PRO_TRIAL.plan, PRO_TRIAL.interval)}. Cancel anytime before the trial ends and you pay nothing. During the trial you can build and preview a portfolio; it goes public once Pro starts.`,
  },
  {
    question: "What stays free?",
    answer: `Uploading with the basic reader, the recruiter view, editing and fixing by hand, 1 resume, the Classic and Compact formats, PDF downloads, your ${FREE_JOB_MATCHES} closest job matches and one tracked application with its reminder. No card, no time limit. The other formats, more resumes, Word downloads, the full list of job matches with filters, tracking every application, share links and the work-rights check come with Pro. If a paid plan ends, everything you made stays: you can still open, edit and download it.`,
  },
  {
    question: "Who handles payments?",
    answer:
      "Creem, our merchant of record. They process your payment, send your receipts and handle sales tax or VAT. We never see your full card number.",
  },
  {
    question: "Will I pay tax on top?",
    answer:
      "Depending on where you live, sales tax or VAT may be added at checkout. Prices are in US dollars, and your bank may convert them to your currency.",
  },
  {
    question: "How do I cancel?",
    answer:
      "From your account page, anytime. You keep your plan until the end of the period you paid for, and you won't be charged again.",
  },
  {
    question: "Can I get a refund?",
    answer: (
      <>
        Yes. If a paid plan isn&apos;t right for you, ask within 7 days of your first payment for a
        full refund. See the <TextLink href={ROUTES.refunds}>refund policy</TextLink>.
      </>
    ),
  },
  {
    question: "What are the limits?",
    answer: limitsAnswer(weeklyOnSale),
  },
  {
    question: "Can I switch between Pro and Max?",
    answer:
      "Yes, from your account page. Your subscription changes in place and you pay or get back the difference, so you're never billed twice.",
  },
  {
    question: "What happens to my resumes if I cancel?",
    answer:
      "Nothing. They stay yours, and you can keep editing and downloading them for free. A published portfolio goes offline until you're back on Pro or Max; it isn't deleted.",
  },
];

// Built ahead of time; rebuilt at most hourly so the job counts stay current.
export const revalidate = 3600;

export default async function PricingPage() {
  // Read when the page is built, like the rest of its config: a new product id needs a redeploy.
  const offer = billingOffer();
  const jobCounts = await loadJobCounts();
  const open = countClaim(jobCounts.open);
  const renewals = [...new Set(PAID_PLANS.flatMap((plan) => offer[plan]))];
  return (
    <div className="container-page pt-16 pb-24 sm:pt-24 sm:pb-32">
      <JsonLd data={softwareJsonLd(offer, appUrl())} />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
          Free for the basics. <em className="block">More when the hunt gets busy.</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg/7 text-muted sm:text-xl/8">
          Checking, fixing and downloading one resume as a PDF is free. Pro and Max add Otto&apos;s
          AI help each month, with the numbers written down, plus every format, Word downloads,
          every match from {open ? `${open} open jobs` : "open jobs"} and the full tracker. Try Pro
          free for {PRO_TRIAL.days} days.
        </p>
      </div>

      <PricingPlans
        offer={offer}
        trial={trialOffered()}
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
        <FaqList items={billingFaq(renewals.includes("week"))} className="lg:col-span-2" />
      </section>
    </div>
  );
}
