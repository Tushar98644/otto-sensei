import { limitHourlyWrites } from "@/lib/api/limits";
import { SHARE_LIMITS } from "@/lib/share/types";

export function writeLimited(userId: string): Promise<Response | null> {
  return limitHourlyWrites(
    `share:write:user:${userId}`,
    SHARE_LIMITS.writesPerHour,
    "link changes",
  );
}
