import { lintResume } from "@/lib/lint/bullets";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { StudioStep } from "@/lib/store/resume-store";

// Which studio stops fit this resume, worked out from its data rather than the page, because most
// of them live on the Fix lines step and that step isn't on screen yet when the tour starts.

export type StudioStopId = "read-text" | "fix-with-otto" | "tailor" | "download";

// A tour is a few short tips, never a lesson.
export const MAX_TIPS = 3;

export type StudioTourPlan = {
  stops: StudioStopId[];
  // Lines worth pointing at, best first. The page picks the first one it can see, since a folded
  // section hides its lines.
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
  // Hidden lines never print and get no lint, so listBullets' default (shown only) is the editor's
  // view too.
  const lines = listBullets(resume).filter((line) => line.text.trim() !== "");
  // Without a line there is nothing for Otto to fix, and a tour of two buttons isn't worth it.
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

  // "Fix with Otto" points at a flagged line's button when there is one, so one tip covers both
  // the tag and the fix. Download is the first to go when the recruiter view takes a place.
  const stops: StudioStopId[] = [];
  if (step === "review" && hasReport) stops.push("read-text");
  stops.push("fix-with-otto", "tailor", "download");

  return {
    stops: stops.slice(0, MAX_TIPS),
    flaggedLineIds,
    lineIds: lines.map((line) => line.bulletId),
  };
}
