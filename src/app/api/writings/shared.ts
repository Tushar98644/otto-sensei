import { limitHourlyWrites } from "@/lib/api/limits";

export const SIGN_IN = "Sign in to see your cover letters and answers.";
export const NOT_FOUND = "That letter isn't in your list anymore.";
export const INVALID = "That letter couldn't be saved. Reload the page and try again.";

const WRITES_PER_HOUR = 600;

export function writeLimited(userId: string): Promise<Response | null> {
  return limitHourlyWrites(`writings:write:user:${userId}`, WRITES_PER_HOUR, "changes");
}
