"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { refreshMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { StudioTour } from "@/components/onboarding/studio-tour";
import {
  STEP_LABELS,
  useActiveReport,
  useActiveResume,
  useStudioHydrated,
  useStudioStore,
  type StudioStep,
} from "@/lib/store/resume-store";
import { useCloudSync, useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { adjacentStep, resolveStep, type StepContext } from "./step-state";
import { StepSkeleton, StudioSkeleton } from "./studio-skeleton";
import { StudioStepper } from "./studio-stepper";
import { StudioTopBar } from "./studio-top-bar";
import { useAccountEmailPrefill } from "./use-account-email";
import { ReviewStep } from "./steps/review-step";
import { UploadStep } from "./steps/upload-step";

// The later steps carry the editor, the tailoring UI and the PDF renderer, so each loads on demand
// and a first visit to the upload screen stays light.
const FixStep = dynamic(() => import("./steps/fix-step").then((m) => m.FixStep), {
  loading: () => <StepSkeleton />,
});
const TailorStep = dynamic(() => import("./steps/tailor-step").then((m) => m.TailorStep), {
  loading: () => <StepSkeleton />,
});
const DownloadStep = dynamic(() => import("./steps/download-step").then((m) => m.DownloadStep), {
  loading: () => <StepSkeleton />,
});

// Warms the next step's code while the user reads the current one.
const PREFETCH: Partial<Record<StudioStep, () => Promise<unknown>>> = {
  fix: () => import("./steps/fix-step"),
  tailor: () => import("./steps/tailor-step"),
  download: () => import("./steps/download-step"),
};

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
    // A stone canvas: each step's content sits on white sheets, so depth comes from the shade.
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <StudioTopBar hydrated={hydrated} onSignIn={signIn} />
      <main
        id="main"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pt-4 pb-16 sm:px-6 sm:pt-6"
      >
        {hydrated ? <StudioSteps /> : <StudioSkeleton />}
      </main>
      {gate.dialogs}
    </div>
  );
}

function StudioSteps() {
  const resume = useActiveResume();
  const report = useActiveReport();
  const savedStep = useStudioStore((s) => s.step);
  const setStep = useStudioStore((s) => s.setStep);
  const context: StepContext = { hasResume: resume !== null, hasReport: report !== null };
  const step = resolveStep(savedStep, context);
  const next = adjacentStep(step, 1, context);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownStep = useRef<StudioStep | null>(null);

  // A new step replaces the whole screen: start it at the top and move focus to its heading, so
  // keyboard and screen reader users land on the new content instead of a removed button. Focus
  // inside an open menu stays put (deleting the open resume from the switcher changes the step).
  useEffect(() => {
    const previous = shownStep.current;
    shownStep.current = step;
    if (previous === null || previous === step) return;
    window.scrollTo({ top: 0 });
    if (document.activeElement?.closest("[popover]")) return;
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const load = next ? PREFETCH[next] : undefined;
    if (!load) return;
    const timer = window.setTimeout(() => void load().catch(() => {}), 1_500);
    return () => window.clearTimeout(timer);
  }, [next]);

  return (
    <>
      <StudioStepper step={step} context={context} onSelect={setStep} />
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        {STEP_LABELS[step]}
      </h1>
      <div className="mt-6 flex-1 sm:mt-8">
        <ActiveStep step={step} />
      </div>
      <StudioTour step={step} />
    </>
  );
}

function ActiveStep({ step }: { step: StudioStep }) {
  switch (step) {
    case "upload":
      return <UploadStep />;
    case "review":
      return <ReviewStep />;
    case "fix":
      return <FixStep />;
    case "tailor":
      return <TailorStep />;
    case "download":
      return <DownloadStep />;
  }
}
