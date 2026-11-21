import { designOf, withDesign } from "@/lib/pdf/design";
import { fitCandidates, hideLines, type FitLine } from "@/lib/pdf/fit";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export type NearFit = { kind: "tighten" } | { kind: "hide"; lines: FitLine[] };

export type NearFitApplied = { kind: "tighten" } | { kind: "hide"; ids: string[] };

export const NEAR_FIT_LINES = 2;

export function tightened(resume: Resume): Resume {
  return withDesign(resume, { density: "compact" });
}

function withoutLines(resume: Resume, lines: readonly FitLine[]): Resume {
  return hideLines(resume, new Set(lines.map((line) => line.bulletId)));
}

// Only a page that spills over by a line or two gets the one-click offer; longer ones need choosing.
export async function findNearFit(
  resume: Resume,
  pagesOf: (resume: Resume) => Promise<number>,
): Promise<NearFit | null> {
  if (designOf(resume).density !== "compact") {
    return (await pagesOf(tightened(resume))) <= 1 ? { kind: "tighten" } : null;
  }
  const lines = fitCandidates(resume).slice(0, NEAR_FIT_LINES);
  for (let count = 1; count <= lines.length; count += 1) {
    const picked = lines.slice(0, count);
    if ((await pagesOf(withoutLines(resume, picked))) <= 1) return { kind: "hide", lines: picked };
  }
  return null;
}

// The top bar's undo, or a change in Design, can take the fix back without this card knowing.
export function stillApplied(resume: Resume, applied: NearFitApplied): boolean {
  if (applied.kind === "tighten") return designOf(resume).density === "compact";
  const shown = new Set(listBullets(resume).map((line) => line.bulletId));
  return applied.ids.some((id) => !shown.has(id));
}
