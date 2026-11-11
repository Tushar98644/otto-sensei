import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/env";
import { authCookieOptions, isAuthCookie } from "./cookies";

// Supabase's Next.js pattern: server components can't write cookies, so without this an expired
// access token would never be replaced during navigation. API routes refresh on their own lookup.

export type SessionUpdate = {
  response: NextResponse;
  // From a verified JWT: good enough to route on. getCurrentUser() still checks for revocation.
  signedIn: boolean;
};

export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  // Most visitors are signed out; they skip the client and any network call.
  if (!config || !request.cookies.getAll().some(({ name }) => isAuthCookie(name))) {
    return { response, signedIn: false };
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet, headers) {
        // The request copy is what this request reads; the response copy is what the browser keeps.
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        // A refreshed token must never sit in a shared cache.
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Nothing may run between creating the client and this call (Supabase's guide).
  const { data, error } = await supabase.auth.getClaims();
  return { response, signedIn: !error && Boolean(data?.claims.sub) };
}

export function redirectKeepingSession(from: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
