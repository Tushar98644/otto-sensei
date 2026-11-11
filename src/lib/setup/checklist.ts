import { WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import type { LookingForChoice } from "@/lib/job-feed/types";
import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

export type SetupItemId = "resume" | "work" | "looking_for" | "weak_line" | "reminders";

export function workRightsSet(profile: WorkProfile): boolean {
  return profile.country !== "" && WORK_REGIONS.some((region) => profile.rights[region] !== null);
}

export function lookingForSet(choice: LookingForChoice): boolean {
  return choice.role !== null || choice.level !== null || choice.place !== null;
}

export function ownResumes(resumes: readonly Resume[]): Resume[] {
  const byId = new Map(resumes.map((resume) => [resume.id, resume]));
  const fromSample = (resume: Resume) =>
    resume.tailor !== null && byId.get(resume.tailor.baseResumeId)?.source === "sample";
  return resumes
    .filter((resume) => resume.source !== "sample" && !fromSample(resume))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

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

export type SetupFacts = {
  pro: boolean;
  ownResumes: number;
  work: { profile: WorkProfile; lookingFor: LookingForChoice } | null;
  weakLine: WeakLineState;
  reminders: { available: boolean; chosen: boolean } | null;
};

export type SetupItem = { id: SetupItemId; done: boolean };

export function setupItems(facts: SetupFacts): SetupItem[] {
  const items: SetupItem[] = [{ id: "resume", done: facts.ownResumes > 0 }];
  if (facts.work && facts.pro) {
    items.push({ id: "work", done: workRightsSet(facts.work.profile) });
  }
  if (facts.work) items.push({ id: "looking_for", done: lookingForSet(facts.work.lookingFor) });
  items.push({ id: "weak_line", done: facts.weakLine.status === "done" });
  if (facts.pro && facts.reminders?.available) {
    items.push({ id: "reminders", done: facts.reminders.chosen });
  }
  return items;
}

export function setupProgress(items: readonly SetupItem[]): { done: number; total: number } {
  return { done: items.filter((item) => item.done).length, total: items.length };
}

export function checklistShows(items: readonly SetupItem[], hiddenAt: number | null): boolean {
  return hiddenAt === null && items.some((item) => !item.done);
}

export function jobsWorkPromptShows({
  pro,
  locked,
  profile,
}: {
  pro: boolean;
  locked: boolean;
  profile: WorkProfile | null;
}): boolean {
  return pro && !locked && profile !== null && !workRightsSet(profile);
}

export function reminderPromptShows({
  pro,
  applications,
  reminders,
}: {
  pro: boolean;
  applications: number;
  reminders: { available: boolean; chosen: boolean; emailReminders: boolean } | null;
}): boolean {
  return (
    pro &&
    applications > 0 &&
    reminders !== null &&
    reminders.available &&
    !reminders.chosen &&
    !reminders.emailReminders
  );
}
