import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { ResumeWeb } from "@/components/share/resume-web";
import { JsonLd } from "@/components/site/json-ld";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { Panel } from "@/components/ui/panel";
import { PLANS } from "@/config/plans";
import type { Locale } from "@/i18n/config";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import type { Localize } from "@/i18n/pages";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getFormat, getLocale, getMessages } from "@/i18n/server";
import { TEMPLATE_INFO, isProTemplate } from "@/lib/pdf/templates";
import { DEFAULT_TEMPLATE } from "@/lib/resume/schema";
import { faqJsonLd } from "@/lib/seo/json-ld";
import {
  ROLE_EXAMPLES,
  type RoleExample,
  exampleResume,
  relatedExamples,
} from "@/lib/seo-pages/examples";
import { examplesIn } from "@/lib/seo-pages/locales/examples";
import { RELATED, RESUME_EXAMPLES_PAGE } from "@/lib/seo-pages/pages";
import { examplePath } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { FaqList, faqEntries } from "../../_components/faq-list";
import { NoteRows } from "../../_components/note-rows";
import { SECTION_TITLE_CLASSES } from "../../_components/section";
import { exampleHeadlineIn, exampleMeta, seoRelated } from "../../_components/seo-copy";
import {
  Breadcrumbs,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../../ats/_components/guide-parts";
import { lineCheckNote } from "../_components/line-check";
import { StartFromExample } from "../_components/start-from-example";

export const dynamicParams = false;

// Every language: where examples aren't published, resume-examples/layout.tsx prerenders that language's 404.
export function generateStaticParams(): { role: string }[] {
  return ROLE_EXAMPLES.map(({ slug }) => ({ role: slug }));
}

type Props = { params: Promise<{ role: string }> };

type ExampleWords = Messages["resumeExamples"]["example"];

// The example in this request's language.
async function exampleFor(params: Props["params"]): Promise<RoleExample> {
  const { role } = await params;
  const examples = await examplesIn(await getLocale());
  return examples.find((example) => example.slug === role) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return localizedMetadata(
    exampleMeta(await getMessages("resumeExamples"), await exampleFor(params)),
  );
}

function formatNote(example: RoleExample, t: ExampleWords): string {
  const { name } = TEMPLATE_INFO[example.resume.template];
  if (!isProTemplate(example.resume.template)) return fmt(t.formatFree, { name });
  return fmt(t.formatPro, {
    name,
    pro: PLANS.pro.name,
    free: PLANS.free.name,
    fallback: TEMPLATE_INFO[DEFAULT_TEMPLATE].name,
  });
}

function Lines({
  example,
  t,
  locale,
  lint,
}: {
  example: RoleExample;
  t: ExampleWords;
  locale: Locale;
  lint: Messages["lint"];
}) {
  return (
    <section aria-labelledby="lines-title" className="mt-24 sm:mt-32">
      <h2 id="lines-title" className={H2_CLASSES}>
        {t.linesTitle}
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">{t.linesIntro}</p>
      <ul role="list" className="mt-8 divide-y divide-border border-y border-border">
        {example.lines.map((line) => (
          <li key={line.weak} className="grid gap-6 py-8 sm:grid-cols-2 sm:gap-8">
            <div className="flex flex-col gap-4">
              <p className="flex flex-col gap-1 text-base/7 text-pretty text-muted">
                <span className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
                  {t.before}
                </span>
                {line.weak}
              </p>
              <OttoNote
                size="sm"
                live={false}
                meta={t.lineCheck}
                message={lineCheckNote(line.weak, locale, lint)}
              />
            </div>
            <p className="flex flex-col gap-1 text-base/7 text-pretty text-ink">
              <span className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
                {t.after}
              </span>
              {line.strong}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Skills({ example, t, href }: { example: RoleExample; t: ExampleWords; href: Localize }) {
  const matchCheck = (chunk: string) => (
    <TextLink href={href(RELATED.jobMatch.href)}>{chunk}</TextLink>
  );
  return (
    <section aria-labelledby="skills-title" className="mt-24 sm:mt-32">
      <h2 id="skills-title" className={H2_CLASSES}>
        {t.skillsTitle}
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        {rich(t.skillsIntro, { link: matchCheck })}
      </p>
      <dl className="mt-8 divide-y divide-border border-y border-border">
        {example.skills.map((group) => (
          <div key={group.label} className="grid gap-2 py-6 sm:grid-cols-2 sm:gap-8">
            <dt className="text-lg/7 font-medium tracking-tight text-ink">{group.label}</dt>
            <dd className="max-w-prose text-base/7 text-pretty text-muted">
              {group.items.join(", ")}
            </dd>
          </div>
        ))}
        <div className="grid gap-2 py-6 sm:grid-cols-2 sm:gap-8">
          <dt className="text-lg/7 font-medium tracking-tight text-ink">{t.titlesLabel}</dt>
          <dd className="max-w-prose text-base/7 text-pretty text-muted">
            {fmt(t.titles, { titles: example.titles.join(", ") })}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ClosingPanel({
  example,
  t,
  href,
  locale,
}: {
  example: RoleExample;
  t: ExampleWords;
  href: Localize;
  locale: Locale;
}) {
  const blank = (chunk: string) => <TextLink href={href(ROUTES.studio)}>{chunk}</TextLink>;
  return (
    <section
      aria-labelledby="example-end-title"
      className="mt-24 flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:mt-32 sm:py-24"
    >
      <Otto pose="point" size={144} title={t.otto} className="size-28 sm:size-36" />
      <h2 id="example-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
        {t.closingTitle}
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">{t.closingText}</p>
      <StartFromExample
        slug={example.slug}
        role={example.role}
        label={t.start}
        locale={locale}
        className="mt-8"
      />
      <p className="mt-3 text-sm text-subtle">{rich(t.blank, { link: blank })}</p>
    </section>
  );
}

export default async function ExamplePage({ params }: Props) {
  const example = await exampleFor(params);
  const locale = await getLocale();
  const href = await getLocalize();
  const all = await getMessages("resumeExamples");
  const t = all.example;
  const product = await getMessages("product");
  const seo = await getMessages("seo");
  const lint = await getMessages("lint");
  const format = await getFormat();
  const resume = exampleResume(example, 0);
  const examples = await examplesIn(locale);
  const related = relatedExamples(example).flatMap(
    (english) => examples.find((other) => other.slug === english.slug) ?? [],
  );
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd data={faqJsonLd(faqEntries(example.faq), locale)} />
      <Breadcrumbs
        language={locale}
        label={product.common.breadcrumb}
        crumbs={[
          { name: product.common.home, path: href(ROUTES.home) },
          { name: all.crumb, path: href(RESUME_EXAMPLES_PAGE.path) },
          { name: example.role, path: href(examplePath(example.slug)) },
        ]}
      />
      <PageIntro eyebrow={t.eyebrow} title={exampleHeadlineIn(all, example)}>
        <p>{example.intro}</p>
      </PageIntro>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <StartFromExample slug={example.slug} role={example.role} label={t.start} locale={locale} />
        <p className="text-sm/6 text-subtle">{t.startNote}</p>
      </div>

      <section aria-labelledby="example-title" className="mt-12 sm:mt-16">
        <h2 id="example-title" className="sr-only">
          {t.resumeTitle}
        </h2>
        <Panel>
          <ResumeWeb
            resume={resume}
            headingLevel={3}
            linked={false}
            className="mx-auto max-w-3xl rounded-2xl bg-surface px-5 py-8 shadow-page sm:px-12 sm:py-12"
          />
          <p className="mx-auto mt-4 max-w-3xl px-1 text-sm/6 text-pretty text-subtle sm:px-0">
            {example.person} {formatNote(example, t)}
          </p>
        </Panel>
      </section>

      <Lines example={example} t={t} locale={locale} lint={lint} />
      <Skills example={example} t={t} href={href} />

      <section aria-labelledby="tips-title" className="mt-24 sm:mt-32">
        <h2 id="tips-title" className={H2_CLASSES}>
          {t.tipsTitle}
        </h2>
        <NoteRows notes={example.tips} className="mt-8" />
      </section>

      <section aria-labelledby="mistakes-title" className="mt-24 sm:mt-32">
        <h2 id="mistakes-title" className={H2_CLASSES}>
          {t.mistakesTitle}
        </h2>
        <NoteRows notes={example.mistakes} className="mt-8" />
      </section>

      <section
        aria-labelledby="example-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2 id="example-faq-title" className={H2_CLASSES}>
          {product.common.questions}
        </h2>
        <FaqList items={example.faq} className="lg:col-span-2" />
      </section>

      <ClosingPanel example={example} t={t} href={href} locale={locale} />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        title={t.moreTitle}
        links={[
          ...related.map((other) => ({
            href: href(examplePath(other.slug)),
            title: exampleHeadlineIn(all, other),
            text: other.card,
          })),
          ...(await seoRelated(product, seo, format, href, ["builder", "templates"])),
        ]}
      />
    </div>
  );
}
