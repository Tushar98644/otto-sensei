import { fail } from "@/lib/api/respond";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";
import { ipBucket } from "../import/upload-limits";

// Server-only. Reading job links needs no account, like imports, so it is limited per network and
// per device over a one-hour window.

const HOUR_MS = 60 * 60 * 1000;
// Each read makes our server fetch someone else's page, so both stay well under what would let a
// script use us as a crawler. A busy job hunt reads maybe a dozen links an hour.
export const JOB_READ_LIMITS = { perDevicePerHour: 30, perIpPerHour: 120 } as const;

/** Counts one read against both limits. Returns a 429 response once either is used up. */
export async function limitJobReads(req: Request): Promise<Response | null> {
  // The network goes first, so a flood without cookies stops before adding a device row per request.
  const network = await count(`job:ip:${ipBucket(clientIp(req))}`, JOB_READ_LIMITS.perIpPerHour);
  if (network && !network.allowed) return tooMany("ip", network);
  const device = await count(`job:device:${await getDeviceId()}`, JOB_READ_LIMITS.perDevicePerHour);
  if (device && !device.allowed) return tooMany("device", device);
  return null;
}

// A database outage lets reads through instead of taking the feature down with it.
async function count(key: string, limit: number): Promise<RateLimitResult | null> {
  try {
    return await rateLimit(key, limit, HOUR_MS);
  } catch (error) {
    // The key holds the IP address, so only the error goes to the log.
    log.warn("job.rate_limit_unavailable", {}, error);
    return null;
  }
}

function tooMany(scope: "ip" | "device", result: RateLimitResult): Response {
  log.info("job.rate_limited", { scope });
  return fail(
    "rate_limited",
    `You've read a lot of job links this hour. Try again in ${waitText(result.retryAfterMs)}, or paste the job text instead.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}
