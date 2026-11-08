"use client";

import { useMe } from "@/components/account/use-me";
import { MAIN_NAV, ROUTES, SIGN_IN_LINK, type NavLink } from "./routes";

export const DASHBOARD_LINK: NavLink = { href: ROUTES.dashboard, label: "Dashboard" };

// Marketing pages are static files, so they first render the signed-out header. Once /api/me
// answers, a signed-in visitor gets the app's header instead: no sales links, just the way back to
// their dashboard.
export function useSignedIn(): boolean {
  return useMe().user !== null;
}

export function useMarketingLinks(): readonly NavLink[] {
  return useSignedIn() ? [DASHBOARD_LINK] : [...MAIN_NAV, SIGN_IN_LINK];
}
