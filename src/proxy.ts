import { NextResponse, type NextRequest } from "next/server";
import { loginVariant } from "@/components/account/login-heading";
import { loginHref } from "@/components/account/next-path";
import { ROUTES } from "@/components/site/routes";
import {
  internalPath,
  LOCALE_COOKIE,
  localeCookieOptions,
  routeLocale,
  type LocaleRoute,
} from "@/i18n/routing";
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
  // Locale first; everything after it sees the path the visitor sees, without a locale prefix.
  const route = routeLocale(request.nextUrl.pathname, request.cookies.get(LOCALE_COOKIE)?.value);
  if (route.action === "redirect") return localeRedirect(request, route);
  const pathname = route.action === "serve" ? route.pathname : request.nextUrl.pathname;
  // The dashboard layout sends a signed-out visitor to sign in, then back to this exact page.
  setRequestPath(request.headers, request.nextUrl);
  const dev = devAuthActive();
  if (isWithin(pathname, DASHBOARD_PATH) && !hasSessionCookie(request, dev)) {
    // No cookie to clear, so sign-in comes at once instead of after the dashboard and /api/auth/expired.
    const next = requestedPathWithin(`${pathname}${request.nextUrl.search}`, DASHBOARD_PATH);
    return NextResponse.redirect(new URL(loginHref(next), request.url));
  }
  const { response, signedIn } = dev ? devSession(request) : await updateSession(request);
  if (signedIn && pathname === "/") {
    return redirectKeepingSession(response, new URL(DASHBOARD_PATH, request.url));
  }
  if (route.action === "pass") return response;
  // /login is static; a next that names why it asks gets that heading's own static page, at the same address.
  const variant =
    pathname === ROUTES.login ? loginVariant(request.nextUrl.searchParams.get("next")) : null;
  const page = internalPath(route.locale, variant ? `${ROUTES.login}/${variant}` : pathname);
  if (page === request.nextUrl.pathname) return response;
  return rewriteKeepingSession(
    response,
    request,
    new URL(`${page}${request.nextUrl.search}`, request.url),
  );
}

function localeRedirect(
  request: NextRequest,
  route: Extract<LocaleRoute, { action: "redirect" }>,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = route.pathname;
  const response = NextResponse.redirect(url, route.status);
  if (route.cookie) response.cookies.set(LOCALE_COOKIE, route.cookie, localeCookieOptions());
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
