import { NextResponse, type NextRequest } from "next/server";
import { loginVariant } from "@/components/account/login-heading";
import { loginHref } from "@/components/account/next-path";
import { ROUTES } from "@/components/site/routes";
import { DEV_SESSION_COOKIE, devAuthActive } from "@/lib/auth/dev-mode";
import { isWithin, requestedPathWithin, setRequestPath } from "@/lib/request-path";
import { isAuthCookie } from "@/lib/supabase/cookies";
import {
  redirectKeepingSession,
  rewriteKeepingSession,
  updateSession,
  type SessionUpdate,
} from "@/lib/supabase/proxy";

export const DASHBOARD_PATH = "/dashboard";

// The redirect trusts the JWT only; /dashboard verifies it and clears dead cookies (no loop).
export async function proxy(request: NextRequest) {
  // The dashboard layout sends a signed-out visitor to sign in, then back to this exact page.
  setRequestPath(request.headers, request.nextUrl);
  const dev = devAuthActive();
  if (isWithin(request.nextUrl.pathname, DASHBOARD_PATH) && !hasSessionCookie(request, dev)) {
    // No cookie to clear, so sign-in comes at once instead of after the dashboard and /api/auth/expired.
    const { pathname, search } = request.nextUrl;
    const next = requestedPathWithin(`${pathname}${search}`, DASHBOARD_PATH);
    return NextResponse.redirect(new URL(loginHref(next), request.url));
  }
  const { response, signedIn } = dev ? devSession(request) : await updateSession(request);
  if (signedIn && request.nextUrl.pathname === "/") {
    return redirectKeepingSession(response, new URL(DASHBOARD_PATH, request.url));
  }
  // /login is static; a next that names why it asks gets that heading's own static page, at the same address.
  const variant =
    request.nextUrl.pathname === ROUTES.login
      ? loginVariant(request.nextUrl.searchParams.get("next"))
      : null;
  if (variant) {
    const page = new URL(`${ROUTES.login}/${variant}${request.nextUrl.search}`, request.url);
    return rewriteKeepingSession(response, request, page);
  }
  return response;
}

function hasSessionCookie(request: NextRequest, dev: boolean): boolean {
  if (dev) return Boolean(request.cookies.get(DEV_SESSION_COOKIE)?.value);
  return request.cookies
    .getAll()
    .some(({ name }) => isAuthCookie(name) && !name.includes("-code-verifier"));
}

function devSession(request: NextRequest): SessionUpdate {
  return {
    response: NextResponse.next({ request }),
    signedIn: Boolean(request.cookies.get(DEV_SESSION_COOKIE)?.value),
  };
}

// API routes refresh the session themselves; refreshing here too would double it. Portfolios (/p/) never read it.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icon|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|api/|p/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?|ttf|otf)$).*)",
  ],
};
