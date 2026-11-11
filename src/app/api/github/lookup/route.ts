import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentAccount } from "@/lib/auth/session";
import { lookupProfile } from "@/lib/github/api";
import { GitHubError, newGitHubSession } from "@/lib/github/http";
import { GitHubLookupRequestSchema, type GitHubLookupResponse } from "@/lib/github/types";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { gitHubFailure, limitGitHub } from "../limits";
import { ownGitHubLogin } from "../ownership";

export const runtime = "nodejs";
export const maxDuration = 30;

const GITHUB_BUDGET_MS = 15_000;
const INVALID = "That isn't a GitHub username. Use the name in your profile link, like github.com/octocat.";

// The connected GitHub account → its public repos and merged pull requests to pick from. Signed
// in, and only the account linked to this one (../ownership.ts). Logs carry counts only: a
// username can name a person.
export async function POST(req: Request): Promise<Response> {
  const rejected = rejectCrossSite(req) ?? rejectNonJson(req);
  if (rejected) return rejected;
  try {
    const body = await readJson(req, GitHubLookupRequestSchema);
    if (!body.ok) return fail("bad_request", INVALID, 400);

    const account = await getCurrentAccount();
    if (!account) return fail("unauthorized", "Sign in to import your GitHub projects.", 401);
    const login = ownGitHubLogin(account.github, body.data.username);
    if (login instanceof Response) return login;

    const limited = await limitGitHub(req, "lookup");
    if (limited) return limited;

    const startedAt = Date.now();
    const session = newGitHubSession(GITHUB_BUDGET_MS, startedAt);
    try {
      const profile = await lookupProfile(session, login);
      log.info("github.lookup", {
        repos: profile.repos.length,
        pulls: profile.pulls.length,
        pullsUnavailable: profile.pullsUnavailable,
        calls: session.calls,
        durationMs: Date.now() - startedAt,
      });
      const response: Omit<GitHubLookupResponse, "ok"> = { profile };
      return ok(response);
    } catch (error) {
      if (!(error instanceof GitHubError)) throw error;
      log.info("github.lookup_failed", { reason: error.reason, calls: session.calls });
      return gitHubFailure(error, login);
    }
  } catch (error) {
    log.error("github.lookup_error", error);
    return fail("server_error", "Something went wrong reading GitHub. Please try again.", 500);
  }
}
