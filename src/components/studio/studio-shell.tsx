"use client";

import {
  memo,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
} from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { UpgradePromptHost } from "@/components/account/upgrade-prompt";
import { refreshMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { StudioTour } from "@/components/onboarding/studio-tour";
import { takeStepJump } from "@/components/studio/tailor/jump";
import {
  STEP_LABELS,
  useActiveReport,
  useStudioHydrated,
  useStudioStore,
  type StudioStep,
} from "@/lib/store/resume-store";
import { useCloudSync, useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { createStepLoader, type StepLoader } from "./step-loader";
import {
  adjacentStep,
  hasTailoredCopy,
  resolveStep,
  stepsToPreload,
  type StepContext,
} from "./step-state";
import { StepSkeleton, StudioSkeleton } from "./studio-skeleton";
import { StudioStepper } from "./studio-stepper";
import { StudioTopBar } from "./studio-top-bar";
import { useAccountEmailPrefill } from "./use-account-email";
import { ReviewStep } from "./steps/review-step";
import { UploadStep } from "./steps/upload-step";

const LAZY_STEPS = {
  fix: createStepLoader(() => import("./steps/fix-step").then((m) => m.FixStep)),
  tailor: createStepLoader(() => import("./steps/tailor-step").then((m) => m.TailorStep)),
  download: createStepLoader(() => import("./steps/download-step").then((m) => m.DownloadStep)),
} satisfies Partial<Record<StudioStep, StepLoader<ComponentType>>>;

type LazyStep = keyof typeof LAZY_STEPS;
const isLazyStep = (step: StudioStep): step is LazyStep => Object.hasOwn(LAZY_STEPS, step);

const PRELOAD_DELAY_MS = 1_500;

const SIGN_IN_REASON = "Back up your resumes and let Otto help with your lines.";

export function StudioShell() {
  const hydrated = useStudioHydrated();
  const gate = useAccountGate();
  const { requireUser } = gate;
  useCloudSync();
  useOttoLoadingScreen(useFirstLoadPending(), "Loading your resumes");
  useAccountEmailPrefill();

  async function signIn() {
    if (await requireUser(SIGN_IN_REASON)) void refreshMe();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <StudioTopBar hydrated={hydrated} onSignIn={signIn} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-16 sm:px-6 sm:pt-6"
      >
        {hydrated ? <StudioSteps /> : <StudioSkeleton />}
      </main>
      {gate.dialogs}
      <UpgradePromptHost />
    </div>
  );
}

function StudioSteps() {
  // A boolean, not the resume, so typing in the editor doesn't re-render the stepper.
  const hasResume = useStudioStore((s) =>
    s.activeId ? Object.hasOwn(s.resumes, s.activeId) : false,
  );
  const hasTailored = useStudioStore((s) => hasTailoredCopy(s.resumes, s.activeId));
  const report = useActiveReport();
  const savedStep = useStudioStore((s) => s.step);
  const setStep = useStudioStore((s) => s.setStep);
  const context: StepContext = { hasResume, hasReport: report !== null, hasTailored };
  const step = resolveStep(savedStep, context);
  const next = adjacentStep(step, 1, context);
  const visibleStep = useDeferredValue(step);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef<StudioStep | null>(null);

  useEffect(() => {
    const previous = shownStep.current;
    shownStep.current = visibleStep;
    if (previous === null || previous === visibleStep) return;
    if (takeStepJump()) return;
    window.scrollTo({ top: 0 });
    if (document.activeElement?.closest("[popover]")) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [visibleStep]);

  useEffect(() => {
    const steps = stepsToPreload(step, next).filter(isLazyStep);
    if (steps.length === 0) return;
    const timer = window.setTimeout(() => {
      for (const key of steps) void LAZY_STEPS[key].load().catch(() => {});
    }, PRELOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [step, next]);

  return (
    <>
      <StudioStepper step={step} context={context} onSelect={setStep} />
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        {STEP_LABELS[visibleStep]}
      </h1>
      <div className="mt-6 flex-1 sm:mt-8">
        <ActiveStep step={visibleStep} />
      </div>
      <StudioTour step={visibleStep} />
    </>
  );
}

const ActiveStep = memo(function ActiveStep({ step }: { step: StudioStep }) {
  switch (step) {
    case "upload":
      return <UploadStep />;
    case "review":
      return <ReviewStep />;
    case "fix":
    case "tailor":
    case "download":
      return <LoadedStep key={step} loader={LAZY_STEPS[step]} />;
  }
});

function LoadedStep({ loader }: { loader: StepLoader<ComponentType> }) {
  const state = useSyncExternalStore(loader.subscribe, loader.getState, loader.getState);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);

  useEffect(() => {
    if (loader.getState().status === "ready") return;
    let live = true;
    loader.load().catch((error: unknown) => {
      if (live) setFailure({ error });
    });
    return () => {
      live = false;
    };
  }, [loader]);

  if (failure) throw failure.error;
  if (state.status !== "ready") return <StepSkeleton />;
  const Step = state.value;
  return <Step />;
}
