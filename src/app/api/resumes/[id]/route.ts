import { isPaidPlan, resumeLimit } from "@/config/plans";
import { trackTailoredCopy } from "@/lib/analytics/retention";
import { fail, ok } from "@/lib/api/respond";
import { PutResumeSchema, type EmptyOk, type PutResumeResponse } from "@/lib/api/types";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { planFullText } from "@/lib/plan-limits-copy";
import { syncPortfolioWith } from "@/lib/portfolio/sync";
import { ResumeSchema } from "@/lib/resume/validation";
import type { PutResumeResult } from "@/lib/sync/api-types";
import { proToolRequired } from "../../pro-tools";
import { deleteBackup, saveBackup } from "../backups";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const SIGN_IN = "Sign in to sync your resumes.";
const EMPTY: Omit<EmptyOk, "ok"> = {};
const SAVED: Omit<PutResumeResponse, "ok"> = { deleted: false };
const DELETED: Omit<PutResumeResponse, "ok"> = { deleted: true };
const STALE: Omit<PutResumeResult, "ok"> = { deleted: false, stale: true };

function isResumeId(id: string): boolean {
  return ResumeSchema.shape.id.safeParse(id).success;
}

// The account's version this edit was made on (?base=); older clients send none.
function baseOf(req: Request): number | undefined {
  const raw = new URL(req.url).searchParams.get("base");
  return raw !== null && /^\d{1,15}$/.test(raw) ? Number(raw) : undefined;
}

export async function PUT(req: Request, { params }: Context): Promise<Response> {
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (!isResumeId(id)) return fail("bad_request", "That resume id isn't valid.", 400);
    const body = await readJson(req, PutResumeSchema);
    if (!body.ok) {
      log.info("resumes.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That resume couldn't be saved because part of it isn't valid.",
        400,
      );
    }
    if (body.data.id !== id) {
      return fail("bad_request", "The resume doesn't match the address it was sent to.", 400);
    }

    const planLimit = resumeLimit(user.plan);
    const { status, bytes, created } = await saveBackup(
      user.id,
      body.data,
      Date.now(),
      planLimit,
      baseOf(req),
    );
    if (status === "no_user") {
      log.info("resumes.write_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401);
    }
    if (status === "too_large") {
      log.warn("resumes.too_large", { bytes });
      return fail(
        "too_large",
        "That resume is too long to back up. Shorten it a little and it will save again.",
        413,
      );
    }
    if (status === "limit_reached" || status === "plan_limit") {
      if (!isPaidPlan(user.plan)) return proToolRequired(user, "resumes");
      log.info("resumes.limit_reached", { plan: user.plan, ceiling: status === "limit_reached" });
      return fail("limit_reached", planFullText("resumes", user.plan), 429);
    }
    if (status === "deleted") {
      log.info("resumes.write_after_delete");
      return ok(DELETED);
    }
    if (created && body.data.tailor) trackTailoredCopy(user.id);
    if (status === "stale") log.info("resumes.stale_write");
    else await syncPortfolioWith(user.id, body.data);
    return ok(status === "stale" ? STALE : SAVED);
  } catch (error) {
    log.error("resumes.save_failed", error);
    return fail("server_error", "Couldn't save your resume. Please try again.", 500);
  }
}

export async function DELETE(_req: Request, { params }: Context): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (isResumeId(id)) await deleteBackup(user.id, id);
    return ok(EMPTY);
  } catch (error) {
    log.error("resumes.delete_failed", error);
    return fail("server_error", "Couldn't delete that resume. Please try again.", 500);
  }
}
