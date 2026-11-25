import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { appUrl } from "@/lib/env";
import {
  COMPETITORS,
  type Competitor,
  compareTitle,
  competitorBySlug,
  ottoReasons,
} from "@/lib/seo-pages/compare";
import { compareJsonLd } from "@/lib/seo-pages/json-ld";
import {
  COMPARE_INDEX_PAGE,
  RELATED,
  calendarDate,
  calendarMonth,
  comparePage,
} from "@/lib/seo-pages/pages";
import { SEO_PATHS, comparePath } from "@/lib/seo-pages/paths";
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

// Every language: where comparisons aren't published, compare/layout.tsx prerenders that language's 404.
export function generateStaticParams(): { competitor: string }[] {
  return COMPETITORS.map(({ slug }) => ({ competitor: slug }));
}

type Props = { params: Promise<{ competitor: string }> };

async function competitorFor(params: Props["params"]): Promise<Competitor> {
  const { competitor } = await params;
  return competitorBySlug(competitor) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(comparePage(await competitorFor(params)));
}

export default async function ComparePage({ params }: Props) {
  const competitor = await competitorFor(params);
  const title = compareTitle(competitor);
  const checked = competitor.asListed
    ? `as listed in ${calendarMonth(competitor.checked)}`
    : `checked on ${calendarDate(competitor.checked)}`;
  const others = COMPETITORS.filter((other) => other.slug !== competitor.slug);
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd data={compareJsonLd(competitor, comparePage(competitor), appUrl())} />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Compare", path: COMPARE_INDEX_PAGE.path },
          { name: competitor.name, path: comparePath(competitor.slug) },
        ]}
      />
      <PageIntro eyebrow={`${competitor.name} alternative`} title={title}>
        <p>
          {BRAND.name} is your whole job hunt in one account: a resume that hiring software reads,
          jobs ranked for it, applications that track themselves and prep for every interview.
        </p>
      </PageIntro>

      <section aria-labelledby="verdict-title" className="mt-10 max-w-3xl">
        <h2 id="verdict-title" className="sr-only">
          Try it on your resume
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <IntentLink
            href={SEO_PATHS.jobMatch}
            className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
          >
            Run the free match check
            <ArrowRight />
          </IntentLink>
          <p className="text-sm/6 text-subtle">Free, with no sign-in.</p>
        </div>
      </section>

      <div className="mt-24 flex max-w-5xl flex-col gap-24 sm:mt-32 sm:gap-32">
        <section aria-labelledby="reasons-title">
          <h2 id="reasons-title" className={H2_CLASSES}>
            Why pick {BRAND.name}
          </h2>
          <ReasonCards notes={ottoReasons(competitor)} />
        </section>

        <PipelineStrip />

        <section aria-labelledby="glance-title">
          <h2 id="glance-title" className={H2_CLASSES}>
            {BRAND.shortName} and {competitor.name}, side by side
          </h2>
          <p className="mt-3 max-w-2xl text-base/7 text-pretty text-muted">
            Everything about {competitor.name} here comes from its own website,{" "}
            <time dateTime={competitor.checked}>{checked}</time>.{" "}
            {competitor.pricedByCountry
              ? `${competitor.name} shows each country its own prices; any here are the ones it showed in India. `
              : null}
            Prices and plans change, so check the{" "}
            <a href="#sources-title" className={LINK_CLASSES}>
              sources
            </a>
            .
          </p>
          <CompareTable competitor={competitor} />
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
              See what {BRAND.shortName} makes of your resume
            </h2>
            <p className="text-lg/7 text-pretty text-white/75">
              Checking it and matching it to a job are free, with no card.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <IntentLink
              href={SEO_PATHS.jobMatch}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Match my resume to a job
              <ArrowRight />
            </IntentLink>
            <IntentLink
              href={ROUTES.studio}
              className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-base font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors hover:decoration-white"
            >
              Check my resume
            </IntentLink>
          </div>
        </section>

        <section aria-labelledby="sources-title" className="scroll-mt-24">
          <h2
            id="sources-title"
            className="font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
          >
            Sources
          </h2>
          <ul role="list" className="mt-4 grid gap-x-8 gap-y-3 text-sm/6 md:grid-cols-2">
            {competitor.sources.map((source) => (
              <li key={source.url} className="flex flex-col">
                <ExternalLink href={source.url}>{source.label}</ExternalLink>
                <span className="text-xs/5 text-subtle">
                  {new URL(source.url).hostname} · {checked}
                </span>
              </li>
            ))}
            <li className="flex flex-col">
              <IntentLink href={ROUTES.pricing} className={LINK_CLASSES}>
                {BRAND.name} pricing
              </IntentLink>
              <span className="text-xs/5 text-subtle">Prices in US dollars. Taxes may apply.</span>
            </li>
          </ul>
          <p className="mt-6 max-w-prose text-xs/5 text-pretty text-subtle">
            {competitor.name} is a trademark of its owner, named here only to identify its product.
            This page isn&apos;t made with, or endorsed by, {competitor.name}. Spotted something out
            of date? Email{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className={LINK_CLASSES}>
              {BRAND.supportEmail}
            </a>{" "}
            and we&apos;ll check it.
          </p>
        </section>

        <nav aria-labelledby="more-title">
          <h2 id="more-title" className={H2_CLASSES}>
            More comparisons
          </h2>
          <ul role="list" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ...others.map((other) => ({
                href: comparePath(other.slug),
                title: compareTitle(other),
              })),
              { href: RELATED.ats.href, title: RELATED.ats.title },
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
