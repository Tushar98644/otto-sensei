import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { PLANS, RESUME_LIMITS } from "@/config/plans";
import { appUrl } from "@/lib/env";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { pageListJsonLd } from "@/lib/seo-pages/json-ld";
import { RELATED, RESUME_EXAMPLES_PAGE, exampleHeadline } from "@/lib/seo-pages/pages";
import { SEO_PATHS, examplePath } from "@/lib/seo-pages/paths";
import { displayItalic } from "../_components/display-italic";
import { type Note, NoteRows } from "../_components/note-rows";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { ExampleCards } from "./_components/example-cards";

export const metadata: Metadata = pageMetadata(RESUME_EXAMPLES_PAGE);

const HOW_MADE: readonly Note[] = [
  {
    title: "Made-up people, real shapes",
    text: "Every name, company, college and number is invented. Copy the structure, the kind of lines and the order of sections, then put in your own facts.",
  },
  {
    title: "Every line passes Otto's line check",
    text: "Each line went through the same check the studio runs on yours, which flags duties, stock phrases, vague words and lines with no result.",
  },
  {
    title: "Skills Otto reads in job posts",
    text: (
      <>
        The skills on each page are ones the{" "}
        <TextLink href={SEO_PATHS.jobMatch}>job match check</TextLink> picks out of job posts, so
        you can test your own resume against a real post the same way.
      </>
    ),
  },
  {
    title: "Real text in a real format",
    text: `Each example is drawn in one of the app's ${TEMPLATE_IDS.length} formats as text, not a picture, so what you see is what hiring software would read.`,
  },
  {
    title: "Start from any of them",
    text: `“Start from this example” opens a copy in the studio as your own resume. On ${PLANS.free.name}, it uses your one resume; ${PLANS.pro.name} keeps up to ${RESUME_LIMITS.paid}.`,
  },
];

export default function ResumeExamplesPage() {
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd
        data={pageListJsonLd(
          "Resume examples",
          RESUME_EXAMPLES_PAGE.path,
          ROLE_EXAMPLES.map((example) => ({
            name: exampleHeadline(example),
            path: examplePath(example.slug),
          })),
          appUrl(),
        )}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Resume examples", path: RESUME_EXAMPLES_PAGE.path },
        ]}
      />
      <PageIntro
        eyebrow="Resume examples"
        title={
          <>
            Resume examples{" "}
            <em className={displayItalic.className}>for {ROLE_EXAMPLES.length} jobs.</em>
          </>
        }
      >
        <p>
          Complete resumes for jobs people search for most, in India and abroad, from software
          engineer to HR and freshers. Each one shows stronger lines, the skills to list and the
          mistakes to skip.
        </p>
      </PageIntro>

      <section aria-labelledby="examples-title" className="mt-12 sm:mt-16">
        <h2 id="examples-title" className="sr-only">
          Examples
        </h2>
        <ExampleCards examples={ROLE_EXAMPLES} />
      </section>

      <section aria-labelledby="how-made-title" className="mt-24 sm:mt-32">
        <h2 id="how-made-title" className={H2_CLASSES}>
          How these examples are made
        </h2>
        <NoteRows notes={HOW_MADE} className="mt-8" />
      </section>

      <CheckCta className="mt-24 sm:mt-32" title="No example for your job?">
        Upload the resume you have to see what hiring software reads, or match it to a job post.
        Both are free, with no card.
      </CheckCta>

      <RelatedLinks
        className="mt-24 sm:mt-32"
        links={[RELATED.builder, RELATED.templates, RELATED.jobMatch, RELATED.ats]}
      />
    </div>
  );
}
