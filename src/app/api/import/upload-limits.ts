import { ANON_LIMITS, IP_LIMITS } from "@/config/plans";
import { limitNetworkThenDevice, type LimitScope } from "@/lib/api/limits";
import { fail } from "@/lib/api/respond";
import { log } from "@/lib/log";
import { retryAfterHeader, waitLong, type RateLimitResult } from "@/lib/rate-limit";
import { DAY_MS } from "@/lib/time";

export type UploadKind = "import" | "check";

const DAILY_LIMITS: Record<UploadKind, { ip: number; device: number }> = {
  import: { ip: IP_LIMITS.uploadsPerDay, device: ANON_LIMITS.uploadsPerDay },
  check: { ip: IP_LIMITS.checksPerDay, device: ANON_LIMITS.checksPerDay },
};

export async function limitUploads(req: Request, kind: UploadKind): Promise<Response | null> {
  const hit = await limitNetworkThenDevice(req, {
    key: kind,
    logAs: kind,
    ...DAILY_LIMITS[kind],
    windowMs: DAY_MS,
  });
  return hit && tooMany(kind, hit.scope, hit.result);
}

function tooMany(kind: UploadKind, scope: LimitScope, result: RateLimitResult): Response {
  log.info(`${kind}.rate_limited`, { scope });
  const did = kind === "import" ? "uploaded" : "checked";
  return fail(
    "rate_limited",
    `You've ${did} a lot of files today. Try again in ${waitLong(result.retryAfterMs)}.`,
    429,
    retryAfterHeader(result.retryAfterMs),
  );
}
