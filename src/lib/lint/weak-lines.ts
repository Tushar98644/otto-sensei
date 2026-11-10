import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { lintResume } from "./bullets";
import type { LintIssue } from "./types";

// Client-safe. Which line "Fix the first weak line" opens.

export type IssuesOf = (bulletId: string) => readonly LintIssue[] | undefined;

/**
 * The line to start with: the first one with a warning, in the order the editor lists them, else
 * the first with a tip. Null when every printed line reads well. Pass `issuesOf` when the lint has
 * already run (the editor's cache); otherwise it runs here.
 */
export function firstWeakLine(resume: Resume, issuesOf?: IssuesOf): string | null {
  const lookup: IssuesOf =
    issuesOf ??
    (() => {
      const { byBullet } = lintResume(resume);
      return (bulletId) => (Object.hasOwn(byBullet, bulletId) ? byBullet[bulletId] : undefined);
    })();
  let firstTip: string | null = null;
  // Hidden lines never print and get no lint, so listBullets' default (shown only) fits.
  for (const line of listBullets(resume)) {
    if (!line.text.trim()) continue;
    const issues = lookup(line.bulletId) ?? [];
    if (issues.some((issue) => issue.severity === "high")) return line.bulletId;
    if (firstTip === null && issues.length > 0) firstTip = line.bulletId;
  }
  return firstTip;
}
