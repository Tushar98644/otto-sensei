// Public URLs the marketing site links to. The account-ui task owns /login and /account; the
// account page reads ?upgrade=1 to start sign-in and checkout.
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

/**
 * The account page link that signs in if needed and goes straight on to checkout for this plan,
 * with no dialog in between for someone already signed in.
 */
export function upgradeHref(
  plan: "pro" | "max",
  interval: "month" | "year" | "week" = "month",
): string {
  return `${ROUTES.upgrade}&plan=${plan}&interval=${interval}`;
}

export type NavLink = { href: string; label: string };

export const MAIN_NAV: readonly NavLink[] = [
  { href: ROUTES.howItWorks, label: "How it works" },
  { href: ROUTES.jobsSection, label: "Jobs" },
  { href: ROUTES.pricing, label: "Pricing" },
];

export const SIGN_IN_LINK: NavLink = { href: ROUTES.login, label: "Sign in" };

export const FOOTER_NAV: readonly NavLink[] = [
  { href: ROUTES.pricing, label: "Pricing" },
  { href: ROUTES.privacy, label: "Privacy" },
  { href: ROUTES.terms, label: "Terms" },
  { href: ROUTES.refunds, label: "Refunds" },
  { href: ROUTES.acceptableUse, label: "Acceptable use" },
];

// Shown at the top of every legal page and used as their sitemap lastmod. Bump it with any edit.
export const LEGAL_LAST_UPDATED = "2026-11-11";
