"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ROUTES } from "@/components/site/routes";
import { useStudioStore, type StudioStep } from "@/lib/store/resume-store";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";

// Every dashboard button that leads into the studio: set the active resume and step in the store
// (the studio reads both on arrival), then go there. Same starts as the studio's upload screen.
export function useStudioActions() {
  const router = useRouter();
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const addResume = useStudioStore((s) => s.addResume);

  const go = useCallback(
    (step: StudioStep) => {
      setStep(step);
      router.push(ROUTES.studio);
    },
    [router, setStep],
  );

  const open = useCallback(
    (id: string, step: StudioStep) => {
      setActive(id);
      go(step);
    },
    [go, setActive],
  );

  return useMemo(
    () => ({
      open,
      upload: () => go("upload"),
      scratch: () => {
        addResume(emptyResume());
        go("fix");
      },
      sample: () => {
        addResume(createSampleResume());
        go("fix");
      },
    }),
    [addResume, go, open],
  );
}

export type StudioActions = ReturnType<typeof useStudioActions>;
