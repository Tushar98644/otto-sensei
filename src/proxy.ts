import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE, devAuthActive } from "@/lib/auth/dev-mode";
import { redirectKeepingSession, updateSession, type SessionUpdate } from "@/lib/supabase/proxy";

export const DASHBOARD_PATH = "/dashboard";

// The redirect trusts the JWT only; /dashboard verifies it and clears dead cookies (no loop).
export async function proxy(request: NextRequest) {
  const { response, signedIn } = devAuthActive() ? devSession(request) : await updateSession(request);
  if (signedIn && request.nextUrl.pathname === "/") {
    return redirectKeepingSession(response, new URL(DASHBOARD_PATH, request.url));
  }
  return response;
}

function devSession(request: NextRequest): SessionUpdate {
  return { response: NextResponse.next(), signedIn: Boolean(request.cookies.get(DEV_SESSION_COOKIE)?.value) };
}

// API routes refresh the session themselves; refreshing here too would double it.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?|ttf|otf)$).*)",
  ],
};
