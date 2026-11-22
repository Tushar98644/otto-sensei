"use client";

import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import type { SavedPost } from "@/lib/extension/types";
import type { SavedJob } from "@/lib/job-feed/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { SAVED_JOBS, SAVED_POSTS } from "@/lib/queries/keys";
import { savedJobsQuery, savedPostsQuery, writingsQuery } from "@/lib/queries/options";
import type { Writing } from "@/lib/writings/schema";

export type BoardExtras = {
  savedJobs: SavedJob[];
  savedPosts: SavedPost[];
  writings: Writing[];
};

const NO_JOBS: SavedJob[] = [];
const NO_POSTS: SavedPost[] = [];
const NO_WRITINGS: Writing[] = [];

export function useBoardExtras(): BoardExtras {
  const { user } = useMe();
  const userId = user?.id ?? "";
  const client = useAppQueryClient();
  const saved = useQuery({ ...savedJobsQuery(userId), enabled: userId !== "" }, client);
  const written = useQuery({ ...writingsQuery(userId), enabled: userId !== "" }, client);
  const posts = useQuery({ ...savedPostsQuery(userId), enabled: userId !== "" }, client);
  return {
    savedJobs: saved.data ?? NO_JOBS,
    savedPosts: posts.data ?? NO_POSTS,
    writings: written.data?.items ?? NO_WRITINGS,
  };
}

export function forgetSavedJobs(): void {
  void getQueryClient().invalidateQueries({ queryKey: SAVED_JOBS });
}

// Gone from To apply at once; the delete waits for the undo toast, like an application's.
export function hideSavedPost(postId: string): void {
  getQueryClient().setQueriesData<SavedPost[]>({ queryKey: SAVED_POSTS }, (list) =>
    list?.filter((item) => item.id !== postId),
  );
}

export function restoreSavedPosts(): void {
  void getQueryClient().invalidateQueries({ queryKey: SAVED_POSTS });
}

export async function removeSavedPost(
  postId: string,
  options: { keepalive: boolean },
): Promise<void> {
  try {
    await api.removeSavedPost(postId, options);
  } finally {
    restoreSavedPosts();
  }
}
