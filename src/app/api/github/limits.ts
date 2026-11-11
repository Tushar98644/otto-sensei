import { limitNetworkThenDevice, type LimitScope } from "@/lib/api/limits";
import { fail } from "@/lib/api/respond";
import { GitHubError } from "@/lib/github/http";
import { log } from "@/lib/log";
import { retryAfterHeader, waitText, type RateLimitResult } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

export const GITHUB_LIMITS = {
  lookup: { windowMs: HOUR_MS, device: 20, ip: 60 },
} as const;

export type GitHubAction = keyof typeof GITHUB_LIMITS;

export async function limitGitHub(req: Request, action: GitHubAction): Promise<Response | null> {
  const hit = await limitNetworkThenDevice(req, {
    key: `github-${action}`,
    logAs: "github",
    ...GITHUB_LIMITS[action],
  });
  return hit && tooMany(action, hit.scope, hit.result);
}

function tooMany(action: GitHubAction, scope: LimitScope, result: RateLimitResult): Response {
  log.info("github.rate_limited", { action, scope });
  const message = `You've looked up a lot of GitHub accounts this hour. Try again in ${waitText(result.retryAfterMs)}.`;
  return fail("rate_limited", message, 429, retryAfterHeader(result.retryAfterMs));
}

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
