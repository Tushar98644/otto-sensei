"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { errorMessage } from "@/components/account/errors";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { POST_PARAM, POST_RESUME_PARAM, POST_START_PARAM } from "@/lib/extension/links";
import { useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";

const RESUME_WAIT_MS = 8_000;

// A fresh tab may still be bringing the account's resumes down when the link arrives.
function whenResume(id: string): Promise<boolean> {
  if (useStudioStore.getState().resumes[id]) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      stop();
      resolve(false);
    }, RESUME_WAIT_MS);
    const stop = useStudioStore.subscribe((state) => {
      if (!state.resumes[id]) return;
      window.clearTimeout(timer);
      stop();
      resolve(true);
    });
  });
}

async function openPost(postId: string, resumeId: string | null, start: boolean): Promise<void> {
  try {
    const [{ post }, { queueJobForTailor }] = await Promise.all([
      api.savedPost(postId),
      import("./session"),
    ]);
    if (resumeId && (await whenResume(resumeId))) useStudioStore.getState().setActive(resumeId);
    queueJobForTailor({
      link: post.url,
      title: post.title,
      company: post.company,
      location: post.location,
      text: post.text,
      postedAt: null,
      readLink: false,
      posting: {
        url: post.url,
        source: "page",
        title: post.title,
        company: post.company,
        location: post.location,
        firstPostedAt: null,
        updatedAt: null,
        closesAt: null,
      },
      // Only Tailor pressed in Otto for Chrome carries start=1; a plain link waits for a press here.
      ...(start ? {} : { compare: false }),
    });
    useStudioStore.getState().setStep("tailor");
  } catch (error) {
    toast({
      title: "Couldn't open that saved job",
      description: errorMessage(error),
      variant: "error",
    });
  }
}

// /studio?post=<id> opens Tailor on a job saved from Otto for Chrome, with the copy of its post.
export function PostParam() {
  const params = useSearchParams();
  const postId = params.get(POST_PARAM);
  const resumeId = params.get(POST_RESUME_PARAM);
  const start = params.get(POST_START_PARAM) === "1";
  const hydrated = useStudioHydrated();

  useEffect(() => {
    if (!hydrated || !postId) return;
    // Next patches replaceState in its own mount effect, which runs after this one: wait a tick.
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      for (const key of [POST_PARAM, POST_RESUME_PARAM, POST_START_PARAM])
        url.searchParams.delete(key);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      void openPost(postId, resumeId, start);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, postId, resumeId, start]);

  return null;
}
