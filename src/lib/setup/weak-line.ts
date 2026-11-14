import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export type WeakLineTarget = { resumeId: string; bulletId: string };

export type WeakLineState =
  | { status: "no_resume" }
  | { status: "no_lines" }
  | { status: "open"; target: WeakLineTarget }
  | { status: "done" };

const warns = (issues: readonly { severity: string }[] | undefined) =>
  (issues ?? []).some((issue) => issue.severity === "high");

export function weakLineState(
  own: readonly Resume[],
  remembered: WeakLineTarget | null,
): WeakLineState {
  if (own.length === 0) return { status: "no_resume" };
  const target = remembered ? own.find((resume) => resume.id === remembered.resumeId) : undefined;
  if (remembered && target) {
    const line = listBullets(target).find((item) => item.bulletId === remembered.bulletId);
    if (!line?.text.trim()) return { status: "done" };
    return warns(lintResume(target).byBullet[remembered.bulletId])
      ? { status: "open", target: remembered }
      : { status: "done" };
  }
  const ordered = [
    ...own.filter((resume) => resume.tailor === null),
    ...own.filter((resume) => resume.tailor !== null),
  ];
  let lines = 0;
  for (const resume of ordered) {
    const { byBullet, totals } = lintResume(resume);
    lines += totals.bullets;
    const issuesOf = (id: string) => (Object.hasOwn(byBullet, id) ? byBullet[id] : undefined);
    const bulletId = firstWeakLine(resume, issuesOf);
    if (bulletId && warns(issuesOf(bulletId))) {
      return { status: "open", target: { resumeId: resume.id, bulletId } };
    }
  }
  return lines === 0 ? { status: "no_lines" } : { status: "done" };
}
