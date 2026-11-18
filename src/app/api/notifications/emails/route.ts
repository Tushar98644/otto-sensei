import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { readEmailChoices, saveEmailChoices } from "@/lib/notifications/choices";
import { emailConfigured } from "@/lib/notifications/email";
import type { EmailChoices, EmailChoicesResponse } from "@/lib/notifications/types";
import { EmailChoicesSchema } from "@/lib/notifications/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to change your emails.";

function reply(choices: EmailChoices): Response {
  const body: Omit<EmailChoicesResponse, "ok"> = { ...choices, emailAvailable: emailConfigured() };
  return ok(body, { headers: NO_STORE });
}

export async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const choices = await readEmailChoices(user.id);
    if (choices === null) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    return reply(choices);
  } catch (error) {
    log.error("notifications.emails_read_failed", error);
    return fail(
      "server_error",
      "Couldn't load your email settings. Please try again.",
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
    const body = await readJson(req, EmailChoicesSchema);
    if (!body.ok) {
      log.info("notifications.emails_bad_request", { reason: body.message });
      return fail("bad_request", "That setting isn't valid.", 400, NO_STORE);
    }
    const choices = await saveEmailChoices(user.id, body.data);
    if (choices === null) {
      log.info("notifications.emails_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    }
    log.info("notifications.emails_saved", {
      jobEmails: body.data.jobEmails ?? null,
      tipEmails: body.data.tipEmails ?? null,
      promptClosed: body.data.jobPromptClosed === true,
    });
    return reply(choices);
  } catch (error) {
    log.error("notifications.emails_save_failed", error);
    return fail(
      "server_error",
      "Couldn't save your email settings. Please try again.",
      500,
      NO_STORE,
    );
  }
}
