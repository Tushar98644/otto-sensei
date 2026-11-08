import { isAuthApiError, type AuthError as SupabaseAuthError } from "@supabase/supabase-js";
import { EMAIL_LIMITS, IP_LIMITS } from "@/config/plans";
import { log, maskEmail } from "@/lib/log";
import { rateLimit, waitText } from "@/lib/rate-limit";
import { createSupabaseServerClient, type ServerSupabase } from "@/lib/supabase/server";
import { ensureUser, toSessionUser } from "@/lib/users";
import { DevCodeError, requestDevCode, verifyDevCode } from "./dev";
import { devAuthActive } from "./dev-mode";
import { normalizeEmail } from "./policy";
import { authErrorFields } from "./supabase-errors";
import type { SessionUser } from "./types";

// Server-only. Email one-time codes through Supabase Auth: it generates, emails (over our Resend
// SMTP) and checks the 6-digit code, and sets the session cookies. We add per-address and per-IP
// limits on top, so nobody can use the sign-in form to mail-bomb an inbox or drain the SMTP quota.
// In development the same functions use ./dev instead: the code comes back as devCode.

export { normalizeEmail } from "./policy";

export type AuthErrorCode =
  | "invalid_code"
  | "invalid_email"
  | "rate_limited"
  // Supabase isn't configured, or its email sign-in is switched off.
  | "not_configured"
  // requestLoginCode only: Supabase or its SMTP provider failed to send.
  | "email_send_failed";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  // Set for "rate_limited" so the route can send Retry-After.
  readonly retryAfterMs?: number;

  constructor(code: AuthErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

const HOUR_MS = 60 * 60 * 1000;
// Supabase's own floor between two codes for one address (Auth > Rate Limits), 60s by default.
const SUPABASE_RESEND_WAIT_MS = 60_000;

export const AUTH_MESSAGES = {
  not_configured: "Sign-in isn't set up yet. Please try again later.",
  invalid_code: "That code didn't work or has expired. Check the email or ask for a new one.",
  invalid_email: "Enter a valid email address.",
  email_send_failed: "We couldn't send the email. Try again in a minute.",
  wait: "Please wait a minute before asking for another code.",
} as const;

async function requireSupabase(): Promise<ServerSupabase> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new AuthError("not_configured", AUTH_MESSAGES.not_configured);
  return supabase;
}

// Codes Supabase uses when email sign-in is off or can't create accounts: a setup problem.
const SETUP_ERRORS: ReadonlySet<string> = new Set(["otp_disabled", "email_provider_disabled", "signup_disabled"]);
const RATE_ERRORS: ReadonlySet<string> = new Set(["over_email_send_rate_limit", "over_request_rate_limit"]);

function sendFailure(error: SupabaseAuthError): AuthError {
  if (error.status === 429 || RATE_ERRORS.has(error.code ?? "")) {
    return new AuthError("rate_limited", AUTH_MESSAGES.wait, SUPABASE_RESEND_WAIT_MS);
  }
  if (SETUP_ERRORS.has(error.code ?? "")) {
    log.error("auth.email_signin_disabled", error.code ?? "unknown", authErrorFields(error));
    return new AuthError("not_configured", AUTH_MESSAGES.not_configured);
  }
  if (error.code === "email_address_invalid" || error.code === "validation_failed") {
    return new AuthError("invalid_email", AUTH_MESSAGES.invalid_email);
  }
  // Includes email_address_not_authorized: Supabase's built-in mailer only reaches the project's
  // team, which means custom SMTP (Resend) isn't set up yet.
  log.warn("auth.code_send_failed", authErrorFields(error));
  return new AuthError("email_send_failed", AUTH_MESSAGES.email_send_failed);
}

/**
 * Rate-limits by email (EMAIL_LIMITS) and IP (IP_LIMITS), then asks Supabase to email a code,
 * creating the auth user on first use. Failed sends still count against our limits. Throws
 * AuthError("rate_limited" | "not_configured" | "invalid_email" | "email_send_failed"). Returns
 * { devCode } only in development's dev sign-in, where no email is sent.
 *
 * Never looks the address up, so the response is the same with or without an account.
 */
export async function requestLoginCode(
  email: string,
  ip: string,
  now = Date.now(),
): Promise<{ devCode?: string }> {
  const address = normalizeEmail(email);
  const supabase = devAuthActive() ? null : await requireSupabase();
  const [byEmail, byIp] = await Promise.all([
    rateLimit(`code:email:${address}`, EMAIL_LIMITS.loginCodesPerHour, HOUR_MS, now),
    rateLimit(`code:ip:${ip}`, IP_LIMITS.loginCodesPerHour, HOUR_MS, now),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    const retryAfterMs = Math.max(byEmail.retryAfterMs, byIp.retryAfterMs);
    log.warn("auth.code_rate_limited", { limit: byEmail.allowed ? "ip" : "email" });
    throw new AuthError(
      "rate_limited",
      `Too many codes requested. Try again in ${waitText(retryAfterMs)}.`,
      retryAfterMs,
    );
  }

  if (!supabase) return { devCode: await requestDevCode(address, now) };
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: true },
  });
  if (error) throw sendFailure(error);
  log.info("auth.code_sent", { to: maskEmail(address) });
  return {};
}

/**
 * Checks the code with Supabase, which sets the session cookies on success, then returns our user
 * (created free on first sign-in). Throws AuthError("invalid_code" | "rate_limited" |
 * "not_configured"); anything else (Supabase down) is rethrown for a 500.
 */
export async function verifyLoginCode(email: string, code: string, now = Date.now()): Promise<SessionUser> {
  const address = normalizeEmail(email);
  if (devAuthActive()) {
    try {
      return await verifyDevCode(address, code, now);
    } catch (error) {
      if (error instanceof DevCodeError) throw new AuthError("invalid_code", error.message);
      throw error;
    }
  }
  const supabase = await requireSupabase();
  const { data, error } = await supabase.auth.verifyOtp({ email: address, token: code, type: "email" });
  if (error) {
    if (error.status === 429) throw new AuthError("rate_limited", AUTH_MESSAGES.wait, SUPABASE_RESEND_WAIT_MS);
    // otp_expired covers both wrong and expired codes: Supabase doesn't say which.
    if (isAuthApiError(error) && error.status >= 400 && error.status < 500) {
      throw new AuthError("invalid_code", AUTH_MESSAGES.invalid_code);
    }
    throw new Error("Supabase couldn't check the code", { cause: error });
  }
  const user = data.user;
  if (!user?.email) throw new Error("verifyOtp succeeded without a user");
  return toSessionUser(await ensureUser({ id: user.id, email: user.email }, now));
}
