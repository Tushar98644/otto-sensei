"use client";

import type { QueryClient } from "@tanstack/react-query";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
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

// Asked for once the pointer or focus lands on a link, so it's usually cached by the click.

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
  [ROUTES.dashboardJobs]: (client, user) => [
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
  [PORTFOLIO_ROUTE]: (client, user) => [client.prefetchQuery(portfolioQuery(user.id))],
};

export function prefetchPageData(href: string, user: SessionUser | null): void {
  const prefetch = PAGES[href];
  if (!user || !prefetch) return;
  void Promise.allSettled(prefetch(getQueryClient(), user));
}
