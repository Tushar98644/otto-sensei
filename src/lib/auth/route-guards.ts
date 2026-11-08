import { fail } from "@/lib/api/respond";
import { appUrl } from "@/lib/env";

// Server-only request guards for route handlers.

// HTML forms can't send application/json, so requiring it blocks cross-site form posts (login
// CSRF, code spam from a victim's browser) without tokens. A cross-origin fetch with this type
// needs a CORS preflight, which we never grant.
export function rejectNonJson(req: Request): Response | null {
  const type = req.headers.get("content-type") ?? "";
  if (/^application\/json\b/i.test(type)) return null;
  return fail("unsupported_type", "Send the request as JSON.", 415);
}

/**
 * For POST routes that can't require JSON (file uploads) or need no body (logout). Any website can
 * send those from a visitor's browser, as a form or a no-cors fetch: the response stays unreadable
 * to it, but the work still runs and Set-Cookie still lands, and our SameSite=Lax cookies don't
 * come along, so per-device limits never apply. Browsers say where a request came from in
 * Sec-Fetch-Site; older ones only send Origin, which must then name this host. Callers that send
 * neither, like curl and other servers, aren't a visitor's browser and pass.
 */
export function rejectCrossSite(req: Request): Response | null {
  const site = req.headers.get("sec-fetch-site");
  if (site !== null) return site === "cross-site" ? forbidden() : null;
  const origin = req.headers.get("origin");
  if (origin === null) return null;
  return ownHosts(req).has(hostOf(origin) ?? "") ? null : forbidden();
}

function forbidden(): Response {
  return fail("forbidden", "That request came from another website, so it wasn't allowed.", 403);
}

// The host the browser asked for, as each hop may report it, plus the configured public one.
function ownHosts(req: Request): Set<string> {
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hosts = [forwarded, req.headers.get("host"), hostOf(req.url), hostOf(appUrl())];
  return new Set(hosts.filter((host): host is string => Boolean(host)).map((host) => host.toLowerCase()));
}

// "null" (sandboxed frames, some redirects) and junk have no host.
function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase() || null;
  } catch {
    return null;
  }
}
