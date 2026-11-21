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
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { softwareJsonLd } from "@/lib/seo/json-ld";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { type FaqItem, FaqList } from "../_components/faq-list";
import { MERCHANT } from "../_components/merchant";
import { formatUsd, plansOnSale } from "../_components/plan-features";
import { PricingPlans } from "../_components/pricing-plans";
import { ClosingPanel } from "./_components/closing-panel";
import { PlanTable } from "./_components/plan-table";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: `Checking, fixing and downloading one resume as a PDF is free, with ${PLANS.free.limits.fix} line fixes a month from Otto. Pro adds the rest of Otto's AI help, every format, Word downloads, the full list of job matches and the full tracker for ${formatUsd(PLANS.pro.priceUsd)} a month (${PLANS.pro.limits.tailor} tailored versions, ${PLANS.pro.limits.fix} line fixes), starting with a ${PRO_TRIAL.days}-day trial for ${formatUsd(PRO_TRIAL.priceUsd)}; Max is ${formatUsd(PLANS.max.priceUsd)} for more. Cancel anytime.`,
  path: ROUTES.pricing,
});

const count = new Intl.NumberFormat("en-US");
const freeLimits = `Free has ${count.format(PLANS.free.limits.fix)} ${FEATURE_LABELS.fix} a month (summary help counts as one), reset at the start of each month, and no other AI help.`;
const monthlyLimits = `Pro and Max limits reset each month, when your plan renews (on a yearly plan, on the day of the month it started): ${FEATURES.map(
  (feature) =>
    `${FEATURE_LABELS[feature]}: ${count.format(PLANS.pro.limits[feature])} on Pro, ${count.format(PLANS.max.limits[feature])} on Max`,
).join("; ")}.`;
const trialLimits = `The ${PRO_TRIAL.days}-day Pro trial has its own allowance for the whole trial: ${FEATURES.map(
  (feature) => `${count.format(PRO_TRIAL.limits[feature])} ${FEATURE_LABELS[feature]}`,
).join(", ")}.`;
const uploadsNote =
  "Uploads always work: on Free, or past the AI reads, the basic reader reads them instead.";

const limitsAnswer = [freeLimits, monthlyLimits, trialLimits, uploadsNote].join(" ");

const billingFaq: readonly FaqItem[] = [
  {
    question: "How does the Pro trial work?",
    answer: `New accounts can try Pro for ${PRO_TRIAL.days} days, once per person. You add a card at checkout and pay ${formatUsd(PRO_TRIAL.priceUsd)} (plus any tax) when the trial starts. When it ends, Pro starts at ${planPriceLabel(PRO_TRIAL.plan, PRO_TRIAL.interval)}. Cancel anytime before the trial ends and you pay nothing more. During the trial you can build and preview a portfolio; it goes public once Pro starts.`,
  },
  {
    question: "What stays free?",
    answer: `Uploading with the basic reader, the recruiter view, editing and fixing by hand, ${PLANS.free.limits.fix} line fixes a month with Otto, 1 resume, the Classic and Compact formats, PDF downloads, your ${FREE_JOB_MATCHES} closest job matches and one tracked application with its reminder. No card, no time limit. More line fixes and the rest of Otto's AI help, the other formats, more resumes, Word downloads, the full list of job matches with filters, tracking every application, share links and the work-rights check come with Pro. If a paid plan ends, everything you made stays: you can still open, edit and download it.`,
  },
  {
    question: "Who handles payments?",
    answer: `${MERCHANT.name}, our merchant of record. They process your payment on their own checkout page, send your receipts and handle sales tax or VAT, and your card statement shows the charge under their name, starting with ${MERCHANT.statementPrefix}. We never see your full card number.`,
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
        Refund requests are handled by {MERCHANT.name}, our merchant of record, under its{" "}
        <TextLink href={MERCHANT.buyerTermsUrl}>buyer terms</TextLink>. You can also cancel anytime
        from your account page and you won&apos;t be charged again. See our{" "}
        <TextLink href={ROUTES.refunds}>refund policy</TextLink>.
      </>
    ),
  },
  {
    question: "What are the limits?",
    answer: limitsAnswer,
  },
  {
    question: "Can I switch between Pro and Max?",
    answer: `You can move up from Pro to Max on your account page, on the billing period you already have. Your subscription changes in place, so you're never billed twice: you pay the difference for the rest of the period right away. On the Pro trial, starting Max ends the trial and charges the full Max price (plus any tax) to your card on file right away; the ${formatUsd(PRO_TRIAL.priceUsd)} trial charge isn't taken off. To move to Pro, or between monthly and yearly, cancel from your account page and pick the new plan once your current period ends.`,
  },
  {
    question: "What happens to my resumes if I cancel?",
    answer:
      "Nothing. They stay yours, and you can keep editing and downloading them for free. A published portfolio goes offline until you're back on Pro or Max; it isn't deleted.",
  },
];

export const revalidate = 3600;

export default async function PricingPage() {
  const offer = billingOffer();
  const jobCounts = await loadJobCounts();
  const trial = trialOffered();
  const plans = plansOnSale(offer);
  const renewals = [...new Set(PAID_PLANS.flatMap((plan) => offer[plan]))];
  return (
    <div className="container-page pt-12 pb-24 sm:pt-16 sm:pb-32">
      <JsonLd data={softwareJsonLd(offer, appUrl())} />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="font-display text-5xl/none font-normal tracking-tight text-balance text-ink sm:text-6xl/none">
          Free for the basics.{" "}
          <em className={cn("block", displayItalic.className)}>More when the hunt gets busy.</em>
        </h1>
        <p className="mt-6 text-lg/7 text-balance text-muted">
          Pro adds Otto&apos;s AI help, every job match and the tracker.
        </p>
      </div>

      <PricingPlans
        offer={offer}
        trial={trial}
        headingAs="h2"
        otto={<Otto pose="point" size={96} />}
        jobCounts={jobCounts}
        className="mx-auto mt-8 max-w-6xl sm:mt-12"
      />
      {/* Sits right under the plans' fair-use line, so the two read as one block of fine print. */}
      <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-balance text-muted">
        Prices in US dollars. Taxes may apply. Paid plans renew each {renewalPeriods(renewals)}{" "}
        until you cancel.
      </p>

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
        <FaqList items={billingFaq} className="lg:col-span-2" />
      </section>

      <ClosingPanel
        offer={offer}
        trial={trial}
        note={<OttoNote size="sm" live={false} message={OTTO.pricing.samePrinciples} />}
        className="mt-24 sm:mt-32"
      />
    </div>
  );
}
