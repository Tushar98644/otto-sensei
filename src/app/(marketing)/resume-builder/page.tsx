import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Otto } from "@/components/mascot/otto";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { buttonClasses } from "@/components/ui/button";
import { PLANS } from "@/config/plans";
import { trialOffered } from "@/lib/billing/intervals";
import { planPrice, trialHeadline } from "@/lib/billing/prices";
import { faqJsonLd } from "@/lib/seo/json-ld";
import { ROLE_EXAMPLES } from "@/lib/seo-pages/examples";
import { RELATED, RESUME_BUILDER_PAGE, RESUME_EXAMPLES_PAGE } from "@/lib/seo-pages/pages";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { NoteRows } from "../_components/note-rows";
import { PlanCard, plansPanelClasses } from "../_components/plan-card";
import { SECTION_TITLE_CLASSES } from "../_components/section";
import {
  Breadcrumbs,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { ExampleCards } from "../resume-examples/_components/example-cards";
import { AUDIENCES, BUILDER_FAQ, BUILD_STEPS, INDIA_NOTES } from "./content";

export const metadata: Metadata = pageMetadata(RESUME_BUILDER_PAGE);

const SHOWN_EXAMPLES = 6;

// The page is built once, so it makes no job count claim a live count could outdate.
const NO_COUNT = { open: 0, matchable: 0 };

function Plans() {
  const { pro, max } = PLANS;
  return (
    <section aria-labelledby="plans-title" className="mt-24 sm:mt-32">
      <h2 id="plans-title" className={H2_CLASSES}>
        What&apos;s free, and what {pro.name} adds
      </h2>
      <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
        Prices in US dollars. Taxes may apply. {max.name} is {planPrice("max", "month")} a month for
        more of Otto&apos;s help each month.
      </p>
      <div className={cn("mt-8", plansPanelClasses(2))}>
        <PlanCard
          planId="free"
          price={{ amount: "$0", period: "/month", spoken: "free" }}
          cta={{ href: ROUTES.studio, label: "Build my resume", primary: true }}
          notes={["No card needed"]}
        />
        <PlanCard
          planId="pro"
          price={{ amount: planPrice("pro", "month"), period: "/month", spoken: "per month" }}
          cta={{ href: ROUTES.pricing, label: `See ${pro.name} and ${max.name}`, primary: false }}
          jobCounts={NO_COUNT}
          notes={[trialOffered() ? trialHeadline() : "Cancel anytime"]}
        />
      </div>
    </section>
  );
}

function ClosingPanel() {
  return (
    <section
      aria-labelledby="builder-end-title"
      className="mt-24 flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:mt-32 sm:py-24"
    >
      <Otto
        pose="read"
        size={144}
        title="Otto the otter, reading a resume"
        className="size-28 sm:size-36"
      />
      <h2 id="builder-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
        Build it, check it, download it.
      </h2>
      <IntentLink
        href={ROUTES.studio}
        className={buttonClasses({ size: "lg", className: "mt-8 w-full sm:w-auto" })}
      >
        Build my resume
        <ArrowRight />
      </IntentLink>
      <p className="mt-3 text-sm text-subtle">Free, and no account needed.</p>
    </section>
  );
}

export default function ResumeBuilderPage() {
  return (
    <div className={PAGE_CLASSES}>
      <JsonLd data={faqJsonLd(faqEntries(BUILDER_FAQ))} />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Resume builder", path: RESUME_BUILDER_PAGE.path },
        ]}
      />
      <PageIntro
        eyebrow="Free resume builder"
        title={
          <>
            A resume builder{" "}
            <em className={displayItalic.className}>that shows what software reads.</em>
          </>
        }
      >
        <p>
          Start from a file, a blank page or an example. Otto checks every line, shows the text
          hiring software pulls from your file, and the PDF is free to download.
        </p>
      </PageIntro>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <IntentLink
          href={ROUTES.studio}
          className={buttonClasses({ size: "lg", className: "w-full sm:w-auto" })}
        >
          Build my resume
          <ArrowRight />
        </IntentLink>
        <IntentLink
          href={RESUME_EXAMPLES_PAGE.path}
          className={buttonClasses({
            variant: "secondary",
            size: "lg",
            className: "w-full sm:w-auto",
          })}
        >
          See resume examples
        </IntentLink>
      </div>

      <section aria-labelledby="steps-title" className="mt-24 sm:mt-32">
        <h2 id="steps-title" className={H2_CLASSES}>
          How Otto builds and checks a resume
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
          Five steps in the studio. Stop after any of them; your resume is saved in your browser as
          you go.
        </p>
        <NoteRows notes={BUILD_STEPS} numbered className="mt-8" />
      </section>

      <Plans />

      <section aria-labelledby="who-title" className="mt-24 sm:mt-32">
        <h2 id="who-title" className={H2_CLASSES}>
          Who it&apos;s for
        </h2>
        <NoteRows notes={AUDIENCES} className="mt-8" />
      </section>

      <section aria-labelledby="india-title" className="mt-24 sm:mt-32">
        <h2 id="india-title" className={H2_CLASSES}>
          Resumes for jobs in India
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
          CTC, notice period, Naukri and the biodata habits of old templates: where each one goes,
          and what to leave off.
        </p>
        <NoteRows notes={INDIA_NOTES} className="mt-8" />
      </section>

      <section aria-labelledby="examples-title" className="mt-24 sm:mt-32">
        <h2 id="examples-title" className={H2_CLASSES}>
          Start from an example
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
          Each one is a complete resume you can open in the studio and make your own.{" "}
          <TextLink href={RESUME_EXAMPLES_PAGE.path}>
            See all {ROLE_EXAMPLES.length} examples
          </TextLink>
          .
        </p>
        <ExampleCards examples={ROLE_EXAMPLES.slice(0, SHOWN_EXAMPLES)} className="mt-8" />
      </section>

      <section
        aria-labelledby="builder-faq-title"
        className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
      >
        <h2 id="builder-faq-title" className={H2_CLASSES}>
          Questions
        </h2>
        <FaqList items={BUILDER_FAQ} className="lg:col-span-2" />
      </section>

      <ClosingPanel />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        links={[
          RELATED.examples,
          RELATED.templates,
          RELATED.jobMatch,
          RELATED.ats,
          RELATED.compare,
        ]}
      />
    </div>
  );
}
