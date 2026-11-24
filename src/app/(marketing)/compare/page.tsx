import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { IntentLink } from "@/components/site/intent-link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import {
  COMPETITORS,
  COMPETITORS_CHECKED,
  compareTitle,
  ottoReasons,
} from "@/lib/seo-pages/compare";
import { COMPARE_INDEX_PAGE, RELATED, calendarMonth } from "@/lib/seo-pages/pages";
import { comparePath } from "@/lib/seo-pages/paths";
import {
  Breadcrumbs,
  CheckCta,
  H2_CLASSES,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { PipelineStrip } from "./_components/compare-parts";

export const metadata: Metadata = pageMetadata(COMPARE_INDEX_PAGE);

export default function CompareIndexPage() {
  return (
    <div className={PAGE_CLASSES}>
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: ROUTES.home },
          { name: "Compare", path: COMPARE_INDEX_PAGE.path },
        ]}
      />
      <PageIntro eyebrow="Compare" title={`How ${BRAND.name} compares`}>
        <p>
          {BRAND.shortName} doesn&apos;t stop at the resume: it carries on through the jobs, the
          applications and the interviews. Here is how it compares, tool by tool.
        </p>
        <p className="text-base/7 text-subtle">
          Facts about each product come from its own website, as of{" "}
          <time dateTime={COMPETITORS_CHECKED.slice(0, 7)}>
            {calendarMonth(COMPETITORS_CHECKED)}
          </time>
          , with a link to every source on each page.
        </p>
      </PageIntro>

      <PipelineStrip className="mt-16 sm:mt-24" />

      <section aria-labelledby="comparisons-title" className="mt-24 sm:mt-32">
        <h2 id="comparisons-title" className={H2_CLASSES}>
          {BRAND.name} vs the others
        </h2>
        <ul role="list" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COMPETITORS.map((competitor) => (
            <li key={competitor.slug}>
              <IntentLink
                href={comparePath(competitor.slug)}
                className="group flex h-full flex-col gap-3 rounded-3xl bg-surface p-6 shadow-card transition-colors hover:bg-surface-hover"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="text-lg/7 font-medium tracking-tight text-ink">
                    {compareTitle(competitor)}
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="text-sm/6 text-pretty text-muted">
                  {ottoReasons(competitor)[0]?.text}
                </span>
              </IntentLink>
            </li>
          ))}
        </ul>
      </section>

      <CheckCta className="mt-24 sm:mt-32" title={`Try ${BRAND.name} on your resume`} />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        links={[RELATED.ats, RELATED.templates, RELATED.pricing]}
      />
    </div>
  );
}
