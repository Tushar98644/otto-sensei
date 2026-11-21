import { ROUTES } from "@/components/site/routes";
import { safeNextPath } from "./next-path";

// The upgrade finishes on Account, and there is nothing to pick up again on these.
const NOT_A_RETURN = [
  ROUTES.account,
  ROUTES.dashboardAccount,
  ROUTES.pricing,
  ROUTES.login,
  "/api",
  "/auth",
];

export function upgradeReturnPath(value: string | null | undefined): string | null {
  const path = safeNextPath(value, "");
  // Dot segments can resolve "/.//host" to "//host", which a browser reads as another site.
  if (!path || path.startsWith("//")) return null;
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  if (pathname === ROUTES.home) return null;
  const blocked = NOT_A_RETURN.some((root) => pathname === root || pathname.startsWith(`${root}/`));
  return blocked ? null : path;
}

export function returnPathHere(): string | null {
  if (typeof window === "undefined") return null;
  const { pathname, search, hash } = window.location;
  return upgradeReturnPath(`${pathname}${search}${hash}`);
}
