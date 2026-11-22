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

export const MAIN_NAV: readonly NavLink[] = [
  { href: ROUTES.howItWorks, label: "How it works" },
  { href: ROUTES.jobsSection, label: "Jobs" },
  { href: ROUTES.pricing, label: "Pricing" },
];

export const SIGN_IN_LINK: NavLink = { href: ROUTES.login, label: "Sign in" };

export type NavGroup = { title: string; links: readonly NavLink[] };

export const FOOTER_GROUPS: readonly NavGroup[] = [
  {
    title: "Product",
    links: [
      { href: SEO_PATHS.jobMatch, label: "Job match check" },
      { href: ROUTES.pricing, label: "Pricing" },
    ],
  },
  {
    title: "Guides",
    links: [
      { href: SEO_PATHS.resumeTemplates, label: "Resume templates" },
      { href: SEO_PATHS.ats, label: "ATS guides" },
      { href: SEO_PATHS.compare, label: "Comparisons" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: ROUTES.privacy, label: "Privacy" },
      { href: ROUTES.terms, label: "Terms" },
      { href: ROUTES.refunds, label: "Refunds" },
      { href: ROUTES.acceptableUse, label: "Acceptable use" },
    ],
  },
];

export const FOOTER_NAV: readonly NavLink[] = FOOTER_GROUPS.flatMap((group) => group.links);

export const LEGAL_LAST_UPDATED = "2026-11-20";
export const PRIVACY_LAST_UPDATED = "2026-11-22";
