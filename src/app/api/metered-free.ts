import {
  allowancePeriodFor,
  FEATURE_LABELS,
  nextPlan,
  PLANS,
  planIncludes,
  planLimits,
  type Feature,
  type UsagePeriod,
} from "@/config/plans";
import { checkAiBudget, spendAiTokens } from "@/lib/ai-budget";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { fail } from "@/lib/api/respond";
import type { SessionUser } from "@/lib/auth/types";
import { trialHeadline } from "@/lib/billing/prices";
import { log } from "@/lib/log";
import { retryAfterHeader } from "@/lib/rate-limit";
import { consumeUsage, refundUsage } from "@/lib/usage";
import { perPeriod, resetSentence, thisPeriod } from "@/lib/usage-copy";

export type AccountUnit = {
  giveBack: () => Promise<void>;
  spend: <T>(work: () => Promise<T>) => Promise<T>;
};

const COMES_WITH_PRO: Record<Feature, string> = {
  fix: "More line fixes and summaries come with Pro.",
  tailor: "Tailoring comes with Pro.",
  letter: "Cover letters, answers and interview prep come with Pro.",
  import: "AI reading of uploads comes with Pro.",
  draft: "Build with Otto comes with Pro.",
  github: "GitHub drafts come with Pro.",
};

export function upgradeRequired(user: SessionUser | null, feature: Feature): Response {
  log.info(`${feature}.upgrade_required`, { plan: user?.plan ?? "signed_out" });
  return fail("upgrade_required", `${COMES_WITH_PRO[feature]} ${trialHeadline()}.`, 402);
}

export function requirePlanFeature(user: SessionUser | null, feature: Feature): Response | null {
  return user && planIncludes(user.plan, feature) ? null : upgradeRequired(user, feature);
}

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
