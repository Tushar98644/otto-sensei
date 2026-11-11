import { WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import type { LookingForChoice } from "@/lib/job-feed/types";
import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";

// Every "done" is read from the real settings and resumes, so an item ticks itself however the
// person got there.

export type SetupItemId = "resume" | "work" | "looking_for" | "weak_line" | "reminders";

export function workRightsSet(profile: WorkProfile): boolean {
  return profile.country !== "" && WORK_REGIONS.some((region) => profile.rights[region] !== null);
}

/** Parts left null only follow the resume. */
export function lookingForSet(choice: LookingForChoice): boolean {
  return choice.role !== null || choice.level !== null || choice.place !== null;
}

/** Never the sample or a copy tailored from it. */
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
  // Resumes, but no lines written yet.
  | { status: "no_lines" }
  | { status: "open"; target: WeakLineTarget }
  | { status: "done" };

const warns = (issues: readonly { severity: string }[] | undefined) =>
  (issues ?? []).some((issue) => issue.severity === "high");

// `remembered` is the line it opened last; once that has no warning (or is gone), it's done.
// Without one, the first line with a warning. Tips alone don't count.
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
  // Base resumes before tailored copies: the copies repeat their lines.
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
  // The work-rights check and reminders are Pro tools.
  pro: boolean;
  ownResumes: number;
  // null while loading or failed: its items are left out rather than guessed.
  work: { profile: WorkProfile; lookingFor: LookingForChoice } | null;
  weakLine: WeakLineState;
  reminders: { available: boolean; chosen: boolean } | null;
};

export type SetupItem = { id: SetupItemId; done: boolean };

// At most 5. Pro tools are left out on Free, where they'd do nothing; email reminders also need a
// server that can send email.
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

/** Free has no work-rights rules. */
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

// Until the person answers either way. Never on Free, which gets no follow-up reminders.
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
