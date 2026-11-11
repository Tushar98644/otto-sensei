import { appUrl } from "@/lib/env";

// Written exactly as Next writes canonical and og:url (home is the bare origin), so crawlers never
// see two spellings of one page.
export function absoluteUrl(path: string, base: string = appUrl()): string {
  if (path === "" || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
