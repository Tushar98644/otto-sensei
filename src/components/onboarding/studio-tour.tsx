"use client";

import { useMessages } from "@/i18n/client";
import { useActiveReport, useStudioStore, type StudioStep } from "@/lib/store/resume-store";
import { studioTourEligible } from "./tours";
import { useFirstRunTour } from "./use-first-run-tour";

export function StudioTour({ step }: { step: StudioStep }) {
  const hasResume = useStudioStore(
    (state) => state.activeId !== null && Object.hasOwn(state.resumes, state.activeId),
  );
  const hasReport = useActiveReport() !== null;
  const eligible = studioTourEligible({ step, hasResume, hasReport });
  const copy = useMessages("onboarding");

  useFirstRunTour("studio", eligible, copy, async () => {
    const state = useStudioStore.getState();
    const resume = state.activeId ? state.resumes[state.activeId] : undefined;
    if (!resume) return null;
    const { studioStops } = await import("./stops");
    return studioStops({ step, resume, hasReport, setStep: state.setStep, copy });
  });

  return null;
}
