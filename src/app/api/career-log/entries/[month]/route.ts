import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteEntry, saveEntry } from "@/lib/career-log/records";
import { CAREER_LOG_LIMITS, type CareerEntryResponse } from "@/lib/career-log/types";
import { EntryChangeSchema, MonthSchema } from "@/lib/career-log/validation";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { SIGN_IN, writeLimited } from "../../shared";

export const runtime = "nodejs";

type Context = { params: Promise<{ month: string }> };

const NOT_A_MONTH = "That month isn't valid.";

export async function PUT(req: Request, { params }: Context): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { month } = await params;
    if (!MonthSchema.safeParse(month).success) return fail("bad_request", NOT_A_MONTH, 400);
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, EntryChangeSchema);
    if (!body.ok) {
      log.info("career_log.entry_bad_request", { reason: body.message });
      return fail(
        "bad_request",
        `That note couldn't be saved. Keep each answer under ${CAREER_LOG_LIMITS.fieldChars.toLocaleString("en-US")} characters.`,
        400,
      );
    }
    const result = await saveEntry(user.id, month, body.data);
    if (result.status === "gone") return fail("unauthorized", SIGN_IN, 401);
    if (result.status === "full") {
      return fail(
        "bad_request",
        `Your log holds ${CAREER_LOG_LIMITS.entries} months. Delete an old month to add this one.`,
        400,
      );
    }
    const response: Omit<CareerEntryResponse, "ok"> = { entry: result.entry };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("career_log.entry_save_failed", error);
    return fail("server_error", "Couldn't save that note. Please try again.", 500);
  }
}

export async function DELETE(req: Request, { params }: Context): Promise<Response> {
  const blocked = rejectCrossSite(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401);
    const { month } = await params;
    if (MonthSchema.safeParse(month).success) await deleteEntry(user.id, month);
    return ok({});
  } catch (error) {
    log.error("career_log.entry_delete_failed", error);
    return fail("server_error", "Couldn't delete that month. Please try again.", 500);
  }
}
