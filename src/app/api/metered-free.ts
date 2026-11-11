import {
  allowancePeriodFor,
  FEATURE_LABELS,
  nextPlan,
  PLANS,
  planIncludes,
  planLimits,
  PRO_TRIAL,
  type Feature,
  type UsagePeriod,
} from "@/config/plans";
import { checkAiBudget, spendAiTokens } from "@/lib/ai-budget";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { fail } from "@/lib/api/respond";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import { retryAfterHeader } from "@/lib/rate-limit";
import { consumeUsage, refundUsage } from "@/lib/usage";
import { perPeriod, resetSentence, thisPeriod } from "@/lib/usage-copy";

// Server-only. How AI allowances answer. Free (and signed-out visitors) have no AI at all, so they
// get 402 upgrade_required, which the client turns into the trial prompt. Pro, Max and the trial
// spend their allowance, the same way on every AI route, so two devices can't double it.

export type AccountUnit = {
  giveBack: () => Promise<void>;
  // Runs the AI work and charges its tokens to the account's AI budget.
  spend: <T>(work: () => Promise<T>) => Promise<T>;
};

const COMES_WITH_PRO: Record<Feature, string> = {
  fix: "Line fixes and summaries come with Pro.",
  tailor: "Tailoring comes with Pro.",
  letter: "Cover letters, answers and interview prep come with Pro.",
  import: "AI reading of uploads comes with Pro.",
  draft: "Build with Otto comes with Pro.",
  github: "GitHub drafts come with Pro.",
};

/** The 402 for a feature the plan (or no account) doesn't include. */
export function upgradeRequired(user: SessionUser | null, feature: Feature): Response {
  log.info(`${feature}.upgrade_required`, { plan: user?.plan ?? "signed_out" });
  return fail(
    "upgrade_required",
    `${COMES_WITH_PRO[feature]} Try Pro free for ${PRO_TRIAL.days} days.`,
    402,
  );
}

/** The 402 when the plan has none of the feature, else null. */
export function requirePlanFeature(user: SessionUser | null, feature: Feature): Response | null {
  return user && planIncludes(user.plan, feature) ? null : upgradeRequired(user, feature);
}

/**
 * Takes one unit, or answers 402 (no such feature on the plan) or 429 limit_reached (the feature's
 * limit or the AI budget; a used-up budget takes no unit).
 */
export async function takeAccountUnit(
  user: SessionUser,
  feature: Feature,
  now = Date.now(),
): Promise<AccountUnit | Response> {
  const missing = requirePlanFeature(user, feature);
  if (missing) return missing;
  const budget = await checkAiBudget(user, now);
  if (!budget.allowed) return budgetReached(user, budget.period, now);
  const { allowed, period } = await consumeUsage(user, feature, now);
  if (!allowed) return limitReached(user, feature, period, now);
  return {
    giveBack: () => refundUsage(user, feature, now),
    spend: (work) => spendAiTokens(user, now, work),
  };
}

/** The 429 for a used-up AI budget, retried once the period starts over. */
export function budgetReached(user: SessionUser, period: UsagePeriod, now: number): Response {
  log.warn("ai_budget.reached", { plan: user.plan, period: period.kind });
  return fail(
    "limit_reached",
    budgetReachedText(period, "UTC"),
    429,
    retryAfterHeader(Math.max(0, period.resetsAt - now)),
    "ai_budget",
  );
}

/** The 429 for a used-up allowance, retried once the period starts over. */
export function limitReached(
  user: SessionUser,
  feature: Feature,
  period: UsagePeriod,
  now: number,
): Response {
  if (!planIncludes(user.plan, feature)) return upgradeRequired(user, feature);
  log.info(`${feature}.limit_reached`, { plan: user.plan, period: period.kind });
  return fail(
    "limit_reached",
    limitMessage(user, feature, period),
    429,
    retryAfterHeader(Math.max(0, period.resetsAt - now)),
  );
}

// The next plan is quoted at the same billing interval, the one an upgrade from here would keep.
// A trial is quoted what its own plan gives once the trial ends.
export function limitMessage(user: SessionUser, feature: Feature, period: UsagePeriod): string {
  const limit = planLimits(user.plan, period.kind)[feature];
  const used = `You've used ${thisPeriod(period)}'s ${limit} ${FEATURE_LABELS[feature]}.`;
  if (period.kind === "trial") {
    const monthly = planLimits(user.plan, "month")[feature];
    return `${used} ${PLANS[user.plan].name} has ${monthly} ${perPeriod("month")}. ${resetSentence(period, "UTC")}`;
  }
  const next = nextPlan(user.plan);
  const nextPeriod = next ? allowancePeriodFor(next, user.planInterval) : period.kind;
  const more = next
    ? ` ${PLANS[next].name} has ${planLimits(next, nextPeriod)[feature]} ${perPeriod(nextPeriod)}.`
    : ` ${resetSentence(period, "UTC")}`;
  return `${used}${more}`;
}
