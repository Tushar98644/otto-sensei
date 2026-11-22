import { ArrowRight, Check } from "lucide-react";
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
  type CompareCell,
  type CompareNote,
  type Competitor,
  bothHaveFreePlans,
  choices,
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
  CheckButtons,
  ExternalLink,
  H2_CLASSES,
  LINK_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../../ats/_components/guide-parts";
import { ChoiceLine } from "../_components/choice-line";

export const dynamicParams = false;

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

function Verdict({ competitor }: { competitor: Competitor }) {
  return (
    <section
      aria-labelledby="verdict-title"
      className="mt-10 max-w-3xl rounded-3xl bg-surface-muted p-6 sm:p-8"
    >
      <h2
        id="verdict-title"
        className="font-sans text-xs/4 font-medium tracking-widest text-subtle uppercase"
      >
        The short answer
      </h2>
      <ul role="list" className="mt-4 flex flex-col gap-2 text-base/7 text-pretty text-muted">
        {choices(competitor).map((choice) => (
          <li key={choice.name}>
            <ChoiceLine choice={choice} />
          </li>
        ))}
        {bothHaveFreePlans(competitor) ? (
          <li>Both have a free plan, so you can try each one before you pay.</li>
        ) : null}
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <IntentLink
          href={SEO_PATHS.jobMatch}
          className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
        >
          Run the free match check
          <ArrowRight />
        </IntentLink>
        <p className="text-sm/6 text-subtle">No sign-in needed.</p>
      </div>
    </section>
  );
}

function NoteList({
  id,
  title,
  notes,
}: {
  id: string;
  title: string;
  notes: readonly CompareNote[];
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={H2_CLASSES}>
        {title}
      </h2>
      <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
        {notes.map((note) => (
          <li key={note.title} className="grid gap-2 py-6 sm:grid-cols-2 sm:gap-8">
            <h3 className="text-lg/7 font-medium tracking-tight text-ink">{note.title}</h3>
            <p className="max-w-prose text-base/7 text-pretty text-muted">{note.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GlanceCell({ name, cell }: { name: string; cell: CompareCell }) {
  return (
    <dd className="flex flex-col gap-1 text-base/7 text-pretty text-muted md:col-span-2">
      <span className="text-xs/4 font-medium tracking-widest text-subtle uppercase md:sr-only">
        {name}
      </span>
      <p className="font-medium text-ink">{cell.answer}</p>
      {cell.detail ? <p>{cell.detail}</p> : null}
    </dd>
  );
}

function AtAGlance({ competitor }: { competitor: Competitor }) {
  return (
    <section aria-labelledby="glance-title">
      <h2 id="glance-title" className={H2_CLASSES}>
        At a glance
      </h2>
      <div className="mt-6 border-y border-border">
        <div
          aria-hidden
          className="hidden gap-8 border-b border-border py-4 text-xs/4 font-medium tracking-widest text-subtle uppercase md:grid md:grid-cols-5"
        >
          <span />
          <span className="col-span-2">{BRAND.name}</span>
          <span className="col-span-2">{competitor.name}</span>
        </div>
        <dl className="divide-y divide-border">
          {competitor.rows.map((row) => (
            <div key={row.label} className="grid gap-3 py-6 md:grid-cols-5 md:gap-8">
              <dt className="text-lg/7 font-medium tracking-tight text-ink">{row.label}</dt>
              <GlanceCell name={BRAND.name} cell={row.otto} />
              <GlanceCell name={competitor.name} cell={row.them} />
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function WhichSuits({ competitor }: { competitor: Competitor }) {
  const [otto, them] = choices(competitor);
  return (
    <section aria-labelledby="pick-title">
      <h2 id="pick-title" className={H2_CLASSES}>
        Which one suits you
      </h2>
      <div className="mt-6 rounded-3xl bg-surface-muted p-3 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          {[them, otto].map((choice) => (
            <div
              key={choice.name}
              className="flex flex-col gap-2 rounded-2xl bg-surface p-4 sm:p-6"
            >
              <h3 className="text-lg/7 font-medium tracking-tight text-ink">{choice.name}</h3>
              <p className="text-base/7 text-pretty text-muted">If {choice.clause}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4 px-1 pt-6 pb-3 sm:px-0 sm:pb-0">
          <p className="max-w-prose text-base/7 text-pretty text-ink">
            Try {BRAND.shortName} on your own resume. Matching it to a job and checking it are free,
            with no card.
          </p>
          <CheckButtons />
        </div>
      </div>
    </section>
  );
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
      <PageIntro eyebrow="Compare" title={title}>
        <p>{competitor.summary}</p>
      </PageIntro>

      <Verdict competitor={competitor} />

      <p className="mt-6 max-w-3xl text-sm/6 text-pretty text-subtle">
        Everything about {competitor.name} here comes from its own website,{" "}
        <time dateTime={competitor.checked}>{checked}</time>.{" "}
        {competitor.pricedByCountry
          ? `${competitor.name} shows each country its own prices; any here are the ones it showed in India. `
          : null}
        Prices and plans change, so check the{" "}
        <a href="#sources-title" className={LINK_CLASSES}>
          sources
        </a>{" "}
        before you decide.
      </p>

      <div className="mt-24 flex max-w-5xl flex-col gap-24 sm:mt-32 sm:gap-32">
        <AtAGlance competitor={competitor} />

        <NoteList
          id="reasons-title"
          title={`Why pick ${BRAND.name}`}
          notes={ottoReasons(competitor)}
        />

        <section aria-labelledby="strengths-title">
          <h2 id="strengths-title" className={H2_CLASSES}>
            What {competitor.name} does well
          </h2>
          <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
            {competitor.strengths.map((strength) => (
              <li key={strength} className="flex gap-3 py-5">
                <Check aria-hidden className="mt-1.5 size-4 shrink-0 text-muted" />
                <p className="max-w-prose text-base/7 text-pretty text-ink">{strength}</p>
              </li>
            ))}
          </ul>
        </section>

        <WhichSuits competitor={competitor} />

        <section aria-labelledby="sources-title" className="scroll-mt-24">
          <h2 id="sources-title" className={H2_CLASSES}>
            Sources
          </h2>
          <ul role="list" className="mt-6 flex flex-col gap-3 text-base/7">
            {competitor.sources.map((source) => (
              <li key={source.url} className="flex flex-col">
                <ExternalLink href={source.url}>{source.label}</ExternalLink>
                <span className="text-sm/6 text-subtle">
                  {new URL(source.url).hostname} · {checked}
                </span>
              </li>
            ))}
            <li className="flex flex-col">
              <IntentLink href={ROUTES.pricing} className={LINK_CLASSES}>
                {BRAND.name} pricing
              </IntentLink>
              <span className="text-sm/6 text-subtle">Prices in US dollars. Taxes may apply.</span>
            </li>
          </ul>
          <p className="mt-8 max-w-prose text-sm/6 text-pretty text-subtle">
            {competitor.name} is a trademark of its owner, named here only to identify its product.
            This page isn&apos;t made with, or endorsed by, {competitor.name}. Spotted something out
            of date? Email{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className={LINK_CLASSES}>
              {BRAND.supportEmail}
            </a>{" "}
            and we&apos;ll check it.
          </p>
        </section>

        <RelatedLinks
          title="More comparisons"
          links={[
            ...others.map((other) => ({
              href: comparePath(other.slug),
              title: compareTitle(other),
              text: other.summary,
            })),
            RELATED.ats,
          ]}
        />
      </div>
    </div>
  );
}
