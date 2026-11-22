import { limitHourlyWrites } from "@/lib/api/limits";

export const SIGN_IN = "Sign in to see your career log.";

// Autosave sends a few writes a minute while someone types.
const WRITES_PER_HOUR = 600;

export function writeLimited(userId: string): Promise<Response | null> {
  return limitHourlyWrites(`career-log:write:user:${userId}`, WRITES_PER_HOUR, "changes");
}
