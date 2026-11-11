import { lintResume } from "@/lib/lint/bullets";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { StudioStep } from "@/lib/store/resume-store";

export type StudioStopId = "read-text" | "fix-with-otto" | "tailor" | "download";

export const MAX_TIPS = 3;

export type StudioTourPlan = {
  stops: StudioStopId[];
  flaggedLineIds: string[];
  lineIds: string[];
};

export function planStudioTour({
  step,
  resume,
  hasReport,
}: {
  step: StudioStep;
  resume: Resume;
  hasReport: boolean;
}): StudioTourPlan | null {
  const lines = listBullets(resume).filter((line) => line.text.trim() !== "");
  if (lines.length === 0) return null;

  const { byBullet } = lintResume(resume);
  const warnings: string[] = [];
  const tips: string[] = [];
  for (const line of lines) {
    const issues = byBullet[line.bulletId] ?? [];
    if (issues.some((issue) => issue.severity === "high")) warnings.push(line.bulletId);
    else if (issues.length > 0) tips.push(line.bulletId);
  }
  const flaggedLineIds = [...warnings, ...tips];

  const stops: StudioStopId[] = [];
  if (step === "review" && hasReport) stops.push("read-text");
  stops.push("fix-with-otto", "tailor", "download");

  return {
    stops: stops.slice(0, MAX_TIPS),
    flaggedLineIds,
    lineIds: lines.map((line) => line.bulletId),
  };
}
