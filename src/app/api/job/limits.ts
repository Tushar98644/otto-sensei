import { limitNetworkThenDevice, type LimitScope } from "@/lib/api/limits";
import { fail } from "@/lib/api/respond";
import { log } from "@/lib/log";
import { retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

// Reading job links needs no account, so it's limited per network and per device, hourly.

// Each read makes our server fetch someone else's page, so both stay well under what would let a
// script use us as a crawler. A busy job hunt reads maybe a dozen links an hour.
export const JOB_READ_LIMITS = { perDevicePerHour: 30, perIpPerHour: 120 } as const;

export async function limitJobReads(req: Request): Promise<Response | null> {
  const hit = await limitNetworkThenDevice(req, {
    key: "job",
    logAs: "job",
    ip: JOB_READ_LIMITS.perIpPerHour,
    device: JOB_READ_LIMITS.perDevicePerHour,
    windowMs: HOUR_MS,
  });
  return hit && tooMany(hit.scope, hit.result);
}

function tooMany(scope: LimitScope, result: RateLimitResult): Response {
  log.info("job.rate_limited", { scope });
  return fail(
    "rate_limited",
    `You've read a lot of job links this hour. Try again in ${waitText(result.retryAfterMs)}, or paste the job text instead.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}
