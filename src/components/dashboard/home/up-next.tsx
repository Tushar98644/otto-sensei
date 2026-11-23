"use client";

import { TodayBrief } from "@/components/dashboard/interview/today-brief";
import { useNow } from "@/components/studio/use-now";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { dayOffset } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { StudioActions } from "../use-studio-actions";
import type { NextStep } from "./next-steps";
import { LeadStep, SetupProgress, StepTile, stagger } from "./up-next/step-parts";
import { stepView } from "./up-next/step-view";
import { UploadZone } from "./upload-zone";
import type { UpNext as UpNextState } from "./use-up-next";

const COLUMNS = ["", "", "md:grid-cols-2", "md:grid-cols-3"] as const;

// On the interview's day the lead carries the prep pack's brief under it.
export function leadBrief(state: UpNextState, now: number): string | null {
  const first = state.steps[0];
  return first?.kind === "interview" &&
    first.prepped &&
    first.application.interviewAt !== null &&
    now > 0 &&
    dayOffset(first.application.interviewAt, now) === 0
    ? first.application.id
    : null;
}

// Holds the lead card's place until the steps are known, drawn like the week card's skeleton.
export function UpNextSkeleton() {
  return (
    <FolderCard tab="Up next" tone="lavender" bodyClassName="p-2" aria-hidden>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[max(15rem,calc((100%-1.5rem)/3-1rem))_minmax(0,1fr)]">
        <div className="h-40 rounded-xl bg-surface-muted sm:h-full sm:min-h-44" />
        <div className="flex flex-col gap-4 px-2 pt-2 pb-3 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
          <Skeleton className="h-8 w-4/5 rounded-lg" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
      </div>
    </FolderCard>
  );
}

const isUpload = (step: NextStep): step is Extract<NextStep, { kind: "upload" }> =>
  step.kind === "upload";

// The first step gets the stage; the rest wait on a tray below it, most important first.
export function UpNext({
  state,
  actions,
  hasSample,
}: {
  state: UpNextState | null;
  actions: StudioActions;
  hasSample: boolean;
}) {
  const now = useNow();
  if (!state || state.steps.length === 0) return null;
  const { setup } = state;
  const [first, ...rest] = state.steps;
  const others = rest
    .filter((step) => !isUpload(step))
    .map((step) => stepView(step, state, actions, now));
  const progress = setup ? setup.progress : undefined;
  const brief = leadBrief(state, now);

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
            <>
              <LeadStep view={stepView(first, state, actions, now)} setup={progress} />
              {brief ? (
                <TodayBrief
                  applicationId={brief}
                  className="mx-2 mb-2 border-t border-border px-2 pt-5 pb-2 sm:px-4 lg:px-6"
                />
              ) : null}
            </>
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
