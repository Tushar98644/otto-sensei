import type { Resume } from "@/lib/resume/schema";
import { STUDIO_STEPS, type StudioStep } from "@/lib/store/resume-store";

export type StepStatus = "available" | "disabled" | "hidden";

export type StepContext = {
  hasResume: boolean;
  hasReport: boolean;
  hasTailored: boolean;
};

export function stepStatus(step: StudioStep, context: StepContext): StepStatus {
  if (step === "upload") return "available";
  if (!context.hasResume) return "disabled";
  // Only an uploaded file has a recruiter view; samples, scratch and imports never will.
  if (step === "review" && !context.hasReport) return "hidden";
  return "available";
}

export function visibleSteps(context: StepContext): StudioStep[] {
  return STUDIO_STEPS.filter((step) => stepStatus(step, context) !== "hidden");
}

export function stepDone(step: StudioStep, current: StudioStep, context: StepContext): boolean {
  if (step === current || stepStatus(step, context) !== "available") return false;
  if (step === "tailor") return context.hasTailored;
  return STUDIO_STEPS.indexOf(step) < STUDIO_STEPS.indexOf(current);
}

export function hasTailoredCopy(
  resumes: Readonly<Record<string, Resume>>,
  activeId: string | null,
): boolean {
  if (!activeId) return false;
  if (resumes[activeId]?.tailor) return true;
  return Object.values(resumes).some((resume) => resume.tailor?.baseResumeId === activeId);
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
