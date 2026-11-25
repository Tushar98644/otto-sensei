import type { Metadata } from "next";
import { FormatImage } from "@/components/formats/format-image";
import { OttoNote } from "@/components/mascot/otto-note";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { PLANS } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { appUrl } from "@/lib/env";
import { isProTemplate, TEMPLATE_LIST } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { faqJsonLd } from "@/lib/seo/json-ld";
import { templateListJsonLd } from "@/lib/seo-pages/json-ld";
import { RESUME_TEMPLATES_PAGE } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { freeFormats } from "../_components/product-copy";
import { seoRelated, templatesMeta } from "../_components/seo-copy";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { formatInfo, proCount, templatesContent } from "./content";
import {
  FormatPreviewHost,
  type PreviewFormat,
  PreviewFormatButton,
  UseFormatButton,
} from "./use-format-button";

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(templatesMeta(await getMessages("resumeTemplates"), await getFormat()));
}

// The drawn widths: three columns of at most 15rem, two of half the page, one of the page less its padding.
const IMAGE_SIZES =
  "(min-width: 1024px) 15rem, (min-width: 640px) calc(50vw - 8.75rem), calc(100vw - 8.5rem)";

export default async function ResumeTemplatesPage() {
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const t = await getMessages("resumeTemplates");
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const content = templatesContent(t, format, href);
  const formats: readonly PreviewFormat[] = TEMPLATE_LIST.map((info) => ({
    info: formatInfo(t, info),
    pro: isProTemplate(info.id),
  }));
  const labels = { preview: t.preview, use: t.use, close: t.close, imageAlt: t.imageAlt };
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd
        data={templateListJsonLd(
          formats.map(({ info, pro }) => ({ info, free: !pro })),
          href(RESUME_TEMPLATES_PAGE.path),
          appUrl(),
          t.listName,
          locale,
        )}
      />
      <JsonLd data={faqJsonLd(faqEntries(content.faq), locale)} />
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: t.crumb, path: href(RESUME_TEMPLATES_PAGE.path) },
        ]}
      />
      <PageIntro
        eyebrow={t.eyebrow}
        title={
          <>
            {fmt(t.title, { count: format.number(TEMPLATE_IDS.length) })}{" "}
            <em className={displayItalic.className}>{t.titleEm}</em>
          </>
        }
      >
        <p>
          {fmt(t.intro, {
            freeFormats: freeFormats(format),
            proCount: format.number(proCount),
            pro: PLANS.pro.name,
          })}
        </p>
      </PageIntro>
      <OttoNote live={false} message={t.tip} className="mt-8 max-w-2xl" />

      <section aria-labelledby="formats-title" className="mt-12 sm:mt-16">
        <h2 id="formats-title" className="sr-only">
          {t.formatsTitle}
        </h2>
        <Panel>
          <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map(({ info, pro }) => {
              const titleId = `format-${info.id}`;
              return (
                <li key={info.id} id={info.id} className="scroll-mt-24">
                  <article
                    aria-labelledby={titleId}
                    className="group relative flex h-full flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 id={titleId} className="text-lg/7 font-medium tracking-tight text-ink">
                        {info.name}
                      </h3>
                      {pro ? (
                        <Badge variant="ink">{PLANS.pro.name}</Badge>
                      ) : (
                        <Badge>{PLANS.free.name}</Badge>
                      )}
                    </div>
                    <PreviewFormatButton id={info.id} name={info.name} label={t.preview}>
                      <span className="block h-56 overflow-hidden rounded-xl bg-surface-muted px-6 pt-6">
                        <FormatImage
                          info={info}
                          sizes={IMAGE_SIZES}
                          loading="lazy"
                          alt={fmt(t.imageAlt, { name: info.name })}
                          className="shadow-page transition-[translate,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-page-lift"
                        />
                      </span>
                    </PreviewFormatButton>
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-base/6 font-medium text-pretty text-ink">{info.bestFor}</p>
                      <p className="text-sm/6 text-pretty text-muted">{info.description}</p>
                    </div>
                    <UseFormatButton id={info.id} name={info.name} label={t.use} />
                  </article>
                </li>
              );
            })}
          </ul>
        </Panel>
        <FormatPreviewHost formats={formats} labels={labels} />
      </section>

      <section aria-labelledby="common-title" className="mt-24 sm:mt-32">
        <h2 id="common-title" className={H2_CLASSES}>
          {t.commonTitle}
        </h2>
        <ul role="list" className="mt-8 divide-y divide-border border-y border-border">
          {content.common.map(({ title, text }) => (
            <li key={title} className="grid gap-2 py-6 sm:grid-cols-2 sm:gap-8">
              <h3 className="text-lg/7 font-medium tracking-tight text-ink">{title}</h3>
              <p className="max-w-prose text-base/7 text-pretty text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="templates-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2 id="templates-faq-title" className={H2_CLASSES}>
          {product.common.questions}
        </h2>
        <FaqList items={content.faq} className="lg:col-span-2" />
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
        links={await seoRelated(product, seo, format, href, ["ats", "compare", "pricing"])}
      />
    </div>
  );
}
