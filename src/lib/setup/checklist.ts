import { WORK_REGIONS, type WorkProfile } from "@/lib/eligibility/profile";
import type { LookingForChoice } from "@/lib/job-feed/types";
import type { Resume } from "@/lib/resume/schema";
import { onlyGuessedRights } from "./hints";
import type { SetupGuess } from "./types";
import type { WeakLineState } from "./weak-line";

export type { WeakLineState, WeakLineTarget } from "./weak-line";

export type SetupItemId = "resume" | "work" | "looking_for" | "weak_line" | "reminders";

// The home region Otto set to Yes on its own doesn't count until the person confirms it.
export function workRightsSet(profile: WorkProfile, guess: SetupGuess | null = null): boolean {
  return (
    profile.country !== "" &&
    WORK_REGIONS.some((region) => profile.rights[region] !== null) &&
    !onlyGuessedRights(guess, profile)
  );
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

// An upload, never a resume typed from scratch, whose half-typed title would be a poor guess.
export function newestUpload(own: readonly Resume[]): Resume | null {
  return own.find((resume) => resume.source === "import" && resume.tailor === null) ?? null;
}

export type DefaultsDue = { defaultsAt: number | null; lookingForAt: number | null };

export function defaultsDue(due: DefaultsDue, own: readonly Resume[]): boolean {
  return due.defaultsAt === null || (due.lookingForAt === null && newestUpload(own) !== null);
}

export type SetupFacts = {
  pro: boolean;
  ownResumes: number;
  work: { profile: WorkProfile; lookingFor: LookingForChoice } | null;
  guess?: SetupGuess | null;
  weakLine: WeakLineState;
  reminders: { available: boolean; chosen: boolean } | null;
};

export type SetupItem = { id: SetupItemId; done: boolean };

export function setupItems(facts: SetupFacts): SetupItem[] {
  const items: SetupItem[] = [{ id: "resume", done: facts.ownResumes > 0 }];
  if (facts.work && facts.pro) {
    items.push({ id: "work", done: workRightsSet(facts.work.profile, facts.guess) });
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
  guess = null,
}: {
  pro: boolean;
  locked: boolean;
  profile: WorkProfile | null;
  guess?: SetupGuess | null;
}): boolean {
  return pro && !locked && profile !== null && !workRightsSet(profile, guess);
}

export function reminderPromptShows({
  pro,
  applications,
  reminders,
}: {
  pro: boolean;
  applications: number;
  reminders: {
    available: boolean;
    chosen: boolean;
    emailReminders: boolean;
    promptSnoozed?: boolean;
  } | null;
}): boolean {
  return (
    pro &&
    applications > 0 &&
    reminders !== null &&
    reminders.available &&
    !reminders.chosen &&
    !reminders.emailReminders &&
    reminders.promptSnoozed !== true
  );
}
