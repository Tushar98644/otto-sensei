"use client";

import type { QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { JOB_MATCHES_STALE_MS, workProfileQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { applicationsQuery } from "../applications/use-applications";
import { openingMatchesRequest } from "./use-job-matches";
import { defaultResumeId } from "./view";

// Picks the resume the same way the tab does, so the prefetch lands in the entry it reads.
// Loaded only when wanted, so the matching rules stay out of the dashboard's first load.
export async function prefetchMatches(client: QueryClient, userId: string): Promise<void> {
  const [work] = await Promise.all([
    client.ensureQueryData(workProfileQuery(userId)),
    client.prefetchQuery(applicationsQuery(userId)),
  ]);
  const { order, resumes } = useStudioStore.getState();
  const list = order.map((id) => resumes[id]).filter((resume): resume is Resume => Boolean(resume));
  const id = defaultResumeId(list);
  const body = openingMatchesRequest(
    list.find((resume) => resume.id === id) ?? null,
    work,
    Date.now(),
  );
  if (!body) return;
  await client.prefetchQuery({
    queryKey: queryKeys.jobMatches(userId, body, work.profile),
    queryFn: () => api.jobMatches(body),
    staleTime: JOB_MATCHES_STALE_MS,
  });
}
