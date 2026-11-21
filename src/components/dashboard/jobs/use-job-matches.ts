"use client";

import { keepPreviousData, skipToken, useQuery, type Query } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useNow } from "@/components/studio/use-now";
import { api } from "@/lib/api/client";
import type { JobMatchesRequestBody, JobMatchesResponse } from "@/lib/api/types";
import { deviceTimeZone } from "@/lib/eligibility/options";
import { isProfileStarted, type WorkProfile } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import type { JobFilters, LookingForChoice } from "@/lib/job-feed/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { JOB_MATCHES, queryKeys } from "@/lib/queries/keys";
import { JOB_MATCHES_STALE_MS } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";
import { DAY_MS } from "@/lib/time";
import { memoryFilters, NO_MEMORY, type FilterMemory } from "./filter-memory";

// Only the resume's skills, titles and years are sent (matchProfileOf).

export type JobView = "matches" | "saved";

export type JobMatchesState =
  | { status: "idle" }
  | { status: "loading"; previous: JobMatchesResponse | null }
  | { status: "ready"; data: JobMatchesResponse }
  | { status: "error"; error: unknown };

export type SavedMark = { jobId: string; saved: boolean; savedCount: number };

const IDLE_KEY = [...JOB_MATCHES, "idle"] as const;

function marked(data: JobMatchesResponse, mark: SavedMark): JobMatchesResponse {
  return {
    ...data,
    savedCount: mark.savedCount,
    jobs: data.jobs.map((job) => (job.id === mark.jobId ? { ...job, saved: mark.saved } : job)),
  };
}

export function patchJobMatches(
  queryKey: readonly unknown[],
  change: (data: JobMatchesResponse) => JobMatchesResponse,
  mark: SavedMark,
): void {
  const client = getQueryClient();
  const cache = client.getQueryCache();
  const target = cache.find({ queryKey, exact: true });
  const savedList = (query: Query) =>
    query !== target && (query.queryKey[2] as { view?: unknown } | undefined)?.view === "saved";
  // A Saved list gains or loses the job, so it loads again; a Matches list only flips its flag.
  client.removeQueries({
    queryKey: JOB_MATCHES,
    predicate: (query) => savedList(query) && query.getObserversCount() === 0,
  });
  void client.invalidateQueries({ queryKey: JOB_MATCHES, predicate: savedList });
  for (const query of cache.findAll({ queryKey: JOB_MATCHES })) {
    const data = query.state.data as JobMatchesResponse | undefined;
    if (query === target || savedList(query) || !data) continue;
    client.setQueryData(query.queryKey, marked(data, mark), {
      updatedAt: query.state.dataUpdatedAt,
    });
  }
  client.setQueryData<JobMatchesResponse>(queryKey, (data) => (data ? change(data) : data));
}

// Hover prefetches aren't logged as seen (JOBS_PREFETCH_HEADER), so the page logs them once shown.
const unseen = new Set<string>();

export async function prefetchedMatches(body: JobMatchesRequestBody): Promise<JobMatchesResponse> {
  const data = await api.jobMatches(body, { prefetch: true });
  if (data.requestId) unseen.add(data.requestId);
  return data;
}

export function noteShown(data: JobMatchesResponse): void {
  const { requestId, resumeHash } = data;
  if (!requestId || !resumeHash || !unseen.delete(requestId) || data.jobs.length === 0) return;
  void api
    .jobImpressions({
      kind: "impressions",
      requestId,
      variant: data.variant,
      resumeHash,
      jobs: data.jobs.map((job) => ({
        jobId: job.id,
        position: job.position,
        label: job.match.label,
      })),
    })
    .catch(() => undefined);
}

function matchesBody(
  request: Omit<JobMatchesRequestBody, "deviceTimeZone">,
): JobMatchesRequestBody {
  return { ...request, deviceTimeZone: deviceTimeZone() };
}

export function pageFilters(memory: FilterMemory, work: WorkProfile | null): JobFilters {
  return memoryFilters(memory, {
    remote: work?.remoteOnly === true,
    profileReady: work !== null && isProfileStarted(work),
  });
}

export function openingMatchesRequest(
  resume: Resume | null,
  work: { profile: WorkProfile; lookingFor: LookingForChoice },
  now: number,
  memory: FilterMemory = NO_MEMORY,
): JobMatchesRequestBody | null {
  if (!resume) return null;
  const profile = matchProfileOf(resume, Math.floor(now / DAY_MS) * DAY_MS);
  return matchesBody({
    view: "matches",
    profile,
    filters: pageFilters(memory, work.profile),
    page: 1,
    lookingFor: lookingForOf(profile, work.profile, work.lookingFor),
  });
}

export function useJobMatches({
  userId,
  resume,
  view,
  filters,
  page,
  choice,
  workProfile,
}: {
  userId: string | null;
  resume: Resume | null;
  view: JobView;
  filters: JobFilters;
  page: number;
  choice: LookingForChoice;
  workProfile: WorkProfile | null;
}) {
  const client = useAppQueryClient();
  // Rounded to the day so the shared clock's 30-second ticks don't send a new request.
  const now = useNow();
  const day = now === 0 ? 0 : Math.floor(now / DAY_MS);
  const profile = useMemo(
    () => (resume && day > 0 ? matchProfileOf(resume, day * DAY_MS) : null),
    [resume, day],
  );
  const lookingFor = useMemo(
    () => (profile ? lookingForOf(profile, workProfile, choice) : null),
    [profile, workProfile, choice],
  );
  const body = useMemo(
    () =>
      profile && lookingFor ? matchesBody({ view, profile, filters, page, lookingFor }) : null,
    [profile, view, filters, page, lookingFor],
  );
  const queryKey = useMemo(
    () => (userId && body ? queryKeys.jobMatches(userId, body, workProfile) : null),
    [userId, body, workProfile],
  );
  const query = useQuery(
    // eslint-disable-next-line @tanstack/query/exhaustive-deps -- queryKey is built from body above
    {
      queryKey: queryKey ?? IDLE_KEY,
      queryFn: body && queryKey ? () => api.jobMatches(body) : skipToken,
      staleTime: JOB_MATCHES_STALE_MS,
      placeholderData: keepPreviousData,
    },
    client,
  );
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);
  const patch = useCallback(
    (change: (data: JobMatchesResponse) => JobMatchesResponse, mark: SavedMark) => {
      if (queryKey) patchJobMatches(queryKey, change, mark);
    },
    [queryKey],
  );

  let state: JobMatchesState;
  if (!queryKey) state = { status: "idle" };
  else if (query.isError && query.fetchStatus === "idle") {
    state = { status: "error", error: query.error };
  } else if (query.data && !query.isPlaceholderData) state = { status: "ready", data: query.data };
  else state = { status: "loading", previous: query.data ?? null };

  const shown = state.status === "ready" ? state.data : null;
  useEffect(() => {
    if (shown) noteShown(shown);
  }, [shown]);

  return { state, retry, patch, profile, lookingFor };
}
