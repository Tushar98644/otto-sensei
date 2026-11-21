"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ROUTES } from "@/components/site/routes";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { useResumeList, useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";
import { formatTarget, openFormat } from "./apply-format";

export type ApplyFormat = {
  ready: boolean;
  resumes: readonly Resume[];
  target: Resume | null;
  pick: (id: string) => void;
  opening: TemplateId | null;
  apply: (id: TemplateId) => void;
};

export function useApplyFormat(): ApplyFormat {
  const router = useRouter();
  const ready = useStudioHydrated();
  const resumes = useResumeList();
  const [picked, setPicked] = useState<string | null>(null);
  const target = useStudioStore((s) => formatTarget(s, picked));
  const [opening, setOpening] = useState<TemplateId | null>(null);

  useEffect(() => {
    router.prefetch(ROUTES.studio);
  }, [router]);

  const apply = useCallback(
    (id: TemplateId) => {
      setOpening(id);
      // Read at click time: cloud sync may have changed the list since the last render.
      openFormat(useStudioStore.getState(), id, picked);
      router.push(ROUTES.studio);
    },
    [router, picked],
  );

  return { ready, resumes, target, pick: setPicked, opening, apply };
}
