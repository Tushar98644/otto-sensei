import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { Otto } from "@/components/mascot/otto";
import { JobMatchTool } from "@/components/match-check/job-match-tool";
import { IntentLink } from "@/components/site/intent-link";
import { JsonLd } from "@/components/site/json-ld";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Panel } from "@/components/ui/panel";
import { BRAND } from "@/config/brand";
import { appUrl } from "@/lib/env";
import { faqJsonLd, freeToolJsonLd, type FreeToolInfo } from "@/lib/seo/json-ld";
import { JOB_MATCH_PAGE } from "@/lib/seo-pages/pages";
import { cn } from "@/lib/utils";
import { displayItalic } from "../_components/display-italic";
import { FaqList, faqEntries } from "../_components/faq-list";
import { SECTION_TITLE_CLASSES } from "../_components/section";
import { JOB_MATCH_FAQ } from "./faq";

export const metadata: Metadata = pageMetadata(JOB_MATCH_PAGE);

const INTRO =
  "See which skills the post names, where your resume shows each one, and what's missing. Counts, not a made-up score.";

const JOB_MATCH_TOOL: FreeToolInfo = {
  name: `${BRAND.name} job match check`,
  path: JOB_MATCH_PAGE.path,
  description: INTRO,
};

export default function JobMatchPage() {
  return (
    <>
      <JsonLd data={freeToolJsonLd(JOB_MATCH_TOOL, appUrl())} />
      <JsonLd data={faqJsonLd(faqEntries(JOB_MATCH_FAQ))} />
      <div className="container-page pt-16 sm:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Eyebrow className="mb-4">Free, no sign-in</Eyebrow>
          <h1 className="font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
            Does your resume{" "}
            <em className={cn("block", displayItalic.className)}>match this job?</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg/7 text-muted sm:text-xl/8">{INTRO}</p>
        </div>
        <Panel className="mt-12 sm:mt-16">
          <JobMatchTool />
        </Panel>
        <section
          aria-labelledby="job-match-faq-title"
          className="mt-24 grid gap-12 sm:mt-32 lg:grid-cols-3"
        >
          <h2 id="job-match-faq-title" className={SECTION_TITLE_CLASSES}>
            What the check does
          </h2>
          <FaqList items={JOB_MATCH_FAQ} className="lg:col-span-2" />
        </section>
      </div>
      <ClosingPanel />
    </>
  );
}

// The check above is this page's main action, so the studio link here is a second one.
function ClosingPanel() {
  return (
    <section aria-labelledby="job-match-end-title" className="py-24 sm:py-32">
      <div className="container-page">
        <div className="flex flex-col items-center rounded-3xl bg-surface-muted px-6 py-16 text-center sm:py-24">
          <Otto
            pose="read"
            size={144}
            title="Otto the otter, reading a resume"
            className="size-28 sm:size-36"
          />
          <h2 id="job-match-end-title" className={cn("mt-8", SECTION_TITLE_CLASSES)}>
            See what the software sees.
          </h2>
          <IntentLink
            href={ROUTES.studio}
            className={buttonClasses({
              variant: "secondary",
              size: "lg",
              className: "mt-8 w-full sm:w-auto",
            })}
          >
            Check my resume
            <ArrowRight />
          </IntentLink>
          <p className="mt-3 text-sm text-subtle">
            Checking and PDFs are free. Pro and Max add more help from Otto.
          </p>
        </div>
      </div>
    </section>
  );
}
