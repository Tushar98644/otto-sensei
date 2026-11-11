import { fail, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { emailConfigured } from "@/lib/notifications/email";
import { readReminderSettings, saveReminderSettings } from "@/lib/notifications/records";
import { type ReminderSettingsResponse } from "@/lib/notifications/types";
import { ReminderSettingsSchema } from "@/lib/notifications/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const SIGN_IN = "Sign in to change your reminders.";

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const settings = await readReminderSettings(user.id);
    if (settings === null) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<ReminderSettingsResponse, "ok"> = {
      ...settings,
      emailAvailable: emailConfigured(),
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.settings_read_failed", error);
    return fail("server_error", "Couldn't load your reminder settings. Please try again.", 500, NO_STORE);
  }
}

export async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, ReminderSettingsSchema);
    if (!body.ok) {
      log.info("notifications.settings_bad_request", { reason: body.message });
      return fail("bad_request", "That setting isn't valid.", 400, NO_STORE);
    }
    const settings = await saveReminderSettings(user.id, body.data);
    if (settings === null) {
      log.info("notifications.settings_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    }
    const response: Omit<ReminderSettingsResponse, "ok"> = {
      ...settings,
      emailAvailable: emailConfigured(),
      chosen: true,
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("notifications.settings_save_failed", error);
    return fail("server_error", "Couldn't save your reminder settings. Please try again.", 500, NO_STORE);
  }
}
