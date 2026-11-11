"use client";

import { ArrowRight } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/lib/store/resume-store";

// A floating pill rather than a full-width bar, so it needs no assumptions about side padding.
export const StepActions = memo(function StepActions() {
  const setStep = useStudioStore((state) => state.setStep);
  return (
    <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-1 self-end rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5 max-sm:w-full">
      <Button variant="ghost" onClick={() => setStep("download")} data-tour="studio-download">
        {/* One flex item, so the words keep a normal space instead of the button's icon gap. On
            phones only "Skip" fits beside the main button; screen readers still hear it all. */}
        <span>
          Skip<span className="max-sm:sr-only"> to download</span>
        </span>
      </Button>
      <Button
        onClick={() => setStep("tailor")}
        className="flex-1 sm:flex-none"
        data-tour="studio-tailor"
      >
        Next: Tailor to a job
        <ArrowRight />
      </Button>
    </div>
  );
});
