import {
  BriefcaseBusiness,
  FileText,
  Globe,
  House,
  LayoutTemplate,
  Mail,
  MessagesSquare,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { TRASH_ROUTE } from "./trash/trash-route";

// short: the name on the phone strip, where long names don't fit.
// pro: the page is Pro as a whole. On Free the item carries a small "Pro" badge but stays a link:
// its page says what the feature does and offers the trial.
export type AppNavItem = {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  pro?: boolean;
};

// The sections, in the owner's order (2026-11-08). Every feature has its own place here, so
// nothing is only reachable from inside another screen.
export const APP_NAV: readonly AppNavItem[] = [
  { href: ROUTES.dashboard, label: "Home", icon: House },
  { href: ROUTES.dashboardResumes, label: "Resumes", icon: FileText },
  {
    href: ROUTES.dashboardLetters,
    label: "Cover letters",
    short: "Letters",
    icon: Mail,
    pro: true,
  },
  { href: ROUTES.dashboardJobs, label: "Jobs", icon: Search },
  {
    href: ROUTES.dashboardApplications,
    label: "Applications",
    // "Applications" is cut off in a fifth of a small phone; "Applied" is one of its columns.
    short: "Tracker",
    icon: BriefcaseBusiness,
  },
  { href: ROUTES.dashboardInterview, label: "Interview prep", icon: MessagesSquare, pro: true },
  { href: PORTFOLIO_ROUTE, label: "Portfolio", icon: Globe, pro: true },
  { href: ROUTES.dashboardFormats, label: "Formats", icon: LayoutTemplate },
];

// Pinned to the bottom of the sidebar, under the sections. Account isn't here: the signed-in menu at
// the foot of the sidebar (and the avatar on phones) already opens it (owner, 2026-11-09).
export const APP_NAV_FOOTER: readonly AppNavItem[] = [
  { href: TRASH_ROUTE, label: "Recently deleted", icon: Trash2 },
];

// Phones: the four sections people come back to most on the strip, everything else behind "More"
// in the sidebar's order. Applications is a tab and Cover letters waits under More: letters are
// mostly written from Tailor, while the tracker is checked between applications.
const PHONE_TAB_HREFS: readonly string[] = [
  ROUTES.dashboard,
  ROUTES.dashboardResumes,
  ROUTES.dashboardJobs,
  ROUTES.dashboardApplications,
];
export const PHONE_TABS: readonly AppNavItem[] = PHONE_TAB_HREFS.flatMap((href) =>
  APP_NAV.filter((item) => item.href === href),
);
export const PHONE_MORE: readonly AppNavItem[] = [
  ...APP_NAV.filter((item) => !PHONE_TAB_HREFS.includes(item.href)),
  ...APP_NAV_FOOTER,
];

// Home matches only itself; the others also match their sub-pages.
export function isCurrent(item: AppNavItem, pathname: string): boolean {
  if (item.href === ROUTES.dashboard) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** The badge shows on Free only: never while the plan is loading, never on Pro, Max or the trial. */
export function showsProBadge(item: AppNavItem, proTools: boolean | null): boolean {
  return item.pro === true && proTools === false;
}
