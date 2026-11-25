"use client";

import { ArrowRight } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { STEP_BAR_CLASSES } from "@/components/studio/step-bar";
import { useMessages } from "@/i18n/client";
import { useStudioStore } from "@/lib/store/resume-store";

export const StepActions = memo(function StepActions() {
  const setStep = useStudioStore((state) => state.setStep);
  const t = useMessages("studioEditor").stepBar;
  return (
    <div data-tour-edge className={STEP_BAR_CLASSES}>
      <Button variant="ghost" onClick={() => setStep("download")} data-tour="studio-download">
        {t.skip}
      </Button>
      <Button
        onClick={() => setStep("tailor")}
        className="flex-1 sm:flex-none"
        data-tour="studio-tailor"
      >
        <span>
          {t.next.before}
          <span className="max-sm:sr-only">{t.next.wide}</span>
        </span>
        <ArrowRight />
      </Button>
    </div>
  );
});
