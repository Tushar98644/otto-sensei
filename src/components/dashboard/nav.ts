import {
  BriefcaseBusiness,
  FileText,
  Globe,
  House,
  LayoutTemplate,
  Mail,
  MessagesSquare,
  NotebookPen,
  Search,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { CAREER_LOG_ROUTE } from "@/lib/career-log/links";
import type { DashboardMessages } from "./i18n";
import { TRASH_ROUTE } from "./trash/trash-route";

export type NavKey = keyof DashboardMessages["nav"];

export type AppNavItem = {
  href: string;
  // The English name, which tests find a section by; people see nav[key] in their language.
  label: string;
  key: NavKey;
  icon: LucideIcon;
  pro?: boolean;
  tour?: string;
  // Prefetched as soon as it's shown instead of after the page settles; only for pages that load no data.
  eager?: boolean;
};

export const APP_NAV: readonly AppNavItem[] = [
  { href: ROUTES.dashboard, label: "Home", key: "home", icon: House },
  {
    href: ROUTES.dashboardResumes,
    label: "Resumes",
    key: "resumes",
    icon: FileText,
    tour: "dashboard-library",
  },
  { href: ROUTES.dashboardJobs, label: "Jobs", key: "jobs", icon: Search, tour: "dashboard-jobs" },
  {
    href: ROUTES.dashboardApplications,
    label: "Applications",
    key: "applications",
    icon: BriefcaseBusiness,
    tour: "dashboard-applications",
  },
  { href: ROUTES.dashboardLetters, label: "Letters", key: "letters", icon: Mail, pro: true },
  {
    href: ROUTES.dashboardInterview,
    label: "Interview prep",
    key: "interview",
    icon: MessagesSquare,
    pro: true,
    tour: "dashboard-interview",
  },
  {
    href: PORTFOLIO_ROUTE,
    label: "Portfolio",
    key: "portfolio",
    icon: Globe,
    pro: true,
    tour: "dashboard-portfolio",
  },
  { href: CAREER_LOG_ROUTE, label: "Career log", key: "careerLog", icon: NotebookPen },
];

export const APP_NAV_FOOTER: readonly AppNavItem[] = [
  {
    href: ROUTES.dashboardFormats,
    label: "Formats",
    key: "formats",
    icon: LayoutTemplate,
    eager: true,
  },
  { href: TRASH_ROUTE, label: "Recently deleted", key: "trash", icon: Trash2 },
];

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

export function isCurrent(item: AppNavItem, pathname: string): boolean {
  if (item.href === ROUTES.dashboard) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Free only: while the plan loads (null) nothing is marked, so paid accounts never see it flash.
export function showsProMark(item: { pro?: boolean }, proTools: boolean | null): boolean {
  return item.pro === true && proTools === false;
}
