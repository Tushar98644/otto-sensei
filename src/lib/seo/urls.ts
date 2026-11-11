import { appUrl } from "@/lib/env";

export function absoluteUrl(path: string, base: string = appUrl()): string {
  if (path === "" || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
