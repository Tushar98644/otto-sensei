"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";
import { arrivedFromApp, JOB_PARAM, jobLinkParam } from "./job-links";

function loadedUrl(): string | null {
  const [entry] = performance.getEntriesByType("navigation");
  return entry?.name ?? null;
}

async function openOnTailor(link: string, compare: boolean): Promise<void> {
  const { queueJobForTailor } = await import("./session");
  queueJobForTailor({
    link,
    title: "",
    company: "",
    location: "",
    text: "",
    postedAt: null,
    readLink: true,
    ...(compare ? {} : { compare: false }),
  });
  useStudioStore.getState().setStep("tailor");
}

// /studio?job=<link> opens Tailor with that link read, the same hand-off Jobs uses.
export function JobLinkParam() {
  const param = useSearchParams().get(JOB_PARAM);
  // The saved step lands on hydration and would undo a step set before it.
  const hydrated = useStudioHydrated();

  useEffect(() => {
    if (!hydrated || param === null) return;
    // Next patches replaceState in its own mount effect, which runs after this one: wait a tick.
    const timer = window.setTimeout(() => {
      const here = window.location.href;
      const url = new URL(here);
      url.searchParams.delete(JOB_PARAM);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      const link = jobLinkParam(param);
      if (!link) return;
      const referrer = document.referrer;
      void openOnTailor(link, arrivedFromApp({ here, loaded: loadedUrl(), referrer, param }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, param]);

  return null;
}
