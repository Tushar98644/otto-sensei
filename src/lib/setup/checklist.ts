import { WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import type { LookingForChoice } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import type { WeakLineState } from "./weak-line";

export type { WeakLineState, WeakLineTarget } from "./weak-line";

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
