import { fail } from "@/lib/api/respond";
import { appUrl } from "@/lib/env";

// HTML forms can't send JSON, so requiring it blocks cross-site form posts without tokens.
export function rejectNonJson(req: Request): Response | null {
  const type = req.headers.get("content-type") ?? "";
  if (/^application\/json\b/i.test(type)) return null;
  return fail("unsupported_type", "Send the request as JSON.", 415);
}

// Neither Sec-Fetch-Site nor Origin (curl, servers) means no visitor's browser, so it passes.
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

function ownHosts(req: Request): Set<string> {
  const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const hosts = [forwarded, req.headers.get("host"), hostOf(req.url), hostOf(appUrl())];
  return new Set(hosts.filter((host): host is string => Boolean(host)).map((host) => host.toLowerCase()));
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase() || null;
  } catch {
    return null;
  }
}
