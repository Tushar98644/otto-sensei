import {
  allowancePeriodFor,
  FEATURE_LABELS,
  nextPlan,
  PLANS,
  planLimits,
  type Feature,
  type UsagePeriod,
} from "@/config/plans";
import { fail } from "@/lib/api/respond";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import { retryAfterHeader } from "@/lib/rate-limit";
import { consumeUsage, refundUsage } from "@/lib/usage";
import { perPeriod, resetSentence, thisPeriod } from "@/lib/usage-copy";

// Server-only. The account side of the AI features that also work signed out (Build with Otto,
// GitHub drafts): a signed-in account spends its plan's allowance, the same way fixes and
// tailoring do, so two devices can't double it. Signed-out visitors stay on the per-device and
// per-network limits each route keeps for them.

export type AccountUnit = { giveBack: () => Promise<void> };

/** Takes one unit, or answers 429 limit_reached with the next plan up in the message. */
export async function takeAccountUnit(
  user: SessionUser,
  feature: Feature,
  now = Date.now(),
): Promise<AccountUnit | Response> {
  const { allowed, period } = await consumeUsage(user, feature, now);
  if (!allowed) return limitReached(user, feature, period, now);
  return { giveBack: () => refundUsage(user, feature, now) };
}

/** The 429 for a used-up allowance, retried once the period starts over. */
export function limitReached(
  user: SessionUser,
  feature: Feature,
  period: UsagePeriod,
  now: number,
): Response {
  log.info(`${feature}.limit_reached`, { plan: user.plan, period: period.kind });
  return fail(
    "limit_reached",
    limitMessage(user, feature, period),
    429,
    retryAfterHeader(Math.max(0, period.resetsAt - now)),
  );
}

// The next plan is quoted at the same billing interval, the one an upgrade from here would keep.
export function limitMessage(user: SessionUser, feature: Feature, period: UsagePeriod): string {
  const limit = planLimits(user.plan, period.kind)[feature];
  const next = nextPlan(user.plan);
  const nextPeriod = next ? allowancePeriodFor(next, user.planInterval) : period.kind;
  const more = next
    ? ` ${PLANS[next].name} has ${planLimits(next, nextPeriod)[feature]} ${perPeriod(nextPeriod)}.`
    : ` ${resetSentence(period, "UTC")}`;
  return `You've used ${thisPeriod(period)}'s ${limit} ${FEATURE_LABELS[feature]}.${more}`;
}
