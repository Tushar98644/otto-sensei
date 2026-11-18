import { limitHourlyWrites } from "@/lib/api/limits";

export const SIGN_IN = "Sign in to see your cover letters, answers and messages.";
export const NOT_FOUND = "That isn't in your list anymore.";
// Shown under an outreach message that didn't save, where reloading would lose it.
export const INVALID = "That couldn't be saved.";

const WRITES_PER_HOUR = 600;

export function writeLimited(userId: string): Promise<Response | null> {
  return limitHourlyWrites(`writings:write:user:${userId}`, WRITES_PER_HOUR, "changes");
}
