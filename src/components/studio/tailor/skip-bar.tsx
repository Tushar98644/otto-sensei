"use client";

import { STEP_BAR_CLASSES } from "@/components/studio/step-bar";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { useStudioStore } from "@/lib/store/resume-store";
import { cn } from "@/lib/utils";

// The Tailor step's bar before there are results to make a copy from.
export function SkipBar() {
  const setStep = useStudioStore((s) => s.setStep);
  const t = useMessages("studioTailor").skip;
  return (
    <div data-tour-edge className={cn(STEP_BAR_CLASSES, "gap-3 sm:pl-4")}>
      <p className="min-w-0 flex-1 text-sm text-muted max-sm:pl-2.5">
        {t.note}
      </p>
      <Button variant="ghost" onClick={() => setStep("download")}>
        {t.action}
      </Button>
    </div>
  );
}
