import type { Metadata } from "next";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { PAID_PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata, requirePublished } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { billingOffer, creditOffered, trialOffered } from "@/lib/billing/intervals";
import { appUrl } from "@/lib/env";
import { loadJobCounts } from "@/lib/job-feed/live-counts";
import { faqJsonLd, softwareJsonLd } from "@/lib/seo/json-ld";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { plansOnSale } from "../_components/plan-features";
import { creditCopy, priceCopy } from "../_components/price-copy";
import { PricingPlans } from "../_components/pricing-plans";
import { ClosingPanel } from "./_components/closing-panel";
import { PlanTable } from "./_components/plan-table";
import { pricingMeta } from "./_components/pricing-meta";
import { billingFaq } from "./billing-faq";

export async function generateMetadata(): Promise<Metadata> {
  const meta = pricingMeta(await getMessages("pricing"), await getFormat(), trialOffered());
  return localizedMetadata({ ...meta, path: ROUTES.pricing });
}

export const revalidate = 3600;

export default async function PricingPage() {
  await requirePublished(ROUTES.pricing);
  const t = await getMessages("pricing");
  const common = await getMessages("common");
  const { brand } = common;
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const offer = billingOffer();
  const jobCounts = await loadJobCounts();
  const trial = trialOffered();
  const plans = plansOnSale(offer);
  const renewals = [...new Set(PAID_PLANS.flatMap((plan) => offer[plan]))];
  const credit = creditOffered();
  const faq = billingFaq(t, format, href, credit);
  const cards = { prices: t.prices, features: t.features, plans: t.plans, copy: t.copy };
  const page = t.page;
  const jsonLd = {
    language: locale,
    description: brand.description,
    home: href(ROUTES.home),
    pricing: href(ROUTES.pricing),
  };
  return (
    <div className="container-page pt-16 pb-24 sm:pt-24 sm:pb-32">
      <JsonLd data={softwareJsonLd(offer, appUrl(), jsonLd)} />
      <JsonLd data={faqJsonLd(faqEntries(faq), locale)} />
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
          {page.title} <em className={cn("block", displayItalic.className)}>{page.titleEm}</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg/7 text-pretty text-muted sm:text-xl/8">{page.intro}</p>
      </div>

      <PricingPlans
        t={cards}
        locale={locale}
        termsHref={href(ROUTES.terms)}
        offer={offer}
        trial={trial}
        headingAs="h2"
        otto={<Otto pose="point" size={96} title={common.otto} />}
        jobCounts={jobCounts}
        className="mx-auto mt-16 max-w-6xl"
      />
      <OttoNote
        size="sm"
        live={false}
        message={page.otto}
        className="mx-auto mt-8 w-fit max-w-xl"
      />
      <p className="mt-6 text-center text-sm text-subtle">
        {fmt(page.footnote, { periods: priceCopy(t, format).renewalPeriods(renewals) })}
      </p>
      {credit ? (
        <p className="mt-2 text-center text-sm text-subtle">
          {creditCopy(t.credit, format).pricingLine()}
        </p>
      ) : null}

      <PlanTable t={t.table} format={format} plans={plans} className="mt-24 sm:mt-32" />

      <section
        aria-labelledby="billing-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2
          id="billing-faq-title"
          className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13"
        >
          {page.billingQuestions}
        </h2>
        <FaqList items={faq} className="lg:col-span-2" />
      </section>

      <ClosingPanel
        t={cards}
        locale={locale}
        studioLabel={page.closingStudio}
        offer={offer}
        trial={trial}
        className="mt-24 sm:mt-32"
      />
    </div>
  );
}
