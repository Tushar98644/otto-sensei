import { ROUTES } from "@/components/site/routes";
import { FREE_TEMPLATES } from "@/config/plans";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import {
  ATS_GUIDES,
  type AtsGuide,
  INDEXED_ATS_GUIDES,
  guideDescription,
  isIndexed,
  readsFiles,
} from "./ats";
import { COMPETITORS, COMPETITORS_CHECKED, type Competitor, compareTitle } from "./compare";
import { SEO_PAGES_UPDATED, SEO_PATHS, atsPath, comparePath } from "./paths";

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  lastModified: string;
  // Set when the title already names the brand, so the root template adds nothing.
  absoluteTitle?: boolean;
  noindex?: boolean;
};

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");

const competitorNames = (() => {
  const names = COMPETITORS.map((competitor) => competitor.name);
  const last = names.pop() ?? "";
  return names.length ? `${names.join(", ")} and ${last}` : last;
})();

const longDate = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

export function calendarDate(day: string): string {
  return longDate.format(new Date(`${day}T00:00:00Z`));
}

export const RESUME_TEMPLATES_PAGE: SeoPage = {
  path: SEO_PATHS.resumeTemplates,
  title: `Resume templates: ${FREE_TEMPLATES.length} free, all one column of real text`,
  description: `${TEMPLATE_IDS.length} resume formats, each one column of real text, tested by reading the PDF back. ${freeFormats} are free to download as PDFs with no paywall; the other ${TEMPLATE_IDS.length - FREE_TEMPLATES.length} come with Pro.`,
  lastModified: SEO_PAGES_UPDATED,
};

export const ATS_INDEX_PAGE: SeoPage = {
  path: SEO_PATHS.ats,
  title: "ATS guides: how hiring software reads your resume",
  description: `Sourced notes on ${ATS_GUIDES.length} applicant tracking systems, from Greenhouse and Workday to Taleo: how they read files, screen applicants and rank them with AI, linked to the pages each note comes from.`,
  lastModified: SEO_PAGES_UPDATED,
};

export const COMPARE_INDEX_PAGE: SeoPage = {
  path: SEO_PATHS.compare,
  title: "Compare Otto Sensei with other resume tools",
  absoluteTitle: true,
  description: `Fair, sourced comparisons of Otto Sensei with ${competitorNames}: what each does well, what the plans include, and where they differ.`,
  lastModified: COMPETITORS_CHECKED,
};

export function atsGuidePage(guide: AtsGuide): SeoPage {
  return {
    path: atsPath(guide.id),
    title: readsFiles(guide)
      ? `${guide.name} ATS: how it reads your resume`
      : `${guide.name} ATS: what it does with your application`,
    description: guideDescription(guide),
    lastModified: SEO_PAGES_UPDATED,
    noindex: !isIndexed(guide),
  };
}

export function comparePage(competitor: Competitor): SeoPage {
  return {
    path: comparePath(competitor.slug),
    title: compareTitle(competitor),
    absoluteTitle: true,
    description: `${compareTitle(competitor)}: what each does well, what the free and paid plans include, and where they differ. From each product's own pages, checked ${calendarDate(COMPETITORS_CHECKED)}.`,
    lastModified: COMPETITORS_CHECKED,
  };
}

// The pages search engines should index, for the sitemap and llms.txt.
export function seoPages(): SeoPage[] {
  return [
    RESUME_TEMPLATES_PAGE,
    ATS_INDEX_PAGE,
    ...INDEXED_ATS_GUIDES.map(atsGuidePage),
    COMPARE_INDEX_PAGE,
    ...COMPETITORS.map(comparePage),
  ];
}

export type RelatedLink = { href: string; title: string; text: string };

export const RELATED: Record<"templates" | "ats" | "compare" | "pricing", RelatedLink> = {
  templates: {
    href: RESUME_TEMPLATES_PAGE.path,
    title: "Resume templates",
    text: `${TEMPLATE_IDS.length} formats, each one column of real text. ${freeFormats} are free.`,
  },
  ats: {
    href: ATS_INDEX_PAGE.path,
    title: "ATS guides",
    text: `Sourced notes on ${ATS_GUIDES.length} hiring systems: how they read files, screen applicants and rank them with AI.`,
  },
  compare: {
    href: COMPARE_INDEX_PAGE.path,
    title: "Compare Otto Sensei",
    text: `How Otto differs from ${competitorNames}, from each product's own pages.`,
  },
  pricing: {
    href: ROUTES.pricing,
    title: "Pricing",
    text: "What's free, and what Pro and Max add.",
  },
};
