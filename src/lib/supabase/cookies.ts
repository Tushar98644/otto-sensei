import type { CookieOptionsWithName } from "@supabase/ssr";
import { isProduction } from "@/lib/env";

const AUTH_COOKIE = /^sb-[a-z0-9-]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/;

export function isAuthCookie(name: string): boolean {
  return AUTH_COOKIE.test(name);
}

// httpOnly unlike the library default: Supabase runs only on our server, so XSS can't read it.
export function authCookieOptions(): CookieOptionsWithName {
  return { path: "/", sameSite: "lax", httpOnly: true, secure: isProduction() };
}
