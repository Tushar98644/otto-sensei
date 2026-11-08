import { ANON_LIMITS, IP_LIMITS } from "@/config/plans";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, type RateLimitResult } from "@/lib/rate-limit";
import { fail } from "@/lib/api/respond";
import { ipBucket } from "../import/upload-limits";

// Server-only. Signed-out drafts are limited like AI reads: per network first, then per device, each
// over 30 days, at the Free plan's numbers (a daily window let one device take about 60 a month).
// Signed-in accounts spend their monthly allowance instead (see ../metered-free).
export const DRAFT_LIMITS = {
  ip: IP_LIMITS.draftsPer30Days,
  device: ANON_LIMITS.draftsPer30Days,
} as const;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function limitDrafts(req: Request): Promise<Response | null> {
  const network = await count(`draft:ip:${ipBucket(clientIp(req))}`, DRAFT_LIMITS.ip);
  if (network && !network.allowed) return tooMany("ip", network);
  const device = await count(`draft:device:${await getDeviceId()}`, DRAFT_LIMITS.device);
  if (device && !device.allowed) return tooMany("device", device);
  return null;
}

// The draft doesn't otherwise need the database, so an outage lets it through.
async function count(key: string, limit: number): Promise<RateLimitResult | null> {
  try {
    return await rateLimit(key, limit, WINDOW_MS);
  } catch (error) {
    log.warn("draft.rate_limit_unavailable", {}, error);
    return null;
  }
}

function tooMany(scope: "ip" | "device", result: RateLimitResult): Response {
  log.info("draft.rate_limited", { scope });
  return fail(
    "rate_limited",
    `That's the ${DRAFT_LIMITS.device} free drafts on this device this month. Edit the one you have, or sign in to upgrade for more.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}
