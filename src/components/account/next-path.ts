// Only paths on this site: anything else in ?next= would turn /login into an open redirect.

export const DEFAULT_NEXT_PATH = "/dashboard";

const MAX_LENGTH = 512;
// .invalid is reserved, so this base is never a real host.
const BASE = "https://next.invalid";

export function safeNextPath(
  value: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH,
): string {
  if (!value || value.length > MAX_LENGTH) return fallback;
  // "//host" and "/\host" are both read by browsers as a link to another site.
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;

  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return fallback;
  }
  // Catches tricks the checks above miss, e.g. "/\t/host": browsers drop the tab and see "//host".
  if (url.origin !== BASE) return fallback;
  // Dot segments can collapse to "//host" ("/.//host", "/x/..//host"), which browsers read as another site.
  if (url.pathname.startsWith("//") || url.pathname.startsWith("/\\")) return fallback;
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

export function loginHref(next?: string): string {
  const path = next ? safeNextPath(next, "") : "";
  return path ? `/login?next=${encodeURIComponent(path)}` : "/login";
}

// The server never sees #section, so after a redirect to /login it lives only in the login page's own URL.
export function withPageHash(path: string, hash: string): string {
  if (!hash || hash === "#" || path.includes("#")) return path;
  return safeNextPath(`${path}${hash}`, path);
}
