import { NextResponse, type NextRequest } from "next/server";
import { DEV_SESSION_COOKIE, devAuthActive } from "@/lib/auth/dev-mode";
import { redirectKeepingSession, updateSession, type SessionUpdate } from "@/lib/supabase/proxy";

export const DASHBOARD_PATH = "/dashboard";

// Refreshes the Supabase session for every page and API call (see updateSession), and sends
// signed-in people from the sales page to their dashboard. That redirect trusts the verified JWT
// only: /dashboard checks the session with Supabase for real and clears dead cookies through
// /api/auth/expired, so a revoked session can't keep bouncing someone between pages.
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

// Skips build assets, the image optimizer, generated icons and share images, files in public/,
// the billing webhook (Creem signs it) and the scheduled jobs (Vercel Cron sends a bearer secret):
// neither ever has a session to refresh.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|api/billing/webhook|api/cron/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$).*)",
  ],
};
