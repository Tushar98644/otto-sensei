"use client";

import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queries/keys";
import { JOB_MATCHES_STALE_MS, workProfileQuery } from "@/lib/queries/options";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { readFilterMemory } from "./use-filter-memory";
import { openingMatchesRequest, prefetchedMatches } from "./use-job-matches";
import { matchingResumeId } from "./view";

export async function prefetchMatches(client: QueryClient, userId: string): Promise<void> {
  const work = await client.ensureQueryData(workProfileQuery(userId));
  const { order, resumes } = useStudioStore.getState();
  const list = order.map((id) => resumes[id]).filter((resume): resume is Resume => Boolean(resume));
  const memory = readFilterMemory(userId);
  const id = matchingResumeId(list, memory.resumeId);
  const body = openingMatchesRequest(
    list.find((resume) => resume.id === id) ?? null,
    work,
    Date.now(),
    memory,
  );
  if (!body) return;
  await client.prefetchQuery({
    queryKey: queryKeys.jobMatches(userId, body, work.profile),
    queryFn: () => prefetchedMatches(body),
    staleTime: JOB_MATCHES_STALE_MS,
  });
}
