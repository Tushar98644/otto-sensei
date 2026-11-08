"use client";

import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { FixIntro } from "@/components/studio/editor/fix-intro";
import { ResumeEditor } from "@/components/studio/editor/resume-editor";
import { StepActions } from "@/components/studio/editor/step-actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { STEP_LABELS, useStudioStore } from "@/lib/store/resume-store";

// Step 3: edit every section with live lint and "Fix with Otto". It subscribes to the active id
// only; each part below selects its own slice, so typing never re-renders the whole step.
export function FixStep() {
  const resumeId = useStudioStore((state) =>
    state.activeId !== null && Object.hasOwn(state.resumes, state.activeId) ? state.activeId : null,
  );

  if (!resumeId) return <NoResumeOpen />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h2 className="sr-only">{STEP_LABELS.fix}</h2>
      <FixIntro resumeId={resumeId} />
      {/* Keyed so switching resumes starts clean, with no half-typed skill carried over. */}
      <ResumeEditor key={resumeId} resumeId={resumeId} />
      <StepActions />
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
