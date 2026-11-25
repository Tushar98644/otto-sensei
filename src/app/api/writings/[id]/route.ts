import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { deleteWriting, updateWriting } from "@/lib/writings/records";
import { textLimit, type WritingKind, type WritingResponse } from "@/lib/writings/schema";
import { UpdateWritingSchema, WritingIdSchema } from "@/lib/writings/validation";
import { NOT_FOUND, SIGN_IN, writeLimited } from "../shared";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";

const count = new Intl.NumberFormat("en-US");
const KIND_NAMES: Record<WritingKind, string> = {
  letter: "letter",
  answer: "answer",
  outreach: "email",
};

type Context = { params: Promise<{ id: string }> };

// Another account's id gets the same 404 as a missing one, so ids can't be probed.
export const PATCH = withApiLocale(async function PATCH(
  req: Request,
  { params }: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (!WritingIdSchema.safeParse(id).success) return fail("not_found", NOT_FOUND, 404);
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, UpdateWritingSchema);
    if (!body.ok) {
      log.info("writings.bad_request", { reason: body.message });
      return fail(
        "bad_request",
        "That edit couldn't be saved. Make it shorter and try again.",
        400,
      );
    }
    const result = await updateWriting(user.id, id, body.data);
    if (result.status === "not_found") return fail("not_found", NOT_FOUND, 404);
    if (result.status === "not_outreach") {
      return fail("bad_request", "Only outreach messages have a subject and a note.", 400);
    }
    if (result.status === "too_long") {
      return fail(
        "bad_request",
        `That ${KIND_NAMES[result.kind]} is too long to keep. Cut it under ${count.format(textLimit(result.kind))} characters.`,
        400,
      );
    }
    const response: Omit<WritingResponse, "ok"> = { writing: result.writing };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("writings.update_failed", error);
    return fail("server_error", "Couldn't save that edit. Please try again.", 500);
  }
});

export const DELETE = withApiLocale(async function DELETE(
  req: Request,
  { params }: Context,
): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { id } = await params;
    if (WritingIdSchema.safeParse(id).success) await deleteWriting(user.id, id);
    return ok({});
  } catch (error) {
    log.error("writings.delete_failed", error);
    return fail("server_error", "Couldn't delete that. Please try again.", 500);
  }
});
