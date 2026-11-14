import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { log } from "@/lib/log";
import { mePayload } from "./payload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return ok(await mePayload(await getCurrentUser()), { headers: NO_STORE });
  } catch (error) {
    log.error("me.failed", error);
    return fail("server_error", "Couldn't load your account. Please try again.", 500, NO_STORE);
  }
}
