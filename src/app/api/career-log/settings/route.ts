import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { saveSettings } from "@/lib/career-log/records";
import type { CareerSettingsResponse } from "@/lib/career-log/types";
import { SettingsChangeSchema } from "@/lib/career-log/validation";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { emailConfigured } from "@/lib/notifications/email";
import { SIGN_IN, writeLimited } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const limited = await writeLimited(user.id);
    if (limited) return limited;
    const body = await readJson(req, SettingsChangeSchema);
    if (!body.ok) {
      log.info("career_log.settings_bad_request", { reason: body.message });
      return fail("bad_request", "That setting isn't valid.", 400, NO_STORE);
    }
    const settings = await saveSettings(user.id, body.data);
    if (settings === null) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    if (body.data.checkins !== undefined) {
      log.info("career_log.checkins_chosen", { on: body.data.checkins });
    }
    const response: Omit<CareerSettingsResponse, "ok"> = {
      settings,
      emailAvailable: emailConfigured(),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("career_log.settings_save_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
}
