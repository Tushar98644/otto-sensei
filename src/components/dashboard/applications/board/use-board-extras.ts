"use client";

import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/components/account/use-me";
import type { SavedJob } from "@/lib/job-feed/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { SAVED_JOBS } from "@/lib/queries/keys";
import { savedJobsQuery, writingsQuery } from "@/lib/queries/options";
import type { Writing } from "@/lib/writings/schema";

// What the board shows beside the applications themselves: saved jobs (the To apply column) and
// the letters and answers (a small mark on each card). Either failing only leaves its part out:
// the board itself still works from the applications and this browser's tailored copies.

export type BoardExtras = {
  savedJobs: SavedJob[];
  writings: Writing[];
};

const NO_JOBS: SavedJob[] = [];
const NO_WRITINGS: Writing[] = [];

export function useBoardExtras(): BoardExtras {
  const { user } = useMe();
  const userId = user?.id ?? "";
  const client = useAppQueryClient();
  const saved = useQuery({ ...savedJobsQuery(userId), enabled: userId !== "" }, client);
  const written = useQuery({ ...writingsQuery(userId), enabled: userId !== "" }, client);
  return {
    savedJobs: saved.data ?? NO_JOBS,
    writings: written.data?.items ?? NO_WRITINGS,
  };
}

/** After a job is saved or unsaved elsewhere (the Jobs tab): the board reads its list again. */
export function forgetSavedJobs(): void {
  void getQueryClient().invalidateQueries({ queryKey: SAVED_JOBS });
}
