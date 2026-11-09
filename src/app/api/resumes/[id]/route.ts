import { resumeLimit } from "@/config/plans";
import { fail, ok } from "@/lib/api/respond";
import { PutResumeSchema, type EmptyOk, type PutResumeResponse } from "@/lib/api/types";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { syncPortfolioWith } from "@/lib/portfolio/sync";
import { ResumeSchema } from "@/lib/resume/schema";
import { proToolRequired } from "../../pro-tools";
import { deleteBackup, MAX_RESUMES_PER_USER, saveBackup } from "../backups";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const SIGN_IN = "Sign in to sync your resumes.";
const EMPTY: Omit<EmptyOk, "ok"> = {};
const SAVED: Omit<PutResumeResponse, "ok"> = { deleted: false };
// A 200, not an error: the client did nothing wrong, it just hasn't heard about the deletion yet.
const DELETED: Omit<PutResumeResponse, "ok"> = { deleted: true };

function isResumeId(id: string): boolean {
  return ResumeSchema.shape.id.safeParse(id).success;
}

// Upsert keyed by (user, id). Sending the same version twice is harmless, and a copy older than
// the stored one is accepted without replacing it. A resume deleted from the account stays deleted.
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
      // readJson names the field and the rule it broke, never the value.
      log.info("resumes.bad_request", { reason: body.message });
      return fail("bad_request", "That resume couldn't be saved because part of it isn't valid.", 400);
    }
    if (body.data.id !== id) {
      return fail("bad_request", "The resume doesn't match the address it was sent to.", 400);
    }

    const planLimit = resumeLimit(user.plan);
    const { status, bytes } = await saveBackup(user.id, body.data, Date.now(), planLimit);
    if (status === "no_user") {
      log.info("resumes.write_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401);
    }
    if (status === "too_large") {
      log.warn("resumes.too_large", { bytes });
      return fail("too_large", "That resume is too long to back up. Shorten it a little and it will save again.", 413);
    }
    if (status === "limit_reached") {
      log.info("resumes.limit_reached", { max: MAX_RESUMES_PER_USER });
      return fail(
        "bad_request",
        `You can keep up to ${MAX_RESUMES_PER_USER} resumes. Delete one to save another.`,
        400,
      );
    }
    // The resume stays in the browser; the client offers the trial before making a new one.
    if (status === "plan_limit") return proToolRequired(user, "resumes");
    if (status === "deleted") {
      log.info("resumes.write_after_delete");
      return ok(DELETED);
    }
    if (status === "stale") log.info("resumes.stale_write");
    else await syncPortfolioWith(user.id, body.data);
    return ok(SAVED);
  } catch (error) {
    log.error("resumes.save_failed", error);
    return fail("server_error", "Couldn't save your resume. Please try again.", 500);
  }
}

// Succeeds when there was nothing to delete too: the caller only needs the backup gone. A
// tombstone is left behind so other devices drop their copies instead of uploading them again.
export async function DELETE(_req: Request, { params }: Context): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    // An id the schema rejects was never saved, so there's no row to look for.
    if (isResumeId(id)) await deleteBackup(user.id, id);
    return ok(EMPTY);
  } catch (error) {
    log.error("resumes.delete_failed", error);
    return fail("server_error", "Couldn't delete that resume. Please try again.", 500);
  }
}
