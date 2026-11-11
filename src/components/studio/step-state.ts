import { STUDIO_STEPS, type StudioStep } from "@/lib/store/resume-store";

// Which studio steps can be opened right now. Pure, so the stepper, the phone header and the shell
// always agree.

export type StepStatus = "available" | "disabled" | "skipped";

export type StepContext = {
  hasResume: boolean;
  // The active resume came from an upload, so there is a recruiter report to show.
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

// The saved step can go stale (its resume was deleted, or the newly active resume has no upload
// report), so fall forward to the next step that works, then back.
export function resolveStep(step: StudioStep, context: StepContext): StudioStep {
  if (stepStatus(step, context) === "available") return step;
  return adjacentStep(step, 1, context) ?? adjacentStep(step, -1, context) ?? "upload";
}

// Whose code to warm while `step` is on screen: the next step first. The upload screen stops
// there so a first visit stays light; from the recruiter view on, every other step follows too,
// for the stepper's jumps and "Skip to download".
export function stepsToPreload(step: StudioStep, next: StudioStep | null): StudioStep[] {
  const first = next && next !== step ? [next] : [];
  if (step === "upload") return first;
  return [...first, ...STUDIO_STEPS.filter((other) => other !== step && other !== next)];
}
