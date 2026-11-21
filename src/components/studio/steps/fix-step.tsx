"use client";

import { useEffect } from "react";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { FixIntro } from "@/components/studio/editor/fix-intro";
import { OutlineNav, SectionsRow } from "@/components/studio/editor/fix-outline";
import { FixSummary } from "@/components/studio/editor/fix-summary";
import { ResumeEditor } from "@/components/studio/editor/resume-editor";
import { bulletInputId } from "@/components/studio/editor/focus";
import { StepActions } from "@/components/studio/editor/step-actions";
import { PreviewButton, PreviewPanel } from "@/components/studio/preview/live-preview";
import { focusWhenShown, takeArrivingLine } from "@/components/studio/tailor/jump";
import { useMediaQuery } from "@/components/studio/use-media-query";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { STEP_LABELS, useStudioStore } from "@/lib/store/resume-store";

// From xl the page preview sits beside the editor; below it, a Preview key opens it in a sheet.
const SPLIT_QUERY = "(min-width: 80rem)";

export function FixStep() {
  const resumeId = useStudioStore((state) =>
    state.activeId !== null && Object.hasOwn(state.resumes, state.activeId) ? state.activeId : null,
  );
  const split = useMediaQuery(SPLIT_QUERY);

  useEffect(() => {
    const bulletId = takeArrivingLine();
    if (bulletId) focusWhenShown(bulletInputId(bulletId));
  }, []);

  if (!resumeId) return <NoResumeOpen />;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 lg:grid lg:max-w-5xl lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:max-w-none xl:grid-cols-[minmax(0,1fr)_27rem]">
      <h2 className="sr-only">{STEP_LABELS.fix}</h2>
      <OutlineNav key={`outline-${resumeId}`} resumeId={resumeId} className="hidden lg:block xl:hidden" />
      <div className="flex min-w-0 flex-col gap-6">
        <SectionsRow key={`sections-${resumeId}`} resumeId={resumeId} className="lg:hidden xl:block" />
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
        <StepActions lead={split ? null : <PreviewButton resumeId={resumeId} />} />
      </div>
      {split ? <PreviewPanel key={`preview-${resumeId}`} resumeId={resumeId} /> : null}
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
