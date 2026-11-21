"use client";

import { useQuery } from "@tanstack/react-query";
import { useSessionUserId } from "@/components/account/session-user";
import type { SavedJob } from "@/lib/job-feed/types";
import { useAppQueryClient } from "@/lib/queries/client";
import { savedJobsQuery } from "@/lib/queries/options";

const NONE: SavedJob[] = [];

// Saved jobs are a Pro tool, so Free accounts never ask for them.
export function useSavedJobs(enabled: boolean): SavedJob[] {
  const userId = useSessionUserId() ?? "";
  const client = useAppQueryClient();
  const query = useQuery({ ...savedJobsQuery(userId), enabled: enabled && userId !== "" }, client);
  return query.data ?? NONE;
}
