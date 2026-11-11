import type { CookieOptionsWithName } from "@supabase/ssr";
import { isProduction } from "@/lib/env";

// "sb-<ref>-auth-token", chunked as ".0", ".1"… when long, plus "-code-verifier" during Google
// sign-in.

const AUTH_COOKIE = /^sb-[a-z0-9-]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/;

export function isAuthCookie(name: string): boolean {
  return AUTH_COOKIE.test(name);
}

// httpOnly, unlike the library default: every Supabase call runs on our server, so an XSS bug can't
// read the tokens. Supabase sets maxAge itself.
export function authCookieOptions(): CookieOptionsWithName {
  return { path: "/", sameSite: "lax", httpOnly: true, secure: isProduction() };
}
