import { safeNextPath } from "@/components/account/next-path";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { PRO_TRIAL } from "@/config/plans";
import { isWithin } from "@/lib/request-path";

const BASE = "https://login.invalid";

// The headings /login can open with besides "Sign in", each prerendered at /login/<variant> (see src/proxy.ts).
export const LOGIN_VARIANTS = ["trial", "upgrade", "jobs", "portfolio"] as const;
export type LoginVariant = (typeof LOGIN_VARIANTS)[number];

export function isLoginVariant(value: string): value is LoginVariant {
  return (LOGIN_VARIANTS as readonly string[]).includes(value);
}

// Where the visitor was going, so the page says why it asks; null for anything else or a next it wouldn't follow.
export function loginVariant(next: string | null | undefined): LoginVariant | null {
  const path = safeNextPath(next, "");
  if (!path) return null;
  const { pathname, searchParams } = new URL(path, BASE);
  if (searchParams.has("upgrade") || searchParams.has("plan")) {
    const plan = searchParams.get("plan") ?? PRO_TRIAL.plan;
    const interval = searchParams.get("interval") ?? PRO_TRIAL.interval;
    return plan === PRO_TRIAL.plan && interval === PRO_TRIAL.interval ? "trial" : "upgrade";
  }
  if (isWithin(pathname, ROUTES.dashboardJobs)) return "jobs";
  if (isWithin(pathname, PORTFOLIO_ROUTE)) return "portfolio";
  return null;
}

// `trial`: the Pro trial is on offer.
export function loginHeading(variant: LoginVariant | null, trial: boolean): string {
  switch (variant) {
    case "trial":
      return trial ? "Sign in to start your trial" : "Sign in to upgrade";
    case "upgrade":
      return "Sign in to upgrade";
    case "jobs":
      return "Sign in to see your job matches";
    case "portfolio":
      return "Sign in to make your portfolio";
    default:
      return "Sign in";
  }
}
