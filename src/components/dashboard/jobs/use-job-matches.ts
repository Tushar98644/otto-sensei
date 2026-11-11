"use client";

import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useNow } from "@/components/studio/use-now";
import { api } from "@/lib/api/client";
import type { JobMatchesRequestBody, JobMatchesResponse } from "@/lib/api/types";
import { deviceTimeZone } from "@/lib/eligibility/options";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { lookingForOf } from "@/lib/job-feed/looking-for";
import { matchProfileOf } from "@/lib/job-feed/profile";
import { DEFAULT_FILTERS, type JobFilters, type LookingForChoice } from "@/lib/job-feed/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { JOB_MATCHES, queryKeys } from "@/lib/queries/keys";
import { JOB_MATCHES_STALE_MS } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";

// Only the resume's skills, titles and years go out (matchProfileOf). Answers stay in the query
// cache, so coming back to the tab shows the last matches at once.

export type JobView = "matches" | "saved";

export type JobMatchesState =
  | { status: "idle" }
  | { status: "loading"; previous: JobMatchesResponse | null }
  | { status: "ready"; data: JobMatchesResponse }
  | { status: "error"; error: unknown };

const DAY_MS = 24 * 60 * 60 * 1_000;
const IDLE_KEY = [...JOB_MATCHES, "idle"] as const;

// A save changes the Saved view and every count, so other cached answers are dropped, and one on
// screen meanwhile (another page, picked while the save was on its way) is asked for again.
export function patchJobMatches(
  queryKey: readonly unknown[],
  change: (data: JobMatchesResponse) => JobMatchesResponse,
): void {
  const client = getQueryClient();
  const target = client.getQueryCache().find({ queryKey, exact: true });
  const other = (query: unknown) => query !== target;
  client.removeQueries({
    queryKey: JOB_MATCHES,
    predicate: (query) => other(query) && query.getObserversCount() === 0,
  });
  void client.invalidateQueries({ queryKey: JOB_MATCHES, predicate: other });
  client.setQueryData<JobMatchesResponse>(queryKey, (data) => (data ? change(data) : data));
}

function matchesBody(
  request: Omit<JobMatchesRequestBody, "deviceTimeZone">,
): JobMatchesRequestBody {
  return { ...request, deviceTimeZone: deviceTimeZone() };
}

// Built as the tab builds it, so a prefetch lands in the entry the tab reads.
export function openingMatchesRequest(
  resume: Resume | null,
  work: { profile: WorkProfile; lookingFor: LookingForChoice },
  now: number,
): JobMatchesRequestBody | null {
  if (!resume) return null;
  const profile = matchProfileOf(resume, Math.floor(now / DAY_MS) * DAY_MS);
  return matchesBody({
    view: "matches",
    profile,
    filters: { ...DEFAULT_FILTERS, remote: work.profile.remoteOnly === true },
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
  // What the person changed on the "Looking for" card; the rest is guessed.
  choice: LookingForChoice;
  workProfile: WorkProfile | null;
}) {
  const client = useAppQueryClient();
  // Years run to today for a job marked "Present"; the day is enough, so the shared clock's
  // ticks don't send a new request every 30 seconds. 0 until the clock is known.
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
    (change: (data: JobMatchesResponse) => JobMatchesResponse) => {
      if (queryKey) patchJobMatches(queryKey, change);
    },
    [queryKey],
  );

  let state: JobMatchesState;
  if (!queryKey) state = { status: "idle" };
  else if (query.isError && query.fetchStatus === "idle") {
    state = { status: "error", error: query.error };
  } else if (query.data && !query.isPlaceholderData) state = { status: "ready", data: query.data };
  else state = { status: "loading", previous: query.data ?? null };

  return { state, retry, patch, profile, lookingFor };
}
