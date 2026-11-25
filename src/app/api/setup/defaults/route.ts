import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { rejectCrossSite, rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { saveSetupDefaults } from "@/lib/setup/records";
import { type SetupDefaultsResponse } from "@/lib/setup/types";
import { SetupDefaultsSchema } from "@/lib/setup/validation";
import { withApiLocale } from "@/lib/api/localize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGN_IN = "Sign in to keep your setup.";

// Any plan: it only fills blank settings once, and Free's job matches never read work rights.
export const POST = withApiLocale(async function POST(req: Request): Promise<Response> {
  const blocked = rejectCrossSite(req) ?? rejectNonJson(req);
  if (blocked) return blocked;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    const body = await readJson(req, SetupDefaultsSchema);
    if (!body.ok) {
      log.info("setup.defaults_bad_request", { reason: body.message });
      return fail("bad_request", "That change isn't valid.", 400, NO_STORE);
    }
    const result = await saveSetupDefaults(user.id, body.data);
    if (result.status === "no_user") {
      log.info("setup.defaults_after_account_deleted");
      return fail("unauthorized", SIGN_IN, 401, NO_STORE);
    }
    const response: Omit<SetupDefaultsResponse, "ok"> = { setup: result.setup, ...result.work };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("setup.defaults_failed", error);
    return fail("server_error", "Couldn't save that. Please try again.", 500, NO_STORE);
  }
});
