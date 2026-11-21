import { safeNextPath } from "@/components/account/next-path";
import { PORTFOLIO_ROUTE } from "@/components/portfolio/route";
import { ROUTES } from "@/components/site/routes";
import { PRO_TRIAL } from "@/config/plans";
import { isWithin } from "@/lib/request-path";

const BASE = "https://login.invalid";

// Names where the visitor was going, so the page says why it asks; `trial`: the Pro trial is on offer.
export function loginHeading(next: string | null | undefined, trial: boolean): string {
  const path = safeNextPath(next, "");
  if (!path) return "Sign in";
  const { pathname, searchParams } = new URL(path, BASE);
  if (searchParams.has("upgrade") || searchParams.has("plan")) {
    const plan = searchParams.get("plan") ?? PRO_TRIAL.plan;
    const interval = searchParams.get("interval") ?? PRO_TRIAL.interval;
    const trialPlan = plan === PRO_TRIAL.plan && interval === PRO_TRIAL.interval;
    return trial && trialPlan ? "Sign in to start your trial" : "Sign in to upgrade";
  }
  if (isWithin(pathname, ROUTES.dashboardJobs)) return "Sign in to see your job matches";
  if (isWithin(pathname, PORTFOLIO_ROUTE)) return "Sign in to make your portfolio";
  return "Sign in";
}
