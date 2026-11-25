import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { IntentLink } from "@/components/site/intent-link";
import { ROUTES } from "@/components/site/routes";
import { Panel } from "@/components/ui/panel";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { ATS_GUIDES, atsGuide, generalAdvice, topTip } from "@/lib/seo-pages/ats";
import { atsTranslation } from "@/lib/seo-pages/locales";
import { ATS_INDEX_PAGE } from "@/lib/seo-pages/pages";
import { atsPath } from "@/lib/seo-pages/paths";
import { displayItalic } from "../_components/display-italic";
import { atsIndexMeta, seoRelated } from "../_components/seo-copy";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "./_components/guide-parts";

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(atsIndexMeta(await getMessages("ats"), await getFormat()));
}

export default async function AtsGuidesPage() {
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const t = await getMessages("ats");
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const translation = await atsTranslation(locale);
  const cards = ATS_GUIDES.map((english) => {
    const guide = translation ? atsGuide(english.id, translation, t.topics.titles) : english;
    const tip = translation
      ? topTip(english, { notes: guide.notes, screeningTip: translation.screeningTip })
      : topTip(english);
    return { guide, tip };
  });
  return (
    <div className={PAGE_CLASSES}>
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: t.crumb, path: href(ATS_INDEX_PAGE.path) },
        ]}
      />
      <PageIntro
        eyebrow={t.index.eyebrow}
        title={
          <>
            {t.index.title} <em className={displayItalic.className}>{t.index.titleEm}</em>
          </>
        }
      >
        <p>{fmt(t.index.intro, { count: format.number(ATS_GUIDES.length) })}</p>
      </PageIntro>

      <section aria-labelledby="systems-title" className="mt-12 sm:mt-16">
        <h2 id="systems-title" className="sr-only">
          {t.index.systems}
        </h2>
        <Panel className="max-sm:rounded-none max-sm:bg-transparent max-sm:p-0">
          <ul
            role="list"
            className="divide-y divide-border border-y border-border sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:border-0 lg:grid-cols-3"
          >
            {cards.map(({ guide, tip }) => (
              <li key={guide.id}>
                <IntentLink
                  href={href(atsPath(guide.id))}
                  className="group flex h-full flex-col gap-1 py-4 sm:gap-2 sm:rounded-2xl sm:bg-surface sm:p-6 sm:transition-colors sm:hover:bg-surface-hover"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-lg/7 font-medium tracking-tight text-ink">
                      {guide.name}
                    </span>
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                  <span className="text-sm/6 text-pretty text-muted">{tip}</span>
                  {guide.notes.length > 1 ? (
                    <span className="mt-auto pt-2 text-sm/5 text-subtle max-sm:hidden">
                      {fmt(t.index.notes, { count: format.number(guide.notes.length) })}
                    </span>
                  ) : null}
                </IntentLink>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section aria-labelledby="general-title" className="mt-24 max-w-3xl sm:mt-32">
        <h2 id="general-title" className={H2_CLASSES}>
          {t.index.generalTitle}
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
          {t.index.generalIntro}
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

      <CheckCta
        className="mt-24 sm:mt-32"
        title={seo.checkCta.title}
        labels={product.common.checkButtons}
        href={href}
      >
        {seo.checkCta.text}
      </CheckCta>

      <RelatedLinks
        className="mt-24 sm:mt-32"
        title={product.common.keepReading}
        links={await seoRelated(product, seo, format, href, ["templates", "compare", "pricing"])}
      />
    </div>
  );
}
