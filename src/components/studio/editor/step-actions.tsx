"use client";

import { ArrowRight } from "lucide-react";
import { memo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { STEP_BAR_CLASSES } from "@/components/studio/step-bar";
import { useStudioStore } from "@/lib/store/resume-store";

export const StepActions = memo(function StepActions({ lead }: { lead?: ReactNode }) {
  const setStep = useStudioStore((state) => state.setStep);
  return (
    <div data-tour-edge className={STEP_BAR_CLASSES}>
      {lead}
      <Button variant="ghost" onClick={() => setStep("download")} data-tour="studio-download">
        Skip to download
      </Button>
      <Button
        onClick={() => setStep("tailor")}
        className="flex-1 sm:flex-none"
        data-tour="studio-tailor"
      >
        <span>
          Next: Tailor<span className="max-sm:sr-only"> to a job</span>
        </span>
        <ArrowRight />
      </Button>
    </div>
  );
});
