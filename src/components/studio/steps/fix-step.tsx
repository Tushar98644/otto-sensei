"use client";

import { useEffect } from "react";
import { Otto } from "@/components/mascot/otto";
import { FixIntro } from "@/components/studio/editor/fix-intro";
import { FixOutline } from "@/components/studio/editor/fix-outline";
import { FixSummary } from "@/components/studio/editor/fix-summary";
import { ResumeEditor } from "@/components/studio/editor/resume-editor";
import { bulletInputId } from "@/components/studio/editor/focus";
import { StepActions } from "@/components/studio/editor/step-actions";
import { focusWhenShown, takeArrivingLine } from "@/components/studio/tailor/jump";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useMessages } from "@/i18n/client";
import { useStudioStore } from "@/lib/store/resume-store";

export function FixStep() {
  const resumeId = useStudioStore((state) =>
    state.activeId !== null && Object.hasOwn(state.resumes, state.activeId) ? state.activeId : null,
  );

  useEffect(() => {
    const bulletId = takeArrivingLine();
    if (bulletId) focusWhenShown(bulletInputId(bulletId));
  }, []);

  const steps = useMessages("studio").steps;
  if (!resumeId) return <NoResumeOpen />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 lg:grid lg:max-w-5xl lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <h2 className="sr-only">{steps.fix}</h2>
      <FixOutline key={`outline-${resumeId}`} resumeId={resumeId} />
      <div className="flex min-w-0 flex-col gap-6">
        <ResumeEditor
          key={resumeId}
          resumeId={resumeId}
          intro={
            <div className="flex flex-col gap-3">
              <FixIntro resumeId={resumeId} />
              <FixSummary resumeId={resumeId} />
            </div>
          }
        />
        <StepActions />
      </div>
    </div>
  );
}

function NoResumeOpen() {
  const setStep = useStudioStore((state) => state.setStep);
  const studio = useMessages("studio");
  return (
    <EmptyState
      titleAs="h2"
      illustration={<Otto pose="read" size={120} />}
      title={studio.noResumeOpen}
      description={studio.otto.noResumes}
      action={<Button onClick={() => setStep("upload")}>{studio.uploadResume}</Button>}
    />
  );
}
