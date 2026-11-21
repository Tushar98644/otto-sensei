"use client";

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { JOB_MATCHES_STALE_MS, workProfileQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";
import { openingMatchesRequest, prefetchedMatches } from "../jobs/use-job-matches";
import { defaultResumeId } from "../jobs/view";
import type { MatchCounts } from "./next-steps";

// The same request and cache entry as the Jobs tab's opening list, so opening Jobs after this is instant.
export async function loadMatchCounts(
  client: QueryClient,
  userId: string,
  resumes: readonly Resume[],
  own: ReadonlySet<string>,
): Promise<MatchCounts | null> {
  const id = defaultResumeId(resumes);
  if (!id || !own.has(id)) return null;
  const work = await client.ensureQueryData(workProfileQuery(userId));
  const body = openingMatchesRequest(
    resumes.find((resume) => resume.id === id) ?? null,
    work,
    Date.now(),
  );
  if (!body) return null;
  const data = await client.fetchQuery({
    queryKey: queryKeys.jobMatches(userId, body, work.profile),
    queryFn: () => prefetchedMatches(body),
    staleTime: JOB_MATCHES_STALE_MS,
  });
  return data.locked ? null : { strong: data.strong, newToday: data.newToday };
}
