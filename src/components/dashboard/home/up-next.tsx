"use client";

import { useNow } from "@/components/studio/use-now";
import { FolderCard } from "@/components/ui/folder-card";
import { cn } from "@/lib/utils";
import type { StudioActions } from "../use-studio-actions";
import type { NextStep } from "./next-steps";
import { LeadStep, SetupProgress, StepTile, stagger } from "./up-next/step-parts";
import { stepView } from "./up-next/step-view";
import { UploadZone } from "./upload-zone";
import { useUpNext } from "./use-up-next";

const COLUMNS = ["", "", "md:grid-cols-2", "md:grid-cols-3"] as const;

const isUpload = (step: NextStep): step is Extract<NextStep, { kind: "upload" }> =>
  step.kind === "upload";

// The first step gets the stage; the rest wait on a tray below it, most important first.
export function UpNext({ actions, hasSample }: { actions: StudioActions; hasSample: boolean }) {
  const state = useUpNext();
  const now = useNow();
  if (!state || state.steps.length === 0) return null;
  const { setup } = state;
  const [first, ...rest] = state.steps;
  const others = rest
    .filter((step) => !isUpload(step))
    .map((step) => stepView(step, state, actions, now));
  const progress = setup ? setup.progress : undefined;

  return (
    <section
      aria-labelledby="up-next-heading"
      data-tour="dashboard-setup"
      data-setup-steps={setup ? setup.progress.total : undefined}
    >
      <h2 id="up-next-heading" className="sr-only">
        Up next
      </h2>
      <div className="flex flex-col gap-4">
        <FolderCard
          tab="Up next"
          tone="lavender"
          tabEnd={
            setup ? (
              <SetupProgress
                done={setup.progress.done}
                total={setup.progress.total}
                onHide={setup.hide}
              />
            ) : null
          }
          bodyClassName="p-2"
        >
          {first && isUpload(first) ? (
            <div className="p-2 motion-safe:animate-fade-in sm:p-3">
              <UploadZone actions={actions} hasSample={hasSample} />
            </div>
          ) : first ? (
            <LeadStep view={stepView(first, state, actions, now)} setup={progress} />
          ) : null}
        </FolderCard>
        {others.length > 0 ? (
          <ul aria-label="More to do" className={cn("grid gap-4", COLUMNS[others.length])}>
            {others.map((view, index) => (
              <li key={view.key} className="motion-safe:animate-fade-in" style={stagger(index + 1)}>
                <StepTile view={view} card={others.length > 1} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
