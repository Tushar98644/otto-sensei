import { followUpState } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import {
  APPLICATION_STAGES,
  isStage,
  stageIndex,
  type ApplicationStatus,
  type StatusEvent,
} from "@/lib/applications/status";
import { daysUntil, formatDay, interviewDay } from "../view";

export type TimelineStep = {
  status: ApplicationStatus;
  state: "done" | "current" | "next";
  at: number | null;
};

type Timed = Pick<Application, "status" | "stageReached" | "appliedAt" | "statusChangedAt">;

function lastAt(history: readonly StatusEvent[], status: ApplicationStatus): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const event = history[i];
    if (event?.status === status) return event.at;
  }
  return null;
}

export function timelineSteps(application: Timed, history: readonly StatusEvent[]): TimelineStep[] {
  const ended = !isStage(application.status);
  const reached = stageIndex(isStage(application.status) ? application.status : application.stageReached);
  const steps: TimelineStep[] = [];
  APPLICATION_STAGES.forEach((stage, index) => {
    if (index > reached) {
      if (!ended) steps.push({ status: stage, state: "next", at: null });
      return;
    }
    const current = index === reached && !ended;
    let at = stage === "applied" ? application.appliedAt : lastAt(history, stage);
    if (at === null && current) at = application.statusChangedAt;
    steps.push({ status: stage, state: current ? "current" : "done", at });
  });
  if (ended) {
    steps.push({
      status: application.status,
      state: "current",
      at: lastAt(history, application.status) ?? application.statusChangedAt,
    });
  }
  return steps;
}

function interviewLine(at: number, hasPrep: boolean, now: number): string {
  const days = daysUntil(at, now);
  if (days < 0) return "How did the interview go? Move it on here when you hear back.";
  const when =
    days === 0 ? "today" : days === 1 ? "tomorrow" : `${interviewDay(at, now)}, in ${days} days`;
  return hasPrep
    ? `Your interview is ${when}. Your prep is ready to practice out loud.`
    : `Your interview is ${when}. I can make prep from this job and your resume.`;
}

export function nextStepLine(
  application: Pick<Application, "status" | "followUpAt" | "interviewAt">,
  hasPrep: boolean,
  now: number,
): string {
  if (application.status === "interview" && application.interviewAt !== null && now > 0) {
    return interviewLine(application.interviewAt, hasPrep, now);
  }
  switch (application.status) {
    case "applied": {
      const state = now === 0 ? "none" : followUpState(application, now);
      if (state === "due") return "It's time to follow up. A short, friendly note to the recruiter is enough.";
      if (state === "scheduled" && application.followUpAt !== null) {
        return `Waiting to hear back. I'll remind you to follow up on ${formatDay(application.followUpAt, now)}.`;
      }
      return "Waiting to hear back. Move it on here when they reply.";
    }
    case "interview":
      return hasPrep
        ? "Your prep is ready. Practice your answers out loud before the day."
        : "You have an interview. I can make prep from this job and the resume you sent.";
    case "offer":
      return "You have an offer. Read it closely and take the time you need.";
    case "rejected":
      return "They said no this time. It still counts in your record of what works.";
    case "no_reply":
      return "No answer so far. It stays here in case they write back.";
  }
}
