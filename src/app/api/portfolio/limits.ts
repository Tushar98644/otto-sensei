import { limitHourlyWrites } from "@/lib/api/limits";
import { trialHeadline } from "@/lib/billing/prices";
import { PORTFOLIO_LIMITS } from "@/lib/portfolio/types";

export const SIGN_IN = "Sign in to make your portfolio.";
export const NO_PORTFOLIO = "You don't have a portfolio yet. Make one from a resume first.";
export const NEEDS_PLAN = `Portfolios come with Pro and Max. ${trialHeadline()} to build yours.`;

export function writeLimited(userId: string): Promise<Response | null> {
  return limitHourlyWrites(
    `portfolio:write:user:${userId}`,
    PORTFOLIO_LIMITS.writesPerHour,
    "portfolio changes",
  );
}
