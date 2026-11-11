import { DAY_MS } from "@/lib/time";
import type { ApplicationStatus } from "./status";

export const FOLLOW_UP_DAYS = { default: 7, min: 1, max: 60 } as const;
export const SNOOZE_DAYS = 3;
export const FOLLOW_UP_DAY_CHOICES = [3, 5, 7, 10, 14, 21] as const;

export function firstFollowUpAt(appliedAt: number, now: number, days: number): number {
  return Math.max(appliedAt + days * DAY_MS, now + DAY_MS);
}

export function followUpAfterStatus(now: number, days: number): number {
  return now + days * DAY_MS;
}

export function snoozedUntil(now: number): number {
  return now + SNOOZE_DAYS * DAY_MS;
}

export type FollowUpState = "none" | "scheduled" | "due";

export function followUpState(
  application: { status: ApplicationStatus; followUpAt: number | null },
  now: number,
): FollowUpState {
  if (application.status !== "applied" || application.followUpAt === null) return "none";
  return application.followUpAt <= now ? "due" : "scheduled";
}

export function isFollowUpDays(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= FOLLOW_UP_DAYS.min &&
    value <= FOLLOW_UP_DAYS.max
  );
}
