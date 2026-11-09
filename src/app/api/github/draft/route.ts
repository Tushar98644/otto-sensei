import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { draftGitHubProjects } from "@/lib/github/draft";
import { GitHubError, newGitHubSession } from "@/lib/github/http";
import { GitHubDraftRequestSchema, type GitHubDraftResponse } from "@/lib/github/types";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { takeAccountUnit, upgradeRequired } from "../../metered-free";
import { gitHubFailure } from "../limits";

export const runtime = "nodejs";
export const maxDuration = 60;

const GITHUB_BUDGET_MS = 15_000;

// Picked repos and pull requests → drafted project entries. Never touches a resume: the dialog
// shows the drafts and adds them only after the person confirms.
export async function POST(req: Request): Promise<Response> {
  const rejected = rejectCrossSite(req) ?? rejectNonJson(req);
  if (rejected) return rejected;
  try {
    const body = await readJson(req, GitHubDraftRequestSchema);
    if (!body.ok) return fail("bad_request", "Pick up to 4 repos and 6 pull requests, then try again.", 400);

    const user = await getCurrentUser();
    const startedAt = Date.now();
    // Drafting is an AI call, so Pro and Max (and the trial) only; looking repos up stays free.
    const unit = user ? await takeAccountUnit(user, "github", startedAt) : upgradeRequired(null, "github");
    if (unit instanceof Response) return unit;

    const session = newGitHubSession(GITHUB_BUDGET_MS, startedAt);
    try {
      const result = await draftGitHubProjects(session, body.data);
      // GitHub's own words, lightly arranged: no model call to count.
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
      return ok(response);
    } catch (error) {
      await unit.giveBack();
      if (!(error instanceof GitHubError)) throw error;
      log.info("github.draft_failed", { reason: error.reason, calls: session.calls });
      return gitHubFailure(error, body.data.username);
    }
  } catch (error) {
    log.error("github.draft_error", error);
    return fail("server_error", "Otto couldn't draft those projects. Please try again.", 500);
  }
}
