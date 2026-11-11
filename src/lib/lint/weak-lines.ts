import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { lintResume } from "./bullets";
import type { LintIssue } from "./types";

export type IssuesOf = (bulletId: string) => readonly LintIssue[] | undefined;

// The first line with a warning, else the first with a tip. Pass `issuesOf` when the lint already
// ran.
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
