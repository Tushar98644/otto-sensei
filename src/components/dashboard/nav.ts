import {
  BriefcaseBusiness,
  FileText,
  House,
  LayoutTemplate,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/components/site/routes";
import { TRASH_ROUTE } from "./trash/trash-route";

// short: the name on the phone strip, where five long names don't fit.
// desktopOnly: left off the phone strip, which has room for five; phones reach it from a page.
export type AppNavItem = {
  href: string;
  label: string;
  short?: string;
  icon: LucideIcon;
  desktopOnly?: boolean;
};

export const APP_NAV: readonly AppNavItem[] = [
  { href: ROUTES.dashboard, label: "Home", icon: House },
  { href: ROUTES.dashboardResumes, label: "Resumes", icon: FileText },
  { href: ROUTES.dashboardApplications, label: "Applications", short: "Applied", icon: BriefcaseBusiness },
  { href: ROUTES.dashboardFormats, label: "Formats", icon: LayoutTemplate },
  { href: TRASH_ROUTE, label: "Recently deleted", icon: Trash2, desktopOnly: true },
  { href: ROUTES.dashboardAccount, label: "Account", icon: UserRound },
];

// Home matches only itself; the others also match their sub-pages.
export function isCurrent(item: AppNavItem, pathname: string): boolean {
  if (item.href === ROUTES.dashboard) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
