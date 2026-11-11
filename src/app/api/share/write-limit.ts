import { fail } from "@/lib/api/respond";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { SHARE_LIMITS } from "@/lib/share/types";

const HOUR_MS = 60 * 60 * 1000;

export async function writeLimited(userId: string): Promise<Response | null> {
  const limit = await rateLimit(`share:write:user:${userId}`, SHARE_LIMITS.writesPerHour, HOUR_MS);
  if (limit.allowed) return null;
  return fail(
    "rate_limited",
    `That's a lot of link changes in one hour. Try again in ${waitText(limit.retryAfterMs)}.`,
    429,
    retryAfterHeader(limit.retryAfterMs),
  );
}
