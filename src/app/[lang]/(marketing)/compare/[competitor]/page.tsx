import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { appUrl } from "@/lib/env";
import { COMPETITORS, type Competitor, ottoReasons } from "@/lib/seo-pages/compare";
import { compareJsonLd } from "@/lib/seo-pages/json-ld";
import { competitorsIn } from "@/lib/seo-pages/locales";
import {
  COMPARE_INDEX_PAGE,
  RELATED,
  calendarDateIn,
  calendarMonthIn,
} from "@/lib/seo-pages/pages";
import { SEO_PATHS, comparePath } from "@/lib/seo-pages/paths";
import { compareMeta, compareTitleIn } from "../../_components/seo-copy";
import {
  Breadcrumbs,
  ExternalLink,
  H2_CLASSES,
  LINK_CLASSES,
  PAGE_CLASSES,
  PageIntro,
} from "../../ats/_components/guide-parts";
import { CompareTable, PipelineStrip, ReasonCards } from "../_components/compare-parts";

export const dynamicParams = false;

// Every language lists every comparison: where they aren't published, compare/layout.tsx prerenders that language's 404.
export function generateStaticParams(): { competitor: string }[] {
  return COMPETITORS.map(({ slug }) => ({ competitor: slug }));
}

type Props = { params: Promise<{ competitor: string }> };

// The comparison in this request's language.
async function competitorFor(params: Props["params"]): Promise<Competitor> {
  const { competitor } = await params;
  const all = await competitorsIn(await getLocale());
  return all.find((entry) => entry.slug === competitor) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return localizedMetadata(compareMeta(await getMessages("compare"), await competitorFor(params)));
}

export default async function ComparePage({ params }: Props) {
  const competitor = await competitorFor(params);
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const t = await getMessages("compare");
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const page = t.page;
  const title = compareTitleIn(t, competitor);
  const meta = compareMeta(t, competitor);
  const checked = competitor.asListed
    ? fmt(page.asListed, { month: calendarMonthIn(format, competitor.checked) })
    : fmt(page.checkedOn, { date: calendarDateIn(format, competitor.checked) });
  const others = (await competitorsIn(locale)).filter((other) => other.slug !== competitor.slug);
  const names = { brand: BRAND.name, short: BRAND.shortName, name: competitor.name };
  const time = (chunk: string) => <time dateTime={competitor.checked}>{chunk}</time>;
  const sourcesLink = (chunk: string) => (
    <a href="#sources-title" className={LINK_CLASSES}>
      {chunk}
    </a>
  );
  const mail = (chunk: string) => (
    <a href={`mailto:${BRAND.supportEmail}`} className={LINK_CLASSES}>
      {chunk}
    </a>
  );
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd
        data={compareJsonLd(
          competitor,
          { ...meta, headline: title, lastModified: competitor.checked },
          appUrl(),
          locale,
        )}
      />
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: t.crumb, path: href(COMPARE_INDEX_PAGE.path) },
          { name: competitor.name, path: href(comparePath(competitor.slug)) },
        ]}
      />
      <PageIntro eyebrow={fmt(page.eyebrow, names)} title={title}>
        <p>{fmt(page.intro, names)}</p>
      </PageIntro>

      <section aria-labelledby="verdict-title" className="mt-10 max-w-3xl">
        <h2 id="verdict-title" className="sr-only">
          {page.tryTitle}
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <IntentLink
            href={href(SEO_PATHS.jobMatch)}
            className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
          >
            {page.matchCheck}
            <ArrowRight />
          </IntentLink>
          <p className="text-sm/6 text-subtle">{page.noSignIn}</p>
        </div>
      </section>

      <div className="mt-24 flex max-w-5xl flex-col gap-24 sm:mt-32 sm:gap-32">
        <section aria-labelledby="reasons-title">
          <h2 id="reasons-title" className={H2_CLASSES}>
            {fmt(page.reasonsTitle, names)}
          </h2>
          <ReasonCards notes={ottoReasons(competitor)} />
        </section>

        <PipelineStrip t={t.pipeline} />

        <section aria-labelledby="glance-title">
          <h2 id="glance-title" className={H2_CLASSES}>
            {fmt(page.sideBySide, names)}
          </h2>
          <p className="mt-3 max-w-2xl text-base/7 text-pretty text-muted">
            {rich(page.fromSite, { link: time }, { ...names, checked })}{" "}
            {competitor.pricedByCountry ? `${fmt(page.byCountry, names)} ` : null}
            {rich(page.pricesChange, { link: sourcesLink })}
          </p>
          <CompareTable competitor={competitor} caption={fmt(page.tableCaption, names)} />
        </section>

        <section
          aria-labelledby="pick-title"
          className="flex flex-col items-start gap-8 rounded-3xl bg-primary p-8 text-white sm:p-12"
        >
          <div className="flex max-w-2xl flex-col gap-3">
            <h2
              id="pick-title"
              className="font-display text-3xl/9 font-normal tracking-tight text-balance text-white sm:text-4xl/10"
            >
              {fmt(page.pickTitle, names)}
            </h2>
            <p className="text-lg/7 text-pretty text-white/75">{page.pickText}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <IntentLink
              href={href(SEO_PATHS.jobMatch)}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              {product.common.checkButtons.match}
              <ArrowRight />
            </IntentLink>
            <IntentLink
              href={href(ROUTES.studio)}
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-base font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
            >
              {product.common.checkButtons.check}
            </IntentLink>
          </div>
        </section>

        <section aria-labelledby="sources-title" className="scroll-mt-24">
          <h2
            id="sources-title"
            className="font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
          >
            {page.sources}
          </h2>
          <ul role="list" className="mt-4 grid gap-x-8 gap-y-3 text-sm/6 md:grid-cols-2">
            {competitor.sources.map((source) => (
              <li key={source.url} className="flex flex-col">
                <ExternalLink href={source.url} newTab={seo.newTab}>
                  {source.label}
                </ExternalLink>
                <span className="text-xs/5 text-subtle">
                  {new URL(source.url).hostname} · {checked}
                </span>
              </li>
            ))}
            <li className="flex flex-col">
              <IntentLink href={href(ROUTES.pricing)} className={LINK_CLASSES}>
                {fmt(page.pricing, names)}
              </IntentLink>
              <span className="text-xs/5 text-subtle">{page.pricesNote}</span>
            </li>
          </ul>
          <p className="mt-6 max-w-prose text-xs/5 text-pretty text-subtle">
            {rich(page.trademark, { link: mail }, { ...names, email: BRAND.supportEmail })}
          </p>
        </section>

        <nav aria-labelledby="more-title">
          <h2 id="more-title" className={H2_CLASSES}>
            {page.moreTitle}
          </h2>
          <ul role="list" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ...others.map((other) => ({
                href: href(comparePath(other.slug)),
                title: compareTitleIn(t, other),
              })),
              { href: href(RELATED.ats.href), title: product.related.ats.title },
            ].map((link) => (
              <li key={link.href}>
                <IntentLink
                  href={link.href}
                  className="group flex h-full items-center justify-between gap-3 rounded-2xl bg-surface px-5 py-4 text-base/6 font-medium text-ink ring-1 ring-border transition-colors hover:bg-surface-hover"
                >
                  {link.title}
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </IntentLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
