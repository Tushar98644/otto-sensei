"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { roomForResume } from "@/components/account/pro-tools";
import { ROUTES } from "@/components/site/routes";
import { useStudioStore, type StudioStep } from "@/lib/store/resume-store";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";

// Every dashboard button that leads into the studio: set the active resume and step in the store
// (the studio reads both on arrival), then go there. Same starts as the studio's upload screen,
// and the same check first that Free has room for another resume.
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
      upload: () =>
        void roomForResume().then((room) => {
          if (room) go("upload");
        }),
      scratch: () =>
        void roomForResume().then((room) => {
          if (!room) return;
          addResume(emptyResume());
          go("fix");
        }),
      sample: () =>
        void roomForResume().then((room) => {
          if (!room) return;
          addResume(createSampleResume());
          go("fix");
        }),
    }),
    [addResume, go, open],
  );
}

export type StudioActions = ReturnType<typeof useStudioActions>;
