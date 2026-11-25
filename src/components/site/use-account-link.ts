"use client";

import { useMe } from "@/components/account/use-me";
import { ROUTES, type NavLink } from "./routes";

// The header's words, translated by its server parent (src/components/site/site-header.tsx).
export type HeaderCopy = {
  navLabel: string;
  nav: readonly NavLink[];
  signIn: NavLink;
  dashboard: string;
  checkMyResume: string;
  menu: string;
  homePath: string;
};

export function dashboardLink(copy: HeaderCopy): NavLink {
  return { href: ROUTES.dashboard, label: copy.dashboard };
}

export function useSignedIn(): boolean {
  return useMe().user !== null;
}

export function useMarketingLinks(copy: HeaderCopy): readonly NavLink[] {
  return useSignedIn() ? [dashboardLink(copy)] : [...copy.nav, copy.signIn];
}
