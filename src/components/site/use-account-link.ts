"use client";

import { useMe } from "@/components/account/use-me";
import { MAIN_NAV, ROUTES, SIGN_IN_LINK, type NavLink } from "./routes";

export const DASHBOARD_LINK: NavLink = { href: ROUTES.dashboard, label: "Dashboard" };

// Marketing pages are static, so they render signed out first; once /api/me answers, a signed-in
// visitor gets the app's header.
export function useSignedIn(): boolean {
  return useMe().user !== null;
}

export function useMarketingLinks(): readonly NavLink[] {
  return useSignedIn() ? [DASHBOARD_LINK] : [...MAIN_NAV, SIGN_IN_LINK];
}
