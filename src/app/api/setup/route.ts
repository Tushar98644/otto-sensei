import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { readAccountSetup, saveAccountSetup } from "@/lib/setup/records";
import { type AccountSetupResponse } from "@/lib/setup/types";
import { AccountSetupChangeSchema } from "@/lib/setup/validation";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to keep your setup.";

export const GET = withApiLocale(async function GET(): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const response: Omit<AccountSetupResponse, "ok"> = { setup: await readAccountSetup(user.id) };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("setup.read_failed", error);
    return fail("server_error", "Couldn't load your setup. Please try again.", 500, NO_STORE);
  }
});

export const PUT = withApiLocale(async function PUT(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, AccountSetupChangeSchema);
    if (!body.ok) {
      log.info("setup.bad_request", { reason: body.message });
      return fail("bad_request", "That change isn't valid.", 400, NO_STORE);
    }
    const result = await saveAccountSetup(user.id, body.data);
    if (result.status === "no_user") {
      log.info("setup.write_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    }
    const response: Omit<AccountSetupResponse, "ok"> = { setup: result.setup };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("setup.save_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
});
