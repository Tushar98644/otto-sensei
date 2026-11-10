import { followUpState } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import {
  APPLICATION_STAGES,
  isStage,
  stageIndex,
  type ApplicationStatus,
  type StatusEvent,
} from "@/lib/applications/status";
import { formatDay } from "../view";

// Client-safe and pure: the application page's timeline and its one next-step line.

export type TimelineStep = {
  status: ApplicationStatus;
  // done: passed on the way; current: where it stands; next: still ahead.
  state: "done" | "current" | "next";
  // When it got there, when known. Rows logged before the timeline existed only know the day they
  // were sent and their last change.
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

/**
 * The steps forward as far as it went, then either the steps still ahead or how it ended. An
 * interview that ended in a no shows Applied and Interviewing done, then Rejected.
 */
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

/**
 * Otto's line at the top of the page: what this application needs next, from its own facts.
 * At most 18 words, like every Otto line.
 */
export function nextStepLine(
  application: Pick<Application, "status" | "followUpAt">,
  hasPrep: boolean,
  now: number,
): string {
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
