import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentAccount } from "@/lib/auth/session";
import { draftGitHubProjects } from "@/lib/github/draft";
import { GitHubError, newGitHubSession } from "@/lib/github/http";
import { GitHubDraftRequestSchema, type GitHubDraftResponse } from "@/lib/github/types";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { creditField } from "@/lib/usage-credit";
import { requirePlanFeature, takeAccountUnit, upgradeRequired } from "../../metered-free";
import { gitHubFailure } from "../limits";
import { ownGitHubLogin } from "../ownership";

export const runtime = "nodejs";
export const maxDuration = 60;

const GITHUB_BUDGET_MS = 15_000;

export async function POST(req: Request): Promise<Response> {
  const rejected = rejectCrossSite(req) ?? rejectNonJson(req);
  if (rejected) return rejected;
  try {
    const body = await readJson(req, GitHubDraftRequestSchema);
    if (!body.ok) return fail("bad_request", "Pick up to 4 repos and 6 pull requests, then try again.", 400);

    const account = await getCurrentAccount();
    const startedAt = Date.now();
    if (!account) return upgradeRequired(null, "github");
    const noPlan = requirePlanFeature(account.user, "github");
    if (noPlan) return noPlan;
    const login = ownGitHubLogin(account.github, body.data.username);
    if (login instanceof Response) return login;
    const unit = await takeAccountUnit(account.user, "github", startedAt);
    if (unit instanceof Response) return unit;

    const session = newGitHubSession(GITHUB_BUDGET_MS, startedAt);
    try {
      const result = await unit.spend(() =>
        draftGitHubProjects(session, { ...body.data, username: login }),
      );
      if (!result.usedAI || result.entries.length === 0) await unit.giveBack();
      log.info("github.drafted", {
        repos: body.data.repos.length,
        pulls: body.data.pulls.length,
        entries: result.entries.length,
        missing: result.missing,
        usedAI: result.usedAI,
        calls: session.calls,
        durationMs: Date.now() - startedAt,
      });
      if (result.entries.length === 0) {
        return fail("not_found", "Those repos and pull requests aren't on GitHub anymore. Look the name up again.", 404);
      }
      const response: Omit<GitHubDraftResponse, "ok"> = result;
      return ok({ ...response, ...creditField(result.usedAI ? unit.credit : null) });
    } catch (error) {
      await unit.giveBack();
      if (!(error instanceof GitHubError)) throw error;
      log.info("github.draft_failed", { reason: error.reason, calls: session.calls });
      return gitHubFailure(error, login);
    }
  } catch (error) {
    log.error("github.draft_error", error);
    return fail("server_error", "Otto couldn't draft those projects. Please try again.", 500);
  }
}
