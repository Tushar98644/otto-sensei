import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { IntentLink } from "@/components/site/intent-link";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { Panel } from "@/components/ui/panel";
import { BRAND } from "@/config/brand";
import { COMPETITORS, COMPETITORS_CHECKED, choices, compareTitle } from "@/lib/seo-pages/compare";
import { COMPARE_INDEX_PAGE, RELATED, calendarMonth } from "@/lib/seo-pages/pages";
import { comparePath } from "@/lib/seo-pages/paths";
import {
  Breadcrumbs,
  CheckCta,
  PAGE_CLASSES,
  PageIntro,
  RelatedLinks,
} from "../ats/_components/guide-parts";
import { ChoiceLine } from "./_components/choice-line";

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
          Plain, side-by-side comparisons with other resume tools: what each one does well, what its
          plans include, and where Otto is different.
        </p>
        <p className="text-base/7 text-subtle">
          Facts about each product come from its own website, as of{" "}
          <time dateTime={COMPETITORS_CHECKED.slice(0, 7)}>
            {calendarMonth(COMPETITORS_CHECKED)}
          </time>
          , with a link to every source on each page.
        </p>
      </PageIntro>

      <section aria-labelledby="comparisons-title" className="mt-12 sm:mt-16">
        <h2 id="comparisons-title" className="sr-only">
          Comparisons
        </h2>
        <Panel>
          <ul role="list" className="grid gap-3 md:grid-cols-3">
            {COMPETITORS.map((competitor) => (
              <li key={competitor.slug}>
                <IntentLink
                  href={comparePath(competitor.slug)}
                  className="group flex h-full flex-col gap-4 rounded-2xl bg-surface p-5 transition-colors hover:bg-surface-hover sm:p-6"
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
                  {choices(competitor).map((choice) => (
                    <span key={choice.name} className="text-sm/6 text-pretty text-muted">
                      <ChoiceLine choice={choice} />
                    </span>
                  ))}
                </IntentLink>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <CheckCta className="mt-24 sm:mt-32" title={`Try ${BRAND.name} on your resume`} />

      <RelatedLinks
        className="mt-24 sm:mt-32"
        links={[RELATED.ats, RELATED.templates, RELATED.pricing]}
      />
    </div>
  );
}
