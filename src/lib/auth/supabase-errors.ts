import { isAuthApiError, isAuthSessionMissingError, type AuthError } from "@supabase/supabase-js";

// Only "this visitor isn't signed in" may sign anyone out, never "Supabase itself is failing".

export function isSignedOutError(error: AuthError): boolean {
  if (isAuthSessionMissingError(error)) return true;
  // 4xx: a bad, expired or revoked token, or a deleted user. 429 is Supabase being busy.
  return isAuthApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 429;
}

// For logs: never the message, which can repeat the email address.
export function authErrorFields(error: AuthError): Record<string, string | number> {
  return { reason: error.code ?? error.name, status: error.status ?? 0 };
}
