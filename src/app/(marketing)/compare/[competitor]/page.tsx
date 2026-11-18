import { Check } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentLink } from "@/components/site/intent-link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import {
  COMPETITORS,
  COMPETITORS_CHECKED,
  type CompareNote,
  type Competitor,
  compareTitle,
  competitorBySlug,
} from "@/lib/seo-pages/compare";
import { COMPARE_INDEX_PAGE, RELATED, calendarDate, comparePage } from "@/lib/seo-pages/pages";
import { comparePath } from "@/lib/seo-pages/paths";
import {
  Breadcrumbs,
  CheckCta,
  ExternalLink,
  H2_CLASSES,
  LINK_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../../ats/_components/guide-parts";

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

function AtAGlance({ competitor }: { competitor: Competitor }) {
  const column = "flex flex-col gap-1 text-base/7 text-pretty text-muted md:col-span-2";
  const label = "text-xs/4 font-medium tracking-widest text-subtle uppercase md:sr-only";
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
              <dd className={column}>
                <span className={label}>{BRAND.name}</span>
                {row.otto}
              </dd>
              <dd className={column}>
                <span className={label}>{competitor.name}</span>
                {row.them}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default async function ComparePage({ params }: Props) {
  const competitor = await competitorFor(params);
  const title = compareTitle(competitor);
  const checked = calendarDate(COMPETITORS_CHECKED);
  const others = COMPETITORS.filter((other) => other.slug !== competitor.slug);
  return (
    <div className={PAGE_CLASSES}>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Compare", path: COMPARE_INDEX_PAGE.path },
          { name: competitor.name, path: comparePath(competitor.slug) },
        ]}
      />
      <PageIntro eyebrow="Compare" title={title}>
        <p>{competitor.summary}</p>
        <p className="text-base/7 text-subtle">
          Everything about {competitor.name} here comes from its own website, checked on{" "}
          <time dateTime={COMPETITORS_CHECKED}>{checked}</time>. Prices and plans change, so check
          the{" "}
          <a href="#sources-title" className={LINK_CLASSES}>
            sources
          </a>{" "}
          before you decide.
        </p>
      </PageIntro>

      <div className="mt-12 flex max-w-5xl flex-col gap-24 sm:mt-16 sm:gap-32">
        <AtAGlance competitor={competitor} />

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

        <NoteList
          id="differences-title"
          title={`Where ${BRAND.name} is different`}
          notes={competitor.differences}
        />

        <NoteList id="extras-title" title={`Also in ${BRAND.name}`} notes={competitor.extras} />

        <section aria-labelledby="pick-title">
          <h2 id="pick-title" className={H2_CLASSES}>
            Which one suits you
          </h2>
          <div className="mt-6 grid gap-3 rounded-3xl bg-surface-muted p-3 sm:p-6 md:grid-cols-2">
            {[
              { name: competitor.name, text: competitor.pickThem },
              { name: BRAND.name, text: competitor.pickOtto },
            ].map((pick) => (
              <div
                key={pick.name}
                className="flex flex-col gap-2 rounded-2xl bg-surface p-4 sm:p-6"
              >
                <h3 className="text-lg/7 font-medium tracking-tight text-ink">{pick.name}</h3>
                <p className="text-base/7 text-pretty text-muted">{pick.text}</p>
              </div>
            ))}
          </div>
        </section>

        <CheckCta title={`Try ${BRAND.name} on your resume`} />

        <section aria-labelledby="sources-title" className="scroll-mt-24">
          <h2 id="sources-title" className={H2_CLASSES}>
            Sources
          </h2>
          <ul role="list" className="mt-6 flex flex-col gap-3 text-base/7">
            {competitor.sources.map((source) => (
              <li key={source.url} className="flex flex-col">
                <ExternalLink href={source.url}>{source.label}</ExternalLink>
                <span className="text-sm/6 text-subtle">
                  {new URL(source.url).hostname} · checked {checked}
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
