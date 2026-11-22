"use client";

import type { QueryClient } from "@tanstack/react-query";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { preloadPortfolio } from "@/components/portfolio/screens";
import { ROUTES } from "@/components/site/routes";
import { hasProTools } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { getQueryClient } from "@/lib/queries/client";
import {
  portfolioQuery,
  prepPacksQuery,
  reminderSettingsQuery,
  savedJobsQuery,
  sharesQuery,
  workProfileQuery,
  writingsQuery,
} from "@/lib/queries/options";
import { applicationsQuery } from "./applications/use-applications";

type Prefetch = (client: QueryClient, user: SessionUser) => Promise<unknown>[];

const PAGES: Record<string, Prefetch> = {
  [ROUTES.dashboard]: (client, user) => [
    client.prefetchQuery(applicationsQuery(user.id)),
    client.prefetchQuery(workProfileQuery(user.id)),
    ...(hasProTools(user.plan) ? [client.prefetchQuery(reminderSettingsQuery(user.id))] : []),
  ],
  [ROUTES.dashboardResumes]: (client, user) => [client.prefetchQuery(sharesQuery(user.id))],
  [ROUTES.dashboardLetters]: (client, user) => [
    client.prefetchQuery(writingsQuery(user.id)),
    client.prefetchQuery(applicationsQuery(user.id)),
  ],
  // Both start now: matches wait only for the work profile, never the applications list.
  [ROUTES.dashboardJobs]: (client, user) => [
    client.prefetchQuery(workProfileQuery(user.id)),
    client.prefetchQuery(applicationsQuery(user.id)),
    import("./jobs/prefetch-matches").then(({ prefetchMatches }) =>
      prefetchMatches(client, user.id),
    ),
  ],
  [ROUTES.dashboardApplications]: (client, user) => [
    client.prefetchQuery(applicationsQuery(user.id)),
    client.prefetchQuery(savedJobsQuery(user.id)),
    client.prefetchQuery(writingsQuery(user.id)),
    ...(hasProTools(user.plan) ? [client.prefetchQuery(reminderSettingsQuery(user.id))] : []),
  ],
  [ROUTES.dashboardInterview]: (client, user) => [
    client.prefetchQuery(prepPacksQuery(user.id)),
    client.prefetchQuery(applicationsQuery(user.id)),
  ],
  [PORTFOLIO_ROUTE]: (client, user) => [
    client.prefetchQuery(portfolioQuery(user.id)),
    ...(user.plan === "free" ? [] : [client.prefetchQuery(sharesQuery(user.id))]),
    preloadPortfolio(client, user),
  ],
};

// After a full page load, from the layout's seeds: the other pages' small reads, so moving to one waits on none.
export function warmSharedReads(user: SessionUser): void {
  const client = getQueryClient();
  const pro = hasProTools(user.plan)
    ? [
        client.prefetchQuery(reminderSettingsQuery(user.id)),
        client.prefetchQuery(savedJobsQuery(user.id)),
        client.prefetchQuery(writingsQuery(user.id)),
        client.prefetchQuery(prepPacksQuery(user.id)),
      ]
    : [];
  void Promise.allSettled([
    client.prefetchQuery(applicationsQuery(user.id)),
    client.prefetchQuery(sharesQuery(user.id)),
    ...pro,
  ]);
}

export function prefetchPageData(href: string, user: SessionUser | null): void {
  const prefetch = PAGES[href];
  if (!user || !prefetch) return;
  void Promise.allSettled(prefetch(getQueryClient(), user));
}
