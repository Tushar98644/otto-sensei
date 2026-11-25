import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { PLANS, resumeLimit } from "@/config/plans";
import en from "@/i18n/messages/en/resume-examples";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Localize } from "@/i18n/pages";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { appUrl } from "@/lib/env";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { pageListJsonLd } from "@/lib/seo-pages/json-ld";
import { examplesIn } from "@/lib/seo-pages/locales/examples";
import { RESUME_EXAMPLES_PAGE } from "@/lib/seo-pages/pages";
import { SEO_PATHS, examplePath } from "@/lib/seo-pages/paths";
import { displayItalic } from "../_components/display-italic";
import { type Note, NoteRows } from "../_components/note-rows";
import { noteList } from "../_components/product-copy";
import {
  type ExamplesMessages,
  examplesIndexMeta,
  exampleHeadlineIn,
  seoRelated,
} from "../_components/seo-copy";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { ExampleCards } from "./_components/example-cards";

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata(
    examplesIndexMeta(await getMessages("resumeExamples"), await getFormat()),
  );
}

function howMade(t: ExamplesMessages["index"], format: Format, href: Localize): Note[] {
  const values = {
    count: format.number(TEMPLATE_IDS.length),
    free: PLANS.free.name,
    pro: PLANS.pro.name,
    max: PLANS.max.name,
    proResumes: format.number(resumeLimit("pro")),
    maxResumes: format.number(resumeLimit("max")),
  };
  const matchCheck = (chunk: string) => (
    <TextLink href={href(SEO_PATHS.jobMatch)}>{chunk}</TextLink>
  );
  return noteList(en.index.how, t.how, values, { skills: { link: matchCheck } });
}

export default async function ResumeExamplesPage() {
  const locale = await getLocale();
  const format = await getFormat();
  const href = await getLocalize();
  const t = await getMessages("resumeExamples");
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const examples = await examplesIn(locale);
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd
        data={pageListJsonLd(
          t.crumb,
          href(RESUME_EXAMPLES_PAGE.path),
          examples.map((example) => ({
            name: exampleHeadlineIn(t, example),
            path: href(examplePath(example.slug)),
          })),
          appUrl(),
          locale,
        )}
      />
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: t.crumb, path: href(RESUME_EXAMPLES_PAGE.path) },
        ]}
      />
      <PageIntro
        eyebrow={t.index.eyebrow}
        title={
          <>
            {t.index.title}{" "}
            <em className={displayItalic.className}>
              {fmt(t.index.titleEm, { count: format.number(examples.length) })}
            </em>
          </>
        }
      >
        <p>{t.index.intro}</p>
      </PageIntro>

      <section aria-labelledby="examples-title" className="mt-12 sm:mt-16">
        <h2 id="examples-title" className="sr-only">
          {t.index.listTitle}
        </h2>
        <ExampleCards examples={examples} href={href} />
      </section>

      <section aria-labelledby="how-made-title" className="mt-24 sm:mt-32">
        <h2 id="how-made-title" className={H2_CLASSES}>
          {t.index.howTitle}
        </h2>
        <NoteRows notes={howMade(t.index, format, href)} className="mt-8" />
      </section>

      <CheckCta
        className="mt-24 sm:mt-32"
        title={t.index.ctaTitle}
        labels={product.common.checkButtons}
        href={href}
      >
        {t.index.ctaText}
      </CheckCta>

      <RelatedLinks
        className="mt-24 sm:mt-32"
        title={product.common.keepReading}
        links={await seoRelated(product, seo, format, href, [
          "builder",
          "templates",
          "jobMatch",
          "ats",
        ])}
      />
    </div>
  );
}
