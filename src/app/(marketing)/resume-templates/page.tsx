import type { Metadata } from "next";
import { FormatImage } from "@/components/formats/format-image";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { PLANS } from "@/config/plans";
import { appUrl } from "@/lib/env";
import { isProTemplate, TEMPLATE_LIST } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { faqJsonLd } from "@/lib/seo/json-ld";
import { templateListJsonLd } from "@/lib/seo-pages/json-ld";
import { RELATED, RESUME_TEMPLATES_PAGE } from "@/lib/seo-pages/pages";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { COMMON, TEMPLATES_FAQ, freeFormats, proCount } from "./content";
import {
  FormatPreviewHost,
  type PreviewFormat,
  PreviewFormatButton,
  UseFormatButton,
} from "./use-format-button";

export const metadata: Metadata = pageMetadata(RESUME_TEMPLATES_PAGE);

const IMAGE_SIZES = "(min-width: 1024px) 20rem, (min-width: 640px) 45vw, 100vw";
const PREVIEW_FORMATS: readonly PreviewFormat[] = TEMPLATE_LIST.map((info) => ({
  info,
  pro: isProTemplate(info.id),
}));

export default function ResumeTemplatesPage() {
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd
        data={templateListJsonLd(
          PREVIEW_FORMATS.map(({ info, pro }) => ({ info, free: !pro })),
          RESUME_TEMPLATES_PAGE.path,
          appUrl(),
        )}
      />
      <JsonLd data={faqJsonLd(faqEntries(TEMPLATES_FAQ))} />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Resume templates", path: RESUME_TEMPLATES_PAGE.path },
        ]}
      />
      <PageIntro
        eyebrow="Resume templates"
        title={
          <>
            {TEMPLATE_IDS.length} resume formats,{" "}
            <em className={displayItalic.className}>each one column of real text.</em>
          </>
        }
      >
        <p>
          Each one copies a widely used resume layout, and each PDF is tested by reading it back.{" "}
          {freeFormats} are free to download as PDFs; the other {proCount} come with{" "}
          {PLANS.pro.name}, and you can try them on your resume first.
        </p>
      </PageIntro>
      <OttoNote live={false} message={OTTO.formats.tip} className="mt-8 max-w-2xl" />

      <section aria-labelledby="formats-title" className="mt-12 sm:mt-16">
        <h2 id="formats-title" className="sr-only">
          Formats
        </h2>
        <Panel>
          <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATE_LIST.map((info, index) => {
              const pro = isProTemplate(info.id);
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
                    <PreviewFormatButton id={info.id} name={info.name}>
                      <span className="block h-56 overflow-hidden rounded-xl bg-surface-muted px-6 pt-6">
                        <FormatImage
                          info={info}
                          sizes={IMAGE_SIZES}
                          loading={index < 3 ? "eager" : "lazy"}
                          className="shadow-page transition-[translate,box-shadow] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-page-lift"
                        />
                      </span>
                    </PreviewFormatButton>
                    <div className="flex flex-1 flex-col gap-2">
                      <p className="text-base/6 font-medium text-pretty text-ink">{info.bestFor}</p>
                      <p className="text-sm/6 text-pretty text-muted">{info.description}</p>
                    </div>
                    <UseFormatButton id={info.id} name={info.name} />
                  </article>
                </li>
              );
            })}
          </ul>
        </Panel>
        <FormatPreviewHost formats={PREVIEW_FORMATS} />
      </section>

      <section aria-labelledby="common-title" className="mt-24 sm:mt-32">
        <h2 id="common-title" className={H2_CLASSES}>
          What every format has in common
        </h2>
        <ul role="list" className="mt-8 divide-y divide-border border-y border-border">
          {COMMON.map(({ title, text }) => (
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
          Questions
        </h2>
        <FaqList items={TEMPLATES_FAQ} className="lg:col-span-2" />
      </section>

      <CheckCta className="mt-24 sm:mt-32" />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        links={[RELATED.ats, RELATED.compare, RELATED.pricing]}
      />
    </div>
  );
}
