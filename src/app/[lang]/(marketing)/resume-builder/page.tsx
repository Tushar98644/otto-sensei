import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Otto } from "@/components/mascot/otto";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Localize } from "@/i18n/pages";
import { getLocalize, isPublished, localizedMetadata, requirePublished } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { trialOffered } from "@/lib/billing/intervals";
import { faqJsonLd } from "@/lib/seo/json-ld";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { RESUME_BUILDER_PAGE, RESUME_EXAMPLES_PAGE } from "@/lib/seo-pages/pages";
import { SEO_PATHS } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { NoteRows } from "../_components/note-rows";
import { PlanCard, plansPanelClasses } from "../_components/plan-card";
import { planCopy } from "../_components/plan-features";
import { priceCopy, type PriceCopy, type PricingMessages } from "../_components/price-copy";
import {
  PLAN_NAMES,
  productMeta,
  publishedRelated,
  relatedLinks,
  type ProductMessages,
} from "../_components/product-copy";
import { SECTION_TITLE_CLASSES } from "../_components/section";
import {
  Breadcrumbs,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { ExampleCards } from "../resume-examples/_components/example-cards";
import { builderContent } from "./content";

const PATH = RESUME_BUILDER_PAGE.path;

const SHOWN_EXAMPLES = 6;

// The page is built once, so it makes no job count claim a live count could outdate.
const NO_COUNT = { open: 0, matchable: 0 };

type BuilderMessages = ProductMessages["builder"];

export async function generateMetadata(): Promise<Metadata> {
  const meta = productMeta(await getMessages("product"), await getFormat(), "builder");
  return localizedMetadata({ ...meta, path: PATH });
}

function Plans({
  t,
  pricing,
  format,
  href,
  prices,
}: {
  t: BuilderMessages["plans"];
  pricing: PricingMessages;
  format: Format;
  href: Localize;
  prices: PriceCopy;
}) {
  const month = pricing.plans.period.month;
  return (
    <section aria-labelledby="plans-title" className="mt-24 sm:mt-32">
      <h2 id="plans-title" className={H2_CLASSES}>
        {fmt(t.title, { pro: PLAN_NAMES.pro })}
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        {fmt(t.intro, { max: PLAN_NAMES.max, price: prices.planPrice("max", "month") })}
      </p>
      <div className={cn("mt-8", plansPanelClasses(2))}>
        <PlanCard
          planId="free"
          copy={planCopy(pricing, format, "free")}
          labels={pricing.plans}
          price={{ amount: prices.usd(0), period: month.short, spoken: pricing.plans.free }}
          cta={{ href: href(ROUTES.studio), label: t.freeCta, primary: true }}
          notes={[t.freeNote]}
        />
        <PlanCard
          planId="pro"
          copy={planCopy(pricing, format, "pro", "month", NO_COUNT)}
          labels={pricing.plans}
          price={{
            amount: prices.planPrice("pro", "month"),
            period: month.short,
            spoken: month.spoken,
          }}
          cta={{
            href: href(ROUTES.pricing),
            label: fmt(t.paidCta, { pro: PLAN_NAMES.pro, max: PLAN_NAMES.max }),
            primary: false,
          }}
          notes={[trialOffered() ? prices.trialHeadline() : t.cancelAnytime]}
        />
      </div>
    </section>
  );
}

function ClosingPanel({ t, href }: { t: BuilderMessages["closing"]; href: Localize }) {
  return (
    <section
      aria-labelledby="builder-end-title"
      className="mt-24 flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:mt-32 sm:py-24"
    >
      <Otto pose="read" size={144} title={t.otto} className="size-28 sm:size-36" />
      <h2 id="builder-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
        {t.title}
      </h2>
      <IntentLink
        href={href(ROUTES.studio)}
        className={buttonClasses({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
      >
        {t.cta}
        <ArrowRight />
      </IntentLink>
      <p className="mt-3 text-sm text-subtle">{t.note}</p>
    </section>
  );
}

// English P5 content: shown only where the examples are published.
function Examples({ t, format, href }: { t: BuilderMessages; format: Format; href: Localize }) {
  const all = (chunk: string) => (
    <TextLink href={href(RESUME_EXAMPLES_PAGE.path)}>{chunk}</TextLink>
  );
  return (
    <section aria-labelledby="examples-title" className="mt-24 sm:mt-32">
      <h2 id="examples-title" className={H2_CLASSES}>
        {t.examplesTitle}
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        {rich(t.examplesIntro, { link: all }, { count: format.number(ROLE_EXAMPLES.length) })}
      </p>
      <ExampleCards examples={ROLE_EXAMPLES.slice(0, SHOWN_EXAMPLES)} className="mt-8" />
    </section>
  );
}

export default async function ResumeBuilderPage() {
  await requirePublished(PATH);
  const t = await getMessages("product");
  const format = await getFormat();
  const href = await getLocalize();
  const pricing = await getMessages("pricing");
  const prices = priceCopy(pricing, format);
  const page = t.builder;
  const content = builderContent(page, format, href, prices);
  const locale = await getLocale();
  const examples = await isPublished(locale, SEO_PATHS.resumeExamples);
  const related = await publishedRelated(["examples", "templates", "jobMatch", "ats", "compare"]);
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd data={faqJsonLd(faqEntries(content.faq), locale)} />
      <Breadcrumbs
        language={locale}
        label={t.common.breadcrumb}
        crumbs={[
          { name: t.common.home, path: href(ROUTES.home) },
          { name: page.crumb, path: href(PATH) },
        ]}
      />
      <PageIntro
        eyebrow={page.eyebrow}
        title={
          <>
            {page.title} <em className={displayItalic.className}>{page.titleEm}</em>
          </>
        }
      >
        <p>{page.intro}</p>
      </PageIntro>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <IntentLink
          href={href(ROUTES.studio)}
          className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
        >
          {page.action}
          <ArrowRight />
        </IntentLink>
        {examples ? (
          <IntentLink
            href={href(RESUME_EXAMPLES_PAGE.path)}
            className={buttonClasses({
              variant: "secondary",
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            {page.seeExamples}
          </IntentLink>
        ) : null}
      </div>

      <section aria-labelledby="steps-title" className="mt-24 sm:mt-32">
        <h2 id="steps-title" className={H2_CLASSES}>
          {page.stepsTitle}
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">{page.stepsIntro}</p>
        <NoteRows notes={content.steps} numbered className="mt-8" />
      </section>

      <Plans t={page.plans} pricing={pricing} format={format} href={href} prices={prices} />

      <section aria-labelledby="who-title" className="mt-24 sm:mt-32">
        <h2 id="who-title" className={H2_CLASSES}>
          {page.audiencesTitle}
        </h2>
        <NoteRows notes={content.audiences} className="mt-8" />
      </section>

      <section aria-labelledby="india-title" className="mt-24 sm:mt-32">
        <h2 id="india-title" className={H2_CLASSES}>
          {page.indiaTitle}
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">{page.indiaIntro}</p>
        <NoteRows notes={content.india} className="mt-8" />
      </section>

      {examples ? <Examples t={page} format={format} href={href} /> : null}

      <section
        aria-labelledby="builder-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2 id="builder-faq-title" className={H2_CLASSES}>
          {t.common.questions}
        </h2>
        <FaqList items={content.faq} className="lg:col-span-2" />
      </section>

      <ClosingPanel t={page.closing} href={href} />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        title={t.common.keepReading}
        links={relatedLinks(t.related, format, href, related)}
      />
    </div>
  );
}
