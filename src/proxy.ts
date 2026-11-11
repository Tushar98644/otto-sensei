import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE, devAuthActive } from "@/lib/auth/dev-mode";
import { redirectKeepingSession, updateSession, type SessionUpdate } from "@/lib/supabase/proxy";

export const DASHBOARD_PATH = "/dashboard";

// Refreshes the Supabase session and sends signed-in visitors from / to /dashboard. The redirect
// trusts the JWT only; /dashboard verifies with Supabase and clears dead cookies, so no bounce
// loop.
export async function proxy(request: NextRequest) {
  const { response, signedIn } = devAuthActive() ? devSession(request) : await updateSession(request);
  if (signedIn && request.nextUrl.pathname === "/") {
    return redirectKeepingSession(response, new URL(DASHBOARD_PATH, request.url));
  }
  return response;
}

// Development's dev sign-in has nothing to refresh; its cookie is the same optimistic hint.
function devSession(request: NextRequest): SessionUpdate {
  return { response: NextResponse.next(), signedIn: Boolean(request.cookies.get(DEV_SESSION_COOKIE)?.value) };
}

// Skips assets, icons, public/ files and every API route: routes that read the session ask Supabase
// themselves and can write refreshed cookies, so a lookup here would double it.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?|ttf|otf)$).*)",
  ],
};
