import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Otto } from "@/components/mascot/otto";
import { OttoNote } from "@/components/mascot/otto-note";
import { ResumeWeb } from "@/components/share/resume-web";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { Panel } from "@/components/ui/panel";
import { PLANS } from "@/config/plans";
import { lintBullet } from "@/lib/lint/bullets";
import { TEMPLATE_INFO, isProTemplate } from "@/lib/pdf/templates";
import { DEFAULT_TEMPLATE } from "@/lib/resume/schema";
import { faqJsonLd } from "@/lib/seo/json-ld";
import {
  ROLE_EXAMPLES,
  type RoleExample,
  exampleBySlug,
  exampleResume,
  relatedExamples,
} from "@/lib/seo-pages/examples";
import { RELATED, RESUME_EXAMPLES_PAGE, examplePage, exampleHeadline } from "@/lib/seo-pages/pages";
import { examplePath } from "@/lib/seo-pages/paths";
import { cn } from "@/lib/utils";
import { FaqList, faqEntries } from "../../_components/faq-list";
import { NoteRows } from "../../_components/note-rows";
import { SECTION_TITLE_CLASSES } from "../../_components/section";
import {
  Breadcrumbs,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../../ats/_components/guide-parts";
import { StartFromExample } from "../_components/start-from-example";

export const dynamicParams = false;

// Every language: where examples aren't published, resume-examples/layout.tsx prerenders that language's 404.
export function generateStaticParams(): { role: string }[] {
  return ROLE_EXAMPLES.map(({ slug }) => ({ role: slug }));
}

type Props = { params: Promise<{ role: string }> };

async function exampleFor(params: Props["params"]): Promise<RoleExample> {
  const { role } = await params;
  return exampleBySlug(role) ?? notFound();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(examplePage(await exampleFor(params)));
}

// What Otto's line check says first about the weak line.
function lineCheckNote(weak: string): string {
  return lintBullet(weak)[0]?.message ?? "";
}

function formatNote(example: RoleExample): string {
  const { name } = TEMPLATE_INFO[example.resume.template];
  if (!isProTemplate(example.resume.template)) {
    return `Shown in the ${name} format, free to download as a PDF.`;
  }
  return `Shown in the ${name} format, which comes with ${PLANS.pro.name}. On ${PLANS.free.name} it downloads in ${TEMPLATE_INFO[DEFAULT_TEMPLATE].name}.`;
}

function Lines({ example }: { example: RoleExample }) {
  return (
    <section aria-labelledby="lines-title" className="mt-24 sm:mt-32">
      <h2 id="lines-title" className={H2_CLASSES}>
        Turn duties into results
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        Three weak lines, what Otto&apos;s line check says about each, and the line from this
        example that answers it.
      </p>
      <ul role="list" className="mt-8 divide-y divide-border border-y border-border">
        {example.lines.map((line) => (
          <li key={line.weak} className="grid gap-6 py-8 sm:grid-cols-2 sm:gap-8">
            <div className="flex flex-col gap-4">
              <p className="flex flex-col gap-1 text-base/7 text-pretty text-muted">
                <span className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
                  Before
                </span>
                {line.weak}
              </p>
              <OttoNote
                size="sm"
                live={false}
                meta="line check"
                message={lineCheckNote(line.weak)}
              />
            </div>
            <p className="flex flex-col gap-1 text-base/7 text-pretty text-ink">
              <span className="text-xs/4 font-medium tracking-widest text-subtle uppercase">
                After
              </span>
              {line.strong}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Skills({ example }: { example: RoleExample }) {
  return (
    <section aria-labelledby="skills-title" className="mt-24 sm:mt-32">
      <h2 id="skills-title" className={H2_CLASSES}>
        Skills hiring software looks for
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        Otto&apos;s <TextLink href={RELATED.jobMatch.href}>job match check</TextLink> reads each of
        these in job posts. List the ones you have, and name each inside a line where you used it: a
        skill that appears only in your Skills list shows as listed, not shown.
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
          <dt className="text-lg/7 font-medium tracking-tight text-ink">Job titles to search</dt>
          <dd className="max-w-prose text-base/7 text-pretty text-muted">
            {example.titles.join(", ")}. Otto&apos;s job matching treats these as the same kind of
            job, so search for each.
          </dd>
        </div>
      </dl>
    </section>
  );
}

function ClosingPanel({ example }: { example: RoleExample }) {
  return (
    <section
      aria-labelledby="example-end-title"
      className="mt-24 flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:mt-32 sm:py-24"
    >
      <Otto
        pose="point"
        size={144}
        title="Otto the otter, pointing at a resume"
        className="size-28 sm:size-36"
      />
      <h2 id="example-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
        Make this resume yours.
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        It opens in the studio as your own resume. Swap in your facts, and Otto checks each line as
        you go.
      </p>
      <StartFromExample slug={example.slug} role={example.role} className="mt-8" />
      <p className="mt-3 text-sm text-subtle">
        Or <TextLink href={ROUTES.studio}>start from a blank page</TextLink>. Free, no card.
      </p>
    </section>
  );
}

export default async function ExamplePage({ params }: Props) {
  const example = await exampleFor(params);
  const resume = exampleResume(example, 0);
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd data={faqJsonLd(faqEntries(example.faq))} />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Resume examples", path: RESUME_EXAMPLES_PAGE.path },
          { name: example.role, path: examplePath(example.slug) },
        ]}
      />
      <PageIntro eyebrow="Resume example" title={exampleHeadline(example)}>
        <p>{example.intro}</p>
      </PageIntro>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <StartFromExample slug={example.slug} role={example.role} />
        <p className="text-sm/6 text-subtle">
          Opens in the studio as your own resume. Free, no card.
        </p>
      </div>

      <section aria-labelledby="example-title" className="mt-12 sm:mt-16">
        <h2 id="example-title" className="sr-only">
          The example resume
        </h2>
        <Panel>
          <ResumeWeb
            resume={resume}
            headingLevel={3}
            linked={false}
            className="mx-auto max-w-3xl rounded-2xl bg-surface px-5 py-8 shadow-page sm:px-12 sm:py-12"
          />
          <p className="mx-auto mt-4 max-w-3xl px-1 text-sm/6 text-pretty text-subtle sm:px-0">
            {example.person} {formatNote(example)}
          </p>
        </Panel>
      </section>

      <Lines example={example} />
      <Skills example={example} />

      <section aria-labelledby="tips-title" className="mt-24 sm:mt-32">
        <h2 id="tips-title" className={H2_CLASSES}>
          What to show
        </h2>
        <NoteRows notes={example.tips} className="mt-8" />
      </section>

      <section aria-labelledby="mistakes-title" className="mt-24 sm:mt-32">
        <h2 id="mistakes-title" className={H2_CLASSES}>
          Mistakes to skip
        </h2>
        <NoteRows notes={example.mistakes} className="mt-8" />
      </section>

      <section
        aria-labelledby="example-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2 id="example-faq-title" className={H2_CLASSES}>
          Questions
        </h2>
        <FaqList items={example.faq} className="lg:col-span-2" />
      </section>

      <ClosingPanel example={example} />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        title="More resume examples"
        links={[
          ...relatedExamples(example).map((other) => ({
            href: examplePath(other.slug),
            title: exampleHeadline(other),
            text: other.card,
          })),
          RELATED.builder,
          RELATED.templates,
        ]}
      />
    </div>
  );
}
