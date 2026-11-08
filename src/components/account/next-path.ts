// Where to send someone after they sign in. Only paths on this site are allowed: anything else in
// ?next= would turn /login into an open redirect.

export const DEFAULT_NEXT_PATH = "/dashboard";

const MAX_LENGTH = 512;
// Never a real host (.invalid is reserved), only used to resolve the path the way a browser would.
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
  // Coming back to /login after signing in would just bounce again.
  if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

// A /login link that returns here afterwards, e.g. loginHref("/studio?step=fix").
export function loginHref(next?: string): string {
  const path = next ? safeNextPath(next, "") : "";
  return path ? `/login?next=${encodeURIComponent(path)}` : "/login";
}
