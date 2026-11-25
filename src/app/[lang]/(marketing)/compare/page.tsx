import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { COMPETITORS_CHECKED, ottoReasons } from "@/lib/seo-pages/compare";
import { competitorsIn } from "@/lib/seo-pages/locales";
import { COMPARE_INDEX_PAGE, calendarMonthIn } from "@/lib/seo-pages/pages";
import { comparePath } from "@/lib/seo-pages/paths";
import { compareIndexMeta, compareTitleIn, seoRelated } from "../_components/seo-copy";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { PipelineStrip } from "./_components/compare-parts";

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(compareIndexMeta(await getMessages("compare"), await getFormat()));
}

export default async function CompareIndexPage() {
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const t = await getMessages("compare");
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const competitors = await competitorsIn(locale);
  const month = (chunk: string) => <time dateTime={COMPETITORS_CHECKED.slice(0, 7)}>{chunk}</time>;
  return (
    <div className={PAGE_CLASSES}>
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: t.crumb, path: href(COMPARE_INDEX_PAGE.path) },
        ]}
      />
      <PageIntro eyebrow={t.index.eyebrow} title={fmt(t.index.title, { brand: BRAND.name })}>
        <p>{fmt(t.index.intro, { short: BRAND.shortName })}</p>
        <p className="text-base/7 text-subtle">
          {rich(
            t.index.facts,
            { link: month },
            { month: calendarMonthIn(format, COMPETITORS_CHECKED) },
          )}
        </p>
      </PageIntro>

      <PipelineStrip t={t.pipeline} className="mt-16 sm:mt-24" />

      <section aria-labelledby="comparisons-title" className="mt-24 sm:mt-32">
        <h2 id="comparisons-title" className={H2_CLASSES}>
          {fmt(t.index.listTitle, { brand: BRAND.name })}
        </h2>
        <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitors.map((competitor) => (
            <li key={competitor.slug}>
              <IntentLink
                href={href(comparePath(competitor.slug))}
                className="group flex h-full flex-col gap-3 rounded-3xl bg-surface p-6 shadow-card transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-lg/7 font-medium tracking-tight text-ink">
                    {compareTitleIn(t, competitor)}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-sm/6 text-pretty text-muted">
                  {ottoReasons(competitor)[0]?.text}
                </span>
              </IntentLink>
            </li>
          ))}
        </ul>
      </section>

      <CheckCta
        className="mt-24 sm:mt-32"
        title={fmt(t.index.cta, { brand: BRAND.name })}
        labels={product.common.checkButtons}
        href={href}
      >
        {seo.checkCta.text}
      </CheckCta>

      <RelatedLinks
        className="mt-24 sm:mt-32"
        title={product.common.keepReading}
        links={await seoRelated(product, seo, format, href, ["ats", "templates", "pricing"])}
      />
    </div>
  );
}
