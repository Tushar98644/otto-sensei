import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { IntentLink } from "@/components/site/intent-link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { Panel } from "@/components/ui/panel";
import { ATS_GUIDES, GENERAL_ADVICE, topTip } from "@/lib/seo-pages/ats";
import { ATS_INDEX_PAGE, RELATED } from "@/lib/seo-pages/pages";
import { atsPath } from "@/lib/seo-pages/paths";
import { displayItalic } from "../_components/display-italic";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "./_components/guide-parts";

export const metadata: Metadata = pageMetadata(ATS_INDEX_PAGE);

export default function AtsGuidesPage() {
  return (
    <div className={PAGE_CLASSES}>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "ATS guides", path: ATS_INDEX_PAGE.path },
        ]}
      />
      <PageIntro
        eyebrow="ATS guides"
        title={
          <>
            How hiring software <em className={displayItalic.className}>reads your resume</em>
          </>
        }
      >
        <p>
          An applicant tracking system (ATS) is the software employers use to collect and sort job
          applications. Here is what Otto has found on {ATS_GUIDES.length} of them, with a link to
          the page behind every note.
        </p>
      </PageIntro>

      <section aria-labelledby="systems-title" className="mt-12 sm:mt-16">
        <h2 id="systems-title" className="sr-only">
          Hiring systems
        </h2>
        <Panel className="max-sm:rounded-none max-sm:bg-transparent max-sm:p-0">
          <ul
            role="list"
            className="divide-y divide-border border-y border-border sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:border-0 lg:grid-cols-3"
          >
            {ATS_GUIDES.map((guide) => (
              <li key={guide.id}>
                <IntentLink
                  href={atsPath(guide.id)}
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
                  <span className="text-sm/6 text-pretty text-muted">{topTip(guide)}</span>
                  {guide.notes.length > 1 ? (
                    <span className="mt-auto pt-2 text-sm/5 text-subtle max-sm:hidden">
                      {guide.notes.length} sourced notes
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
          Advice that holds for most of them
        </h2>
        <p className="mt-4 max-w-prose text-base/7 text-pretty text-muted">
          These tips come up again and again across the systems above. Each guide has the details,
          and the sources, for one system.
        </p>
        <ul role="list" className="mt-6 divide-y divide-border border-y border-border">
          {GENERAL_ADVICE.map((tip) => (
            <li key={tip.title} className="flex flex-col gap-1 py-6">
              <h3 className="text-lg/7 font-medium tracking-tight text-ink">{tip.title}</h3>
              <p className="max-w-prose text-base/7 text-pretty text-muted">{tip.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <CheckCta className="mt-24 sm:mt-32" />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        links={[RELATED.templates, RELATED.compare, RELATED.pricing]}
      />
    </div>
  );
}
