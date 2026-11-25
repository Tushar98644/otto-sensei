import type { Messages } from "@/i18n/messages";
import { SEO_PATHS } from "@/lib/seo-pages/paths";

export const ROUTES = {
  home: "/",
  studio: "/studio",
  howItWorks: "/#how",
  jobsSection: "/#jobs",
  pricing: "/pricing",
  login: "/login",
  dashboard: "/dashboard",
  dashboardJobs: "/dashboard/jobs",
  dashboardResumes: "/dashboard/resumes",
  dashboardApplications: "/dashboard/applications",
  dashboardLetters: "/dashboard/letters",
  dashboardInterview: "/dashboard/interview",
  dashboardFormats: "/dashboard/formats",
  dashboardAccount: "/dashboard/account",
  account: "/account",
  upgrade: "/account?upgrade=1",
  privacy: "/privacy",
  terms: "/terms",
  refunds: "/refunds",
  acceptableUse: "/acceptable-use",
} as const;

export function upgradeHref(
  plan: "pro" | "max",
  interval: "month" | "year" = "month",
  next?: string | null,
): string {
  const back = next ? `&next=${encodeURIComponent(next)}` : "";
  return `${ROUTES.upgrade}&plan=${plan}&interval=${interval}${back}`;
}

export type NavLink = { href: string; label: string };

type SiteMessages = Messages["site"];

export function mainNav(nav: SiteMessages["nav"]): NavLink[] {
  return [
    { href: ROUTES.howItWorks, label: nav.howItWorks },
    { href: ROUTES.jobsSection, label: nav.jobs },
    { href: ROUTES.pricing, label: nav.pricing },
  ];
}

type FooterLinkKey = keyof SiteMessages["footer"]["links"];

export type FooterGroup = {
  id: keyof SiteMessages["footer"]["groups"];
  links: readonly { href: string; key: FooterLinkKey }[];
};

export const FOOTER_GROUPS: readonly FooterGroup[] = [
  {
    id: "product",
    links: [
      { href: SEO_PATHS.resumeBuilder, key: "resumeBuilder" },
      { href: SEO_PATHS.jobMatch, key: "jobMatch" },
      { href: SEO_PATHS.coverLetterGenerator, key: "coverLetters" },
      { href: SEO_PATHS.applicationTracker, key: "applicationTracker" },
      { href: SEO_PATHS.interviewPrep, key: "interviewPrep" },
      { href: SEO_PATHS.portfolioBuilder, key: "portfolioWebsite" },
      { href: ROUTES.pricing, key: "pricing" },
    ],
  },
  {
    id: "guides",
    links: [
      { href: SEO_PATHS.resumeExamples, key: "resumeExamples" },
      { href: SEO_PATHS.resumeTemplates, key: "resumeTemplates" },
      { href: SEO_PATHS.ats, key: "atsGuides" },
      { href: SEO_PATHS.compare, key: "comparisons" },
    ],
  },
  {
    id: "legal",
    links: [
      { href: ROUTES.privacy, key: "privacy" },
      { href: ROUTES.terms, key: "terms" },
      { href: ROUTES.refunds, key: "refunds" },
      { href: ROUTES.acceptableUse, key: "acceptableUse" },
    ],
  },
];

export const FOOTER_HREFS: readonly string[] = FOOTER_GROUPS.flatMap((group) =>
  group.links.map((link) => link.href),
);

export const LEGAL_LAST_UPDATED = "2026-11-23";
export const PRIVACY_LAST_UPDATED = "2026-11-25";
