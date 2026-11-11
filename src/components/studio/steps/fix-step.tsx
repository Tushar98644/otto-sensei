"use client";

import { useEffect } from "react";
import { OTTO } from "@/components/mascot/lines";
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
import { STEP_LABELS, useStudioStore } from "@/lib/store/resume-store";

// Subscribes to the active id only, so typing never re-renders the whole step.
export function FixStep() {
  const resumeId = useStudioStore((state) =>
    state.activeId !== null && Object.hasOwn(state.resumes, state.activeId) ? state.activeId : null,
  );

  // From Home's "Lines to improve": focus the first weak line, with its tip and Fix in view.
  useEffect(() => {
    const bulletId = takeArrivingLine();
    if (bulletId) focusWhenShown(bulletInputId(bulletId));
  }, []);

  if (!resumeId) return <NoResumeOpen />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 lg:grid lg:max-w-none lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <h2 className="sr-only">{STEP_LABELS.fix}</h2>
      <FixOutline key={`outline-${resumeId}`} resumeId={resumeId} />
      <div className="flex min-w-0 flex-col gap-6">
        {/* Keyed so switching resumes starts clean, with no half-typed skill carried over. */}
        <ResumeEditor
          key={resumeId}
          resumeId={resumeId}
          intro={
            <div className="flex flex-col gap-6">
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
  return (
    <EmptyState
      titleAs="h2"
      illustration={<Otto pose="read" size={120} />}
      title="No resume open"
      description={OTTO.empty.noResumes}
      action={<Button onClick={() => setStep("upload")}>Upload a resume</Button>}
    />
  );
}
