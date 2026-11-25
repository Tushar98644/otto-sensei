import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { fmt } from "@/i18n/format";
import type { Localize } from "@/i18n/pages";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import type { HiringNote, HiringSystemId } from "@/lib/ats/types";
import { appUrl } from "@/lib/env";
import {
  ATS_GUIDES,
  ATS_IDS,
  type AtsGuide,
  type GuideWords,
  atsGuide,
  generalAdvice,
  guideHeadline,
  guideSources,
  isAtsId,
  readsFiles,
  topicList,
} from "@/lib/seo-pages/ats";
import type { SystemNames } from "@/lib/seo-pages/job-link";
import { atsGuideJsonLd } from "@/lib/seo-pages/json-ld";
import { atsTranslation } from "@/lib/seo-pages/locales";
import { ATS_INDEX_PAGE } from "@/lib/seo-pages/pages";
import { SEO_PAGES_UPDATED, SEO_PATHS, atsPath } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { atsGuideMeta } from "../../_components/seo-copy";
import {
  Breadcrumbs,
  CheckCta,
  ExternalLink,
  H2_CLASSES,
  LINK_CLASSES,
  PAGE_CLASSES,
  PageIntro,
} from "../_components/guide-parts";
import { JobLinkCheck } from "../_components/job-link-check";

export const dynamicParams = false;

// Every language: where the guides aren't published, ats/layout.tsx prerenders that language's 404.
export function generateStaticParams(): { system: string }[] {
  return ATS_IDS.map((system) => ({ system }));
}

type Props = { params: Promise<{ system: string }> };

type Guide = { guide: AtsGuide; words: GuideWords };

// The guide in this request's language, with the words around its notes.
async function guideFor(params: Props["params"]): Promise<Guide> {
  const { system } = await params;
  if (!isAtsId(system)) notFound();
  const locale = await getLocale();
  const t = await getMessages("ats");
  const translation = await atsTranslation(locale);
  return { guide: atsGuide(system, translation, t.topics.titles), words: { locale, t } };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guide, words } = await guideFor(params);
  return localizedMetadata(atsGuideMeta(guide, words));
}

const SYSTEM_NAMES = Object.fromEntries(
  ATS_GUIDES.map((guide) => [guide.id, guide.name]),
) as SystemNames;

const guidePaths = (href: Localize) =>
  Object.fromEntries(ATS_IDS.map((id) => [id, href(atsPath(id))])) as Record<
    HiringSystemId,
    string
  >;

const SMALL_TITLE_CLASSES = "font-sans text-lg/7 font-medium tracking-tight text-ink";

function NoteRow({
  note,
  sourceLabel,
  t,
  newTab,
}: {
  note: HiringNote;
  sourceLabel: string;
  t: GuideWords["t"]["guide"];
  newTab: string;
}) {
  return (
    <li className="flex flex-col gap-2 py-6">
      <p className="text-base/7 text-pretty text-ink">{note.fact}</p>
      <p className="text-base/7 text-pretty text-muted">
        <span className="font-medium text-ink">{`${t.whatToDo} `}</span>
        {note.todo}
      </p>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm/6 text-subtle">
        {note.optIn ? <span>{t.optIn}</span> : null}
        <span>
          {`${t.source} `}
          <ExternalLink href={note.source.url} newTab={newTab}>
            {sourceLabel}
          </ExternalLink>
        </span>
      </p>
    </li>
  );
}

function SideCta({
  name,
  t,
  buttons,
  href,
}: {
  name: string;
  t: GuideWords["t"]["guide"];
  buttons: { match: string; check: string };
  href: Localize;
}) {
  return (
    <section
      aria-labelledby="side-cta-title"
      className="mb-10 hidden rounded-2xl bg-surface-muted p-6 lg:block"
    >
      <h2 id="side-cta-title" className={SMALL_TITLE_CLASSES}>
        {fmt(t.sideTitle, { name })}
      </h2>
      <p className="mt-1 text-sm/6 text-pretty text-muted">{t.sideText}</p>
      <IntentLink
        href={href(SEO_PATHS.jobMatch)}
        className={buttonClasses({ variant: "secondary", className: "mt-4 w-full" })}
      >
        {buttons.match}
        <ArrowRight />
      </IntentLink>
      <IntentLink
        href={href(ROUTES.studio)}
        className={cn(LINK_CLASSES, "mt-2 inline-flex min-h-9 items-center text-sm/6")}
      >
        {buttons.check}
      </IntentLink>
    </section>
  );
}

export default async function AtsGuidePage({ params }: Props) {
  const { guide, words } = await guideFor(params);
  const { locale, t } = words;
  const page = t.guide;
  const format = await getFormat();
  const href = await getLocalize();
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const translation = await atsTranslation(locale);
  const sources = guideSources(guide, words);
  const labels = new Map(sources.map((source) => [source.url, source.label]));
  const others = ATS_GUIDES.filter((other) => other.id !== guide.id);
  const count = guide.notes.length;
  const meta = atsGuideMeta(guide, words);
  const generalLink = (chunk: string) => (
    <a href="#general-title" className={LINK_CLASSES}>
      {chunk}
    </a>
  );
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd
        data={atsGuideJsonLd(
          guide,
          {
            path: meta.path,
            description: meta.description,
            lastModified: SEO_PAGES_UPDATED,
            headline: guideHeadline(guide, words),
          },
          appUrl(),
          locale,
          sources,
        )}
      />
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: t.crumb, path: href(ATS_INDEX_PAGE.path) },
          { name: guide.name, path: href(atsPath(guide.id)) },
        ]}
      />
      <PageIntro eyebrow={page.eyebrow} title={guideHeadline(guide, words)}>
        <p>{guide.what}</p>
        <p className="text-base/7 text-subtle">
          {format.plural(page.count, count)} {fmt(page.setUp, { name: guide.name })}
        </p>
      </PageIntro>

      <div className="mt-12 grid gap-16 sm:mt-16 lg:grid-cols-3 lg:gap-12">
        <div className="flex flex-col gap-16 lg:col-span-2">
          <section aria-labelledby="spot-title" className="rounded-3xl bg-surface-muted p-6 sm:p-8">
            <h2 id="spot-title" className={SMALL_TITLE_CLASSES}>
              {fmt(page.spotTitle, { name: guide.name })}
            </h2>
            <p className="mt-2 text-base/7 text-pretty text-muted">{guide.spot}</p>
            <JobLinkCheck
              className="mt-6"
              system={guide.id}
              names={SYSTEM_NAMES}
              t={t.jobLink}
              action={href(SEO_PATHS.jobMatch)}
              guidePaths={guidePaths(href)}
            />
          </section>

          {readsFiles(guide) ? null : (
            <section aria-labelledby="file-title">
              <h2 id="file-title" className={H2_CLASSES}>
                {t.topics.titles.file}
              </h2>
              <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
                {rich(page.noFileNotes, { link: generalLink }, { name: guide.name })}
              </p>
            </section>
          )}

          {guide.sections.map((section) => (
            <section key={section.topic} aria-labelledby={`${section.topic}-title`}>
              <h2 id={`${section.topic}-title`} className={H2_CLASSES}>
                {section.title}
              </h2>
              <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
                {section.notes.map((note) => (
                  <NoteRow
                    key={note.fact}
                    note={note}
                    sourceLabel={labels.get(note.source.url) ?? note.source.label}
                    t={page}
                    newTab={seo.newTab}
                  />
                ))}
              </ul>
            </section>
          ))}

          <section aria-labelledby="general-title" className="scroll-mt-24">
            <h2 id="general-title" className={H2_CLASSES}>
              {page.generalTitle}
            </h2>
            <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
              {fmt(page.generalIntro, {
                name: guide.name,
                count: format.number(ATS_GUIDES.length),
              })}
            </p>
            <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
              {generalAdvice(translation).map((tip) => (
                <li key={tip.title} className="flex flex-col gap-1 py-6">
                  <h3 className="text-lg/7 font-medium tracking-tight text-ink">{tip.title}</h3>
                  <p className="max-w-prose text-base/7 text-pretty text-muted">{tip.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <CheckCta title={seo.checkCta.title} labels={product.common.checkButtons} href={href}>
            {seo.checkCta.text}
          </CheckCta>

          <section aria-labelledby="sources-title">
            <h2 id="sources-title" className={H2_CLASSES}>
              {page.sourcesTitle}
            </h2>
            <ul role="list" className="mt-6 flex flex-col gap-3 text-base/7">
              {sources.map((source) => (
                <li key={source.url} className="flex flex-col">
                  <ExternalLink href={source.url} newTab={seo.newTab}>
                    {source.label}
                  </ExternalLink>
                  <span className="text-sm/6 text-pretty text-subtle">
                    {new URL(source.url).hostname}
                    {source.byTopic
                      ? null
                      : ` · ${fmt(t.sources.covers, { topics: topicList(source.topics, words) })}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-label={page.aside} className="lg:sticky lg:top-24 lg:self-start">
          <SideCta name={guide.name} t={page} buttons={product.common.checkButtons} href={href} />
          <h2 id="more-title" className={SMALL_TITLE_CLASSES}>
            {page.moreTitle}
          </h2>
          <ul role="list" aria-labelledby="more-title" className="mt-3 grid grid-cols-2 gap-x-6">
            {others.map((other) => (
              <li key={other.id}>
                <IntentLink
                  href={href(atsPath(other.id))}
                  className="inline-flex min-h-11 items-center rounded-sm text-base/6 text-muted transition-colors hover:text-ink lg:min-h-9"
                >
                  {other.name}
                </IntentLink>
              </li>
            ))}
          </ul>
          <ul
            role="list"
            className="mt-6 flex flex-col gap-2 border-t border-border pt-6 text-sm/6"
          >
            <li>
              <IntentLink href={href(SEO_PATHS.resumeTemplates)} className={LINK_CLASSES}>
                {page.templatesLink}
              </IntentLink>
            </li>
            <li>
              <IntentLink href={href(SEO_PATHS.compare)} className={LINK_CLASSES}>
                {page.compareLink}
              </IntentLink>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
