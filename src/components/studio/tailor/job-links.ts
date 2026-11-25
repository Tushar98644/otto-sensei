import { ROUTES } from "@/components/site/routes";
import { normalizeJobUrl } from "@/lib/applications/schema";

export const JOB_PARAM = "job";

// The same sites lib/jobs/url.ts refuses on the server, which this browser code can't import.
const CLOSED_SITES: Record<string, string> = {
  linkedin: "LinkedIn",
  lnkd: "LinkedIn",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
};

function webUrl(link: string): URL | null {
  const value = link.trim();
  if (/\s/.test(value)) return null;
  const href = normalizeJobUrl(value);
  return href ? new URL(href) : null;
}

export function closedSite(link: string): string | null {
  const host = webUrl(link)?.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) return null;
  for (const label of host.split(".").slice(0, -1)) {
    const site = CLOSED_SITES[label];
    if (site) return site;
  }
  return null;
}

export function looksLikeLink(text: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(text.trim()) && webUrl(text) !== null;
}

// Only web links: anything else in ?job= is dropped instead of being read.
export function jobLinkParam(value: string | null): string | null {
  return value === null ? null : (webUrl(value)?.href ?? null);
}

function originOf(link: string): string | null {
  try {
    return new URL(link).origin;
  } catch {
    return null;
  }
}

// The email code moves /login to its ?next= inside the page, which would pass a crafted sign-in link off as a move in the app.
function sentByLogin(first: URL, current: URL, param: string): boolean {
  const next = first.pathname === ROUTES.login ? first.searchParams.get("next") : null;
  if (!next) return false;
  try {
    const target = new URL(next, current);
    return target.pathname === current.pathname && target.searchParams.get(JOB_PARAM) === param;
  } catch {
    return true;
  }
}

export type Arrival = { here: string; loaded: string | null; referrer: string; param: string };

// A ?job= link opened from another site reads the post but waits for a press, so it can't spend a tailored version.
export function arrivedFromApp({ here, loaded, referrer, param }: Arrival): boolean {
  const current = new URL(here);
  const first = loaded ? new URL(loaded, here) : null;
  const pageLoad =
    first === null ||
    (first.pathname === current.pathname && first.searchParams.get(JOB_PARAM) === param);
  if (!pageLoad) return first !== null && !sentByLogin(first, current, param);
  return originOf(referrer) === current.origin;
}
