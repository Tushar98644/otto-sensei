import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { readWritingStyle, saveWritingStyle } from "@/lib/writing-style/records";
import { STYLE_LIMITS, type WritingStyleResponse } from "@/lib/writing-style/schema";
import { WritingStyleSchema } from "@/lib/writing-style/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to change your writing style.";
const INVALID = `Otto couldn't save that. Keep the sign-off to ${STYLE_LIMITS.signOff} characters and your notes to ${STYLE_LIMITS.notes}.`;

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<WritingStyleResponse, "ok"> = { style: await readWritingStyle(user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("writing_style.read_failed", error);
    return fail(
      "server_error",
      "Couldn't load your writing style. Please try again.",
      500,
      NO_STORE,
    );
  }
}

export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, WritingStyleSchema);
    if (!body.ok) {
      log.info("writing_style.bad_request", { reason: body.message });
      return fail("bad_request", INVALID, 400, NO_STORE);
    }
    const style = await saveWritingStyle(user.id, body.data);
    if (style === null) {
      log.info("writing_style.after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    }
    const response: Omit<WritingStyleResponse, "ok"> = { style };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("writing_style.save_failed", error);
    return fail(
      "server_error",
      "Couldn't save your writing style. Please try again.",
      500,
      NO_STORE,
    );
  }
}
