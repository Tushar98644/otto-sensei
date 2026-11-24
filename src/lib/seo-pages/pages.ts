import { TITLE_SUFFIX } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { BRAND } from "@/config/brand";
import { FREE_TEMPLATES, PLANS, PRO_TRIAL } from "@/config/plans";
import { planPrice, trialPrice } from "@/lib/billing/prices";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { SEO_LIMITS } from "@/lib/seo/limits";
import {
  ATS_GUIDES,
  type AtsGuide,
  INDEXED_ATS_GUIDES,
  guideDescription,
  isIndexed,
  readsFiles,
} from "./ats";
import { COMPETITORS, COMPETITORS_CHECKED, type Competitor, compareTitle } from "./compare";
import { ROLE_EXAMPLES, type RoleExample, latestExampleUpdate } from "./examples";
import {
  PRODUCT_PAGES_UPDATED,
  SEO_PAGES_UPDATED,
  SEO_PATHS,
  atsPath,
  comparePath,
  examplePath,
} from "./paths";

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

const monthYear = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function calendarMonth(day: string): string {
  return monthYear.format(new Date(`${day}T00:00:00Z`));
}

// A title too long for a search result keeps its keywords and drops the brand.
function fitTitle(title: string): Pick<SeoPage, "title" | "absoluteTitle"> {
  return `${title}${TITLE_SUFFIX}`.length <= SEO_LIMITS.title
    ? { title }
    : { title, absoluteTitle: true };
}

export const HOME_PAGE: SeoPage = {
  path: ROUTES.home,
  title: `Free ATS resume checker and builder with AI${TITLE_SUFFIX}`,
  absoluteTitle: true,
  description: `Free ATS resume checker and builder with ${BRAND.mascotName}'s AI help, plus jobs ranked for your resume, application tracking, interview prep and a portfolio site.`,
  lastModified: PRODUCT_PAGES_UPDATED,
};

export function pricingPage(trial: boolean): SeoPage {
  const { free, pro, max } = PLANS;
  const close = trial
    ? `Try ${pro.name} ${PRO_TRIAL.days} days for ${trialPrice()}.`
    : "Cancel anytime.";
  return {
    path: ROUTES.pricing,
    title: `Pricing and plans: ${free.name}, ${pro.name} and ${max.name}`,
    description: `One resume is free to check, fix and download as a PDF. ${pro.name} is ${planPrice("pro", "month")} a month for tailoring, cover letters and all formats; ${max.name} is ${planPrice("max", "month")}. ${close}`,
    lastModified: PRODUCT_PAGES_UPDATED,
  };
}

export const JOB_MATCH_PAGE: SeoPage = {
  path: SEO_PATHS.jobMatch,
  title: "Free resume to job description match checker",
  description:
    "Paste your resume and a job post or its link to see which skills and tools the post names, which your resume shows and which are missing. Free, no sign-in.",
  lastModified: PRODUCT_PAGES_UPDATED,
};

export const RESUME_TEMPLATES_PAGE: SeoPage = {
  path: SEO_PATHS.resumeTemplates,
  title: `ATS resume templates: ${TEMPLATE_IDS.length} formats, ${FREE_TEMPLATES.length} free`,
  description: `${TEMPLATE_IDS.length} resume templates, each one column of real text, tested by reading the PDF back. ${freeFormats} are free to download as PDFs; ${TEMPLATE_IDS.length - FREE_TEMPLATES.length} more come with ${PLANS.pro.name}.`,
  lastModified: SEO_PAGES_UPDATED,
};

export const ATS_INDEX_PAGE: SeoPage = {
  path: SEO_PATHS.ats,
  title: "ATS guides: how hiring software reads resumes",
  description: `How ${ATS_GUIDES.length} applicant tracking systems, from Greenhouse and Workday to Taleo, read resumes, screen applicants and rank them with AI. Each note links its source.`,
  lastModified: SEO_PAGES_UPDATED,
};

export const COMPARE_INDEX_PAGE: SeoPage = {
  path: SEO_PATHS.compare,
  title: `${BRAND.name} compared with ${COMPETITORS.length} other resume tools`,
  absoluteTitle: true,
  description: `Fair, sourced comparisons of ${BRAND.name} with ${COMPETITORS.length} resume tools, including Jobscan, Rezi, Zety, Teal and Canva: what each does well and what plans include.`,
  lastModified: COMPETITORS_CHECKED,
};

export const RESUME_BUILDER_PAGE: SeoPage = {
  path: SEO_PATHS.resumeBuilder,
  title: "Free resume builder with AI and ATS checks",
  description: `Build your resume free: start from scratch or a file, see the text hiring software reads, fix weak lines with ${BRAND.mascotName}'s AI help and download a clean PDF.`,
  lastModified: PRODUCT_PAGES_UPDATED,
};

// The year a searcher sees in a title says the advice is current; it follows the examples' own dates.
const EXAMPLES_YEAR = latestExampleUpdate().slice(0, 4);

export const RESUME_EXAMPLES_PAGE: SeoPage = {
  path: SEO_PATHS.resumeExamples,
  title: `${ROLE_EXAMPLES.length} resume examples for ${EXAMPLES_YEAR}, by job`,
  description: `${ROLE_EXAMPLES.length} full resume examples, from software engineer and data analyst to sales, marketing and entry-level roles, each with stronger lines, skills and mistakes.`,
  lastModified: latestExampleUpdate(),
};

export function exampleHeadline(example: Pick<RoleExample, "role">): string {
  return `${example.role} resume example`;
}

export function examplePage(example: RoleExample): SeoPage {
  const long = `${exampleHeadline(example)} (${EXAMPLES_YEAR}): skills and tips`;
  return {
    path: examplePath(example.slug),
    ...fitTitle(
      long.length <= SEO_LIMITS.title ? long : `${exampleHeadline(example)} (${EXAMPLES_YEAR})`,
    ),
    description: example.description,
    lastModified: example.updated,
  };
}

export function atsGuidePage(guide: AtsGuide): SeoPage {
  return {
    path: atsPath(guide.id),
    ...fitTitle(
      readsFiles(guide)
        ? `${guide.name} ATS: how it reads your resume`
        : `${guide.name} ATS: what it does with your application`,
    ),
    description: guideDescription(guide),
    lastModified: SEO_PAGES_UPDATED,
    noindex: !isIndexed(guide),
  };
}

export function comparePage(competitor: Competitor): SeoPage {
  return {
    path: comparePath(competitor.slug),
    title: `${competitor.name} alternative: ${compareTitle(competitor)} compared`,
    absoluteTitle: true,
    description: `${compareTitle(competitor)}: what each does well, what the free and paid plans include, and where they differ. Sourced from each product's own pages.`,
    lastModified: competitor.checked,
  };
}

// The pages search engines should index, for the sitemap and llms.txt.
export function seoPages(): SeoPage[] {
  return [
    RESUME_BUILDER_PAGE,
    RESUME_EXAMPLES_PAGE,
    ...ROLE_EXAMPLES.map(examplePage),
    RESUME_TEMPLATES_PAGE,
    ATS_INDEX_PAGE,
    ...INDEXED_ATS_GUIDES.map(atsGuidePage),
    COMPARE_INDEX_PAGE,
    ...COMPETITORS.map(comparePage),
  ];
}

export type RelatedLink = { href: string; title: string; text: string };

export const RELATED: Record<
  "builder" | "examples" | "jobMatch" | "templates" | "ats" | "compare" | "pricing",
  RelatedLink
> = {
  builder: {
    href: RESUME_BUILDER_PAGE.path,
    title: "Resume builder",
    text: "How Otto builds and checks a resume, what's free, and what Pro adds.",
  },
  examples: {
    href: RESUME_EXAMPLES_PAGE.path,
    title: "Resume examples",
    text: `${ROLE_EXAMPLES.length} full examples by job, each with stronger lines, skills and common mistakes.`,
  },
  jobMatch: {
    href: JOB_MATCH_PAGE.path,
    title: "Job match check",
    text: "Paste your resume and a job post to see which of its skills you show. Free, no sign-in.",
  },
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
