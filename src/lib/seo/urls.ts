import { appUrl } from "@/lib/env";

/**
 * A site path as an absolute address, written exactly as Next writes canonical and og:url tags
 * from metadataBase: the home page is the bare origin, with no trailing slash. The sitemaps and the
 * structured data use this, so no crawler ever sees two spellings of one page.
 */
export function absoluteUrl(path: string, base: string = appUrl()): string {
  if (path === "" || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
