import { STUDIO_STEPS, type StudioStep } from "@/lib/store/resume-store";

export type StepStatus = "available" | "disabled" | "skipped";

export type StepContext = {
  hasResume: boolean;
  hasReport: boolean;
};

export function stepStatus(step: StudioStep, context: StepContext): StepStatus {
  if (step === "upload") return "available";
  if (!context.hasResume) return "disabled";
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

export function resolveStep(step: StudioStep, context: StepContext): StudioStep {
  if (stepStatus(step, context) === "available") return step;
  return adjacentStep(step, 1, context) ?? adjacentStep(step, -1, context) ?? "upload";
}

export function stepsToPreload(step: StudioStep, next: StudioStep | null): StudioStep[] {
  const first = next && next !== step ? [next] : [];
  if (step === "upload") return first;
  return [...first, ...STUDIO_STEPS.filter((other) => other !== step && other !== next)];
}
