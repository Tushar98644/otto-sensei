import { DAY_MS } from "@/lib/time";

// "Not now" on a one-tap email card rests it this long; turning the email on or off answers it for good.
export const PROMPT_SNOOZE_DAYS = 30;

export function promptResting(snoozedAt: number | null, now: number): boolean {
  return snoozedAt !== null && snoozedAt > now - PROMPT_SNOOZE_DAYS * DAY_MS;
}
