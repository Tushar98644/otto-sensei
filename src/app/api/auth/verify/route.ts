import { fail, ok } from "@/lib/api/respond";
import { VerifyCodeSchema, type VerifyCodeResponse } from "@/lib/api/types";
import { AuthError, normalizeEmail, verifyLoginCode } from "@/lib/auth/codes";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { clientIp, readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";

export const runtime = "nodejs";

const HOUR_MS = 60 * 60 * 1000;
// Supabase doesn't lock a code after a few wrong tries, so these do: one IP spraying guesses
// across many inboxes, and many IPs guessing at one inbox (two codes' worth of typos an hour).
// Real sign-ins never come close to either.
const VERIFY_PER_IP_PER_HOUR = 30;
const VERIFY_PER_EMAIL_PER_HOUR = 10;
// Responses that set session cookies must never be stored by a shared cache.
const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(req: Request): Promise<Response> {
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  const body = await readJson(req, VerifyCodeSchema);
  if (!body.ok) return fail("bad_request", "Enter the 6-digit code from the email.", 400);

  try {
    const [byIp, byEmail] = await Promise.all([
      rateLimit(`verify:ip:${clientIp(req)}`, VERIFY_PER_IP_PER_HOUR, HOUR_MS),
      rateLimit(`verify:email:${normalizeEmail(body.data.email)}`, VERIFY_PER_EMAIL_PER_HOUR, HOUR_MS),
    ]);
    if (!byIp.allowed || !byEmail.allowed) {
      const retryAfterMs = Math.max(byIp.retryAfterMs, byEmail.retryAfterMs);
      return fail(
        "rate_limited",
        `Too many tries. Try again in ${waitText(retryAfterMs)}.`,
        429,
        retryAfterHeader(retryAfterMs),
      );
    }
    const user = await verifyLoginCode(body.data.email, body.data.code);
    const response: Omit<VerifyCodeResponse, "ok"> = { user };
    return ok(response, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AuthError) {
      log.info("auth.code_rejected", { reason: error.code });
      if (error.code === "not_configured") return fail("auth_unavailable", error.message, 503);
      if (error.code === "rate_limited") {
        return fail("rate_limited", error.message, 429, retryAfterHeader(error.retryAfterMs ?? 60_000));
      }
      return fail("bad_request", error.message, 400);
    }
    log.error("auth.verify_failed", error);
    return fail("server_error", "Something went wrong. Please try again.", 500);
  }
}
