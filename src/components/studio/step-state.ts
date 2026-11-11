import { STUDIO_STEPS, type StudioStep } from "@/lib/store/resume-store";

export type StepStatus = "available" | "disabled" | "skipped";

export type StepContext = {
  hasResume: boolean;
  hasReport: boolean;
};

export function stepStatus(step: StudioStep, context: StepContext): StepStatus {
  if (step === "upload") return "available";
  if (!context.hasResume) return "disabled";
  // The recruiter view describes an uploaded file; scratch, sample and tailored resumes have none.
  if (step === "review" && !context.hasReport) return "skipped";
  return "available";
}

export function adjacentStep(
  step: StudioStep,
  direction: 1 | -1,
  context: StepContext,
): StudioStep | null {
  for (
    let index = STUDIO_STEPS.indexOf(step) + direction;
    index >= 0 && index < STUDIO_STEPS.length;
    index += direction
  ) {
    const candidate = STUDIO_STEPS[index];
    if (candidate && stepStatus(candidate, context) === "available") return candidate;
  }
  return null;
}

// A stale saved step (resume deleted, no report) falls forward to one that works, then back.
export function resolveStep(step: StudioStep, context: StepContext): StudioStep {
  if (stepStatus(step, context) === "available") return step;
  return adjacentStep(step, 1, context) ?? adjacentStep(step, -1, context) ?? "upload";
}

// The next step first. The upload screen stops there so a first visit stays light; later steps
// warm every other step too, for the stepper's jumps and "Skip to download".
export function stepsToPreload(step: StudioStep, next: StudioStep | null): StudioStep[] {
  const first = next && next !== step ? [next] : [];
  if (step === "upload") return first;
  return [...first, ...STUDIO_STEPS.filter((other) => other !== step && other !== next)];
}
