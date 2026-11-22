"use client";

import { lazyComponent } from "@/components/ui/lazy";
import type { Notification } from "@/lib/notifications/types";

// "How did it go?" brings the applications code with it, so it loads only for a row that asks.
export const interviewOutcomeActions = lazyComponent(() =>
  import("./interview-outcome-actions").then((m) => m.InterviewOutcomeActions),
);

export function asksOutcome(item: Notification): boolean {
  return item.kind === "interview_after" && item.outcomeOpen;
}
