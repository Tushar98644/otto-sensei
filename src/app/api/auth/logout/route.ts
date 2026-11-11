import { fail, ok } from "@/lib/api/respond";
import type { EmptyOk } from "@/lib/api/types";
import { rejectCrossSite } from "@/lib/auth/route-guards";
import { clearSession } from "@/lib/auth/session";
import { log } from "@/lib/log";

export const runtime = "nodejs";

// JSON-only: another site's auto-submitted form could still sign people out via Set-Cookie.
export async function POST(req: Request): Promise<Response> {
  const crossSite = rejectCrossSite(req);
  if (crossSite) return crossSite;
  try {
    await clearSession();
    const response: Omit<EmptyOk, "ok"> = {};
    return ok(response);
  } catch (error) {
    log.error("auth.logout_failed", error);
    return fail("server_error", "Couldn't sign you out. Please try again.", 500);
  }
}
