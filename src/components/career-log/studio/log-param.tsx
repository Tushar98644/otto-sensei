"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { Lazy, lazyComponent } from "@/components/ui/lazy";
import { heldLines, type LinesHandoff } from "@/lib/career-log/handoff";
import { STUDIO_LOG_PARAM } from "@/lib/career-log/links";
import { useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";

const RESUME_WAIT_MS = 8_000;

const review = lazyComponent(() => import("./lines-review").then((m) => m.LinesReview));

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

// /studio?log=lines opens the lines Otto wrote from the career log on their resume, for the person to accept.
export function CareerLogParam() {
  const param = useSearchParams().get(STUDIO_LOG_PARAM);
  const hydrated = useStudioHydrated();
  const [handoff, setHandoff] = useState<LinesHandoff | null>(null);
  const t = useMessages("careerLogLines");

  useEffect(() => {
    if (!hydrated || param !== "lines") return;
    // Next patches replaceState in its own mount effect, which runs after this one: wait a tick.
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete(STUDIO_LOG_PARAM);
      window.history.replaceState(
        window.history.state,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      const held = heldLines(Date.now());
      if (!held) {
        toast({ title: t.gone, description: t.goneNote });
        return;
      }
      void whenResume(held.resumeId).then((found) => {
        if (!found) {
          toast({ title: t.noResume });
          return;
        }
        const store = useStudioStore.getState();
        store.setActive(held.resumeId);
        store.setStep("fix");
        setHandoff(held);
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [hydrated, param, t]);

  if (!handoff) return null;
  return <Lazy loader={review} wanted props={{ handoff, onClose: () => setHandoff(null) }} />;
}
