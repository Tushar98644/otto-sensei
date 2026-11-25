"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { errorMessage } from "@/components/account/errors";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { api } from "@/lib/api/client";
import { POST_PARAM, POST_RESUME_PARAM, POST_START_PARAM } from "@/lib/extension/links";
import type { SavedPost } from "@/lib/extension/types";

export type PostLink = {
  post: SavedPost & { text: string };
  resumeId: string | null;
  start: boolean;
};

function takeLink(): { postId: string; resumeId: string | null; start: boolean } | null {
  const url = new URL(window.location.href);
  const postId = url.searchParams.get(POST_PARAM);
  if (!postId) return null;
  const resumeId = url.searchParams.get(POST_RESUME_PARAM);
  const start = url.searchParams.get(POST_START_PARAM) === "1";
  for (const key of [POST_PARAM, POST_RESUME_PARAM, POST_START_PARAM]) url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return { postId, resumeId, start };
}

// /dashboard/letters?post=<id> opens the letter dialog on a job saved from Otto for Chrome.
export function usePostLink(ready: boolean, onPost: (link: PostLink) => void): void {
  const { page } = useMessages("letters");
  const taken = useRef(false);
  const open = useEffectEvent(onPost);
  const failed = useEffectEvent((error: unknown) =>
    toast({ title: page.cantOpenSaved, description: errorMessage(error), variant: "error" }),
  );
  useEffect(() => {
    if (!ready || taken.current) return;
    taken.current = true;
    const link = takeLink();
    if (!link) return;
    api.savedPost(link.postId).then(
      ({ post }) => open({ post, resumeId: link.resumeId, start: link.start }),
      (error: unknown) => failed(error),
    );
  }, [ready]);
}
