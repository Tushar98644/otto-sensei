import { ANON_LIMITS, IP_LIMITS } from "@/config/plans";
import { fail } from "@/lib/api/respond";
import { GitHubError } from "@/lib/github/http";
import { clientIp, getDeviceId } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";
import { ipBucket } from "../import/upload-limits";

// Server-only. "Import from GitHub" needs no account, so like job links it is limited per network
// and per device. GitHub's own allowance for this server is shared by everyone, so both limits sit
// well under what would let one person or script use it up.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const GITHUB_LIMITS = {
  // Two GitHub calls each, often fewer with the cache.
  lookup: { windowMs: HOUR_MS, device: 20, ip: 60 },
  // Up to 10 GitHub calls and one AI call each. Signed-out visitors only, at the Free plan's
  // numbers: signed-in accounts spend their monthly "github" allowance (see ../metered-free).
  draft: {
    windowMs: 30 * DAY_MS,
    device: ANON_LIMITS.githubDraftsPer30Days,
    ip: IP_LIMITS.githubDraftsPer30Days,
  },
} as const;

export type GitHubAction = keyof typeof GITHUB_LIMITS;

/** Counts one request against both limits. Returns a 429 response once either is used up. */
export async function limitGitHub(req: Request, action: GitHubAction): Promise<Response | null> {
  const limits = GITHUB_LIMITS[action];
  // The network goes first, so a flood without cookies stops before adding a device row per request.
  const network = await count(
    `github-${action}:ip:${ipBucket(clientIp(req))}`,
    limits.ip,
    limits.windowMs,
  );
  if (network && !network.allowed) return tooMany(action, "ip", network);
  const device = await count(
    `github-${action}:device:${await getDeviceId()}`,
    limits.device,
    limits.windowMs,
  );
  if (device && !device.allowed) return tooMany(action, "device", device);
  return null;
}

// A database outage lets requests through instead of taking the feature down with it.
async function count(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult | null> {
  try {
    return await rateLimit(key, limit, windowMs);
  } catch (error) {
    // The key holds the IP address, so only the error goes to the log.
    log.warn("github.rate_limit_unavailable", {}, error);
    return null;
  }
}

function tooMany(action: GitHubAction, scope: "ip" | "device", result: RateLimitResult): Response {
  log.info("github.rate_limited", { action, scope });
  const message =
    action === "lookup"
      ? `You've looked up a lot of GitHub accounts this hour. Try again in ${waitText(result.retryAfterMs)}.`
      : `That's the ${GITHUB_LIMITS.draft.device} free GitHub drafts on this device this month. Edit the projects you have, or sign in to upgrade for more.`;
  return fail("rate_limited", message, 429, retryAfterHeader(result.retryAfterMs));
}

/** The response for a GitHub failure: plain words, and GitHub's wait time when it gave one. */
export function gitHubFailure(error: GitHubError, username: string): Response {
  switch (error.reason) {
    case "not_found":
      return fail(
        "not_found",
        `There's no GitHub account called “${username}”. Check the spelling.`,
        404,
      );
    case "rate_limited": {
      const wait = error.retryAfterMs ?? 60_000;
      return fail(
        "rate_limited",
        `GitHub is busy right now. Try again in ${waitText(wait)}.`,
        429,
        retryAfterHeader(wait),
      );
    }
    default:
      return fail(
        "server_error",
        "GitHub didn't answer just now. Please try again in a minute.",
        502,
      );
  }
}
