import { followUpState } from "@/lib/applications/follow-up";
import type { Application } from "@/lib/applications/schema";
import {
  APPLICATION_STAGES,
  isStage,
  stageIndex,
  type ApplicationStatus,
  type StatusEvent,
} from "@/lib/applications/status";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { formatDay, type ApplicationsMessages } from "../../i18n";

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
  const reached = stageIndex(
    isStage(application.status) ? application.status : application.stageReached,
  );
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

export function nextStepLine(
  application: Pick<Application, "status" | "followUpAt">,
  hasPrep: boolean,
  now: number,
  { nextStep: t }: ApplicationsMessages,
  format: Format,
): string {
  switch (application.status) {
    case "applied": {
      const state = now === 0 ? "none" : followUpState(application, now);
      if (state === "due") return t.dueApplied;
      if (state === "scheduled" && application.followUpAt !== null) {
        return fmt(t.scheduled, { day: formatDay(format, application.followUpAt, now) });
      }
      return t.waiting;
    }
    case "interview": {
      const state = now === 0 ? "none" : followUpState(application, now);
      if (state === "due") return t.dueInterview;
      if (state === "scheduled" && application.followUpAt !== null) {
        return fmt(t.scheduled, { day: formatDay(format, application.followUpAt, now) });
      }
      return hasPrep ? t.prepReady : t.interview;
    }
    case "offer":
      return t.offer;
    case "rejected":
      return t.rejected;
    case "no_reply":
      return t.noReply;
  }
}
