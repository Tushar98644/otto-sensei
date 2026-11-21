import { safeNextPath } from "@/components/account/next-path";

// Layouts can't read the URL, so src/proxy.ts copies the asked-for path and query onto the request.
export const REQUEST_PATH_HEADER = "x-otto-path";

export function isWithin(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

// Set or removed on every request, so a browser can't pass its own; a path we'd never follow isn't copied.
export function setRequestPath(headers: Headers, url: { pathname: string; search: string }): void {
  const path = safeNextPath(`${url.pathname}${url.search}`, "");
  if (path) headers.set(REQUEST_PATH_HEADER, path);
  else headers.delete(REQUEST_PATH_HEADER);
}

export function requestedPathWithin(value: string | null | undefined, section: string): string {
  const path = safeNextPath(value, section);
  return isWithin(path.split(/[?#]/, 1)[0] ?? "", section) ? path : section;
}
