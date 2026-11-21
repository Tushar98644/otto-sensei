import { followUpState } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import { lintResume } from "@/lib/lint/bullets";
import { firstWeakLine } from "@/lib/lint/weak-lines";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import type { SetupItem, WeakLineState, WeakLineTarget } from "@/lib/setup/checklist";

export const UP_NEXT_ROWS = 4;
export const INTERVIEW_DAYS = 7;
const INTERVIEW_ROWS = 2;

export type SetupStepId = "work" | "looking_for" | "reminders" | "weak_line";

export type FixTarget = WeakLineTarget & { title: string; lines: number; remember: boolean };
export type TailorTarget = { resumeId: string; company: string; ran: boolean };
export type MatchCounts = { strong: number; newToday: number };

export type NextStep =
  | { kind: "upload" }
  | { kind: "interview"; application: Application; prepped: boolean }
  | { kind: "follow_up"; due: Application[] }
  | ({ kind: "fix" } & FixTarget)
  | ({ kind: "tailor" } & TailorTarget)
  | { kind: "setup"; id: SetupStepId }
  | ({ kind: "matches" } & MatchCounts);

export type NextStepFacts = {
  now: number;
  ownResumes: number;
  applications: readonly Application[];
  fix: FixTarget | null;
  tailor: TailorTarget | null;
  setup: { items: readonly SetupItem[]; weakLine: WeakLineState["status"] } | null;
  matches: MatchCounts | null;
};

function startOfDay(time: number): number {
  const day = new Date(time);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

function dayAfter(day: number, days: number): number {
  const next = new Date(day);
  next.setDate(next.getDate() + days);
  return next.getTime();
}

// Interview days are stored as local noon, so the window runs on local calendar days.
export function interviewsSoon(applications: readonly Application[], now: number): Application[] {
  const today = startOfDay(now);
  const end = dayAfter(today, INTERVIEW_DAYS + 1);
  return applications
    .filter(
      (application) =>
        application.status === "interview" &&
        application.interviewAt !== null &&
        application.interviewAt >= today &&
        application.interviewAt < end,
    )
    .sort((a, b) => (a.interviewAt ?? 0) - (b.interviewAt ?? 0));
}

export function followUpsDue(applications: readonly Application[], now: number): Application[] {
  return applications
    .filter((application) => followUpState(application, now) === "due")
    .sort((a, b) => (a.followUpAt ?? 0) - (b.followUpAt ?? 0));
}

// Dated things first, then work in progress, then setup, then news.
export function nextSteps(facts: NextStepFacts): NextStep[] {
  const steps: NextStep[] = [];
  if (facts.ownResumes === 0) steps.push({ kind: "upload" });
  for (const application of interviewsSoon(facts.applications, facts.now).slice(0, INTERVIEW_ROWS)) {
    steps.push({ kind: "interview", application, prepped: application.hasPrep });
  }
  const due = followUpsDue(facts.applications, facts.now);
  if (due.length > 0) steps.push({ kind: "follow_up", due });
  if (facts.fix) steps.push({ kind: "fix", ...facts.fix });
  if (facts.tailor) steps.push({ kind: "tailor", ...facts.tailor });
  for (const item of facts.setup?.items ?? []) {
    if (item.done || item.id === "resume") continue;
    // An open weak line is the fix row above; with no resume yet, the upload covers it.
    if (item.id === "weak_line" && facts.setup?.weakLine !== "no_lines") continue;
    steps.push({ kind: "setup", id: item.id });
  }
  if (facts.matches && facts.matches.strong > 0 && facts.matches.newToday > 0) {
    steps.push({ kind: "matches", ...facts.matches });
  }
  return steps.slice(0, UP_NEXT_ROWS);
}

// The setup's own weak line comes first, so fixing it ticks the setup row off.
export function fixTarget(own: readonly Resume[], setupLine: WeakLineTarget | null): FixTarget | null {
  const remembered = setupLine ? own.find((resume) => resume.id === setupLine.resumeId) : undefined;
  if (setupLine && remembered) {
    return {
      ...setupLine,
      title: resumeTitle(remembered),
      lines: Math.max(1, lintResume(remembered).totals.withIssues),
      remember: true,
    };
  }
  const ordered = [
    ...own.filter((resume) => resume.tailor === null),
    ...own.filter((resume) => resume.tailor !== null),
  ];
  for (const resume of ordered) {
    const { byBullet, totals } = lintResume(resume);
    if (totals.withIssues === 0) continue;
    const bulletId = firstWeakLine(resume, (id) =>
      Object.hasOwn(byBullet, id) ? byBullet[id] : undefined,
    );
    if (!bulletId) continue;
    return {
      resumeId: resume.id,
      bulletId,
      title: resumeTitle(resume),
      lines: totals.withIssues,
      remember: false,
    };
  }
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

export function interviewDay(at: number, now: number): string {
  const today = startOfDay(now);
  const day = startOfDay(at);
  if (day === today) return "Today";
  if (day === dayAfter(today, 1)) return "Tomorrow";
  const days = Math.round((day - today) / DAY_MS);
  return days > 1 ? `${weekday.format(at)} · in ${days} days` : weekday.format(at);
}
