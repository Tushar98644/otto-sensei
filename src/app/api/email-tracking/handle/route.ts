import { fail, NO_STORE, ok } from "@/lib/api/respond";
import { getCurrentUser } from "@/lib/auth/session";
import { addressOf } from "@/lib/inbound/address";
import { addressShape } from "@/lib/inbound/config";
import { HANDLE_PROBLEMS, handleVariants, normalizeHandle } from "@/lib/inbound/handle";
import { checkHandle } from "@/lib/inbound/handles";
import type { HandleCheckResponse } from "@/lib/inbound/types";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader } from "@/lib/rate-limit";
import { HOUR_MS } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHECKS_PER_HOUR = 300;
const TAKEN = "Someone already has that one.";

// Whether a handle is free, as the person types. Signed in only, and counted, so it can't list who's here.
export async function GET(req: Request): Promise<Response> {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", "Sign in first.", 401, NO_STORE);
    const shape = addressShape();
    if (!shape) return fail("server_error", "Email tracking isn't available yet.", 503, NO_STORE);
    const limited = await rateLimit(`email-handle-check:user:${user.id}`, CHECKS_PER_HOUR, HOUR_MS);
    if (!limited.allowed) {
      return fail("rate_limited", "Too many checks. Try again soon.", 429, {
        ...NO_STORE,
        ...retryAfterHeader(limited.retryAfterMs),
      });
    }
    const handle = normalizeHandle(new URL(req.url).searchParams.get("h") ?? "").slice(0, 60);
    const check = await checkHandle(user.id, handle);
    const others: string[] = [];
    if (check.problem === "taken") {
      for (const candidate of handleVariants(handle, new Date().getUTCFullYear())) {
        if (others.length >= 3) break;
        if ((await checkHandle(user.id, candidate)).available) others.push(candidate);
      }
    }
    const response: Omit<HandleCheckResponse, "ok"> = {
      available: check.available,
      problem:
        check.problem === null
          ? null
          : check.problem === "taken"
            ? TAKEN
            : HANDLE_PROBLEMS[check.problem],
      handle,
      address: addressOf(handle, shape),
      others,
    };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    log.error("email_tracking.handle_check_failed", error);
    return fail("server_error", "Couldn't check that. Please try again.", 500, NO_STORE);
  }
}
