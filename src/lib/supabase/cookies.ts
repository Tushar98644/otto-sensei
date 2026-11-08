import type { CookieOptionsWithName } from "@supabase/ssr";
import { isProduction } from "@/lib/env";

// Server-only. Supabase keeps the session in "sb-<project-ref>-auth-token" cookies, split into
// ".0", ".1"... chunks when long, plus "-code-verifier" during Google sign-in.

const AUTH_COOKIE = /^sb-[a-z0-9-]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/;

export function isAuthCookie(name: string): boolean {
  return AUTH_COOKIE.test(name);
}

/**
 * httpOnly, unlike the library default: every Supabase call runs on our server, so no script ever
 * needs the tokens, and an XSS bug then can't read them. Supabase fixes maxAge itself (400 days,
 * renewed on every token refresh).
 */
export function authCookieOptions(): CookieOptionsWithName {
  return { path: "/", sameSite: "lax", httpOnly: true, secure: isProduction() };
}
