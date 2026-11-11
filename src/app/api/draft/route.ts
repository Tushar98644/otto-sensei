import { draftResume } from "@/lib/ai/draft";
import { fail, ok } from "@/lib/api/respond";
import { DraftRequestSchema, type DraftResponse } from "@/lib/api/types";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { takeAccountUnit, upgradeRequired } from "../metered-free";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    const rejected = rejectCrossSite(req) ?? rejectNonJson(req);
    if (rejected) return rejected;
    const body = await readJson(req, DraftRequestSchema);
    if (!body.ok) return fail("bad_request", body.message, 400);

    const user = await getCurrentUser();
    const startedAt = Date.now();
    const unit = user ? await takeAccountUnit(user, "draft", startedAt) : upgradeRequired(null, "draft");
    if (unit instanceof Response) return unit;

    let drafted: Awaited<ReturnType<typeof draftResume>>;
    try {
      drafted = await unit.spend(() => draftResume(body.data, startedAt));
    } catch (error) {
      await unit.giveBack();
      throw error;
    }
    const { resume, usedAI } = drafted;
    if (!usedAI) await unit.giveBack();
    log.info("draft.completed", {
      jobs: body.data.jobs.length,
      notes: body.data.jobs.reduce((sum, job) => sum + job.notes.length, 0),
      usedAI,
      durationMs: Date.now() - startedAt,
    });
    const response: Omit<DraftResponse, "ok"> = { resume, usedAI };
    return ok(response);
  } catch (error) {
    log.error("draft.failed", error);
    return fail("server_error", "Otto couldn't write the draft. Please try again.", 500);
  }
}
