import type { z } from "zod";
import type { Feature } from "@/config/plans";
import { checkAiBudget, spendAiTokens } from "@/lib/ai-budget";
import { AIError, type AIErrorCode } from "@/lib/ai/types";
import { trackMeteredCall } from "@/lib/analytics/ai";
import { fail, ok } from "@/lib/api/respond";
import type { ApiErrorCode } from "@/lib/api/types";
import { rejectNonJson } from "@/lib/auth/route-guards";
import { getCurrentUser } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { aiEnabled } from "@/lib/env";
import { readJson } from "@/lib/http";
import { log } from "@/lib/log";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { DAY_MS, MINUTE_MS } from "@/lib/time";
import { consumeUsage, refundUsage } from "@/lib/usage";
import { budgetReached, limitReached, requirePlanFeature } from "../metered-free";

// Order matters: sign-in, plan, burst limit, validation, AI budget, allowance, then the call. A
// failed call gives its unit back, within a daily cap for failures that may have been billed.

export type MeteredCopy = {
  signIn: string;
  invalid: string;
  refused: string;
  tooLong: string;
};

export type MeteredRoute<S extends z.ZodType, R> = {
  feature: Feature;
  schema: S;
  copy: MeteredCopy;
  run: (input: z.output<S>) => Promise<R>;
};

// Every call keeps the model busy for seconds, so people clicking through the studio stay far
// below these. This only stops a script from draining the API quota every customer shares.
const CALLS_PER_MINUTE: Record<Feature, number> = {
  fix: 30,
  tailor: 10,
  letter: 10,
  import: 10,
  draft: 10,
  github: 10,
};

// Nothing ran on the model for these (input checks, the provider turning the call away), so they
// cost nothing and their unit always comes back.
const UNBILLED_FAILURES: ReadonlySet<AIErrorCode> = new Set<AIErrorCode>(["too_long", "rate_limited"]);
// Other failures may still have been billed. Refunding all of them would let input written to
// fail run billed calls for free, so only a few a day per feature come back.
const BILLED_REFUNDS_PER_DAY = 3;

const AI_UNAVAILABLE = "Otto couldn't finish that right now. Try again in a minute.";
const NOT_COUNTED = " It won't count against your allowance.";

const AI_FAILURES: Record<
  AIErrorCode,
  { code: ApiErrorCode; status: number; message: (copy: MeteredCopy, refunded: boolean) => string }
> = {
  refused: { code: "ai_refused", status: 422, message: (copy) => copy.refused },
  too_long: { code: "bad_request", status: 400, message: (copy) => copy.tooLong },
  rate_limited: { code: "ai_unavailable", status: 502, message: unavailableMessage },
  unavailable: { code: "ai_unavailable", status: 502, message: unavailableMessage },
  invalid_output: { code: "ai_unavailable", status: 502, message: unavailableMessage },
};

function unavailableMessage(_copy: MeteredCopy, refunded: boolean): string {
  return refunded ? AI_UNAVAILABLE + NOT_COUNTED : AI_UNAVAILABLE;
}

// demo is true with no AI key: fixBullet() and tailorResume() then answer with sample output the
// UI must label.
export async function runMetered<S extends z.ZodType, R>(
  req: Request,
  route: MeteredRoute<S, R>,
): Promise<Response> {
  const { feature, copy } = route;
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  try {
    const user = await getCurrentUser();
    if (!user) return fail("unauthorized", copy.signIn, 401);
    const missing = requirePlanFeature(user, feature);
    if (missing) return missing;

    const burst = await rateLimit(`${feature}:user:${user.id}`, CALLS_PER_MINUTE[feature], MINUTE_MS);
    if (!burst.allowed) {
      log.warn(`${feature}.burst_limited`, { plan: user.plan });
      return fail(
        "rate_limited",
        `That's a lot at once. Try again in ${waitText(burst.retryAfterMs)}.`,
        429,
        retryAfterHeader(burst.retryAfterMs),
      );
    }

    const body = await readJson(req, route.schema);
    if (!body.ok) {
      // readJson names the field and the rule it broke, never the value.
      log.info(`${feature}.bad_request`, { reason: body.message });
      return fail("bad_request", copy.invalid, 400);
    }

    const now = Date.now();
    const budget = await checkAiBudget(user, now);
    if (!budget.allowed) return budgetReached(user, budget.period, now);
    const { allowed, usage, period } = await consumeUsage(user, feature, now);
    if (!allowed) return limitReached(user, feature, period, now);

    const call = { userId: user.id, path: new URL(req.url).pathname, feature, startedAt: Date.now() };
    try {
      const result = await spendAiTokens(user, now, () => route.run(body.data));
      trackMeteredCall(call);
      return ok({ result, usage, demo: !aiEnabled() });
    } catch (error) {
      trackMeteredCall(call, error);
      const refunded = await refund(user, feature, now, error);
      if (!(error instanceof AIError)) throw error;
      log.warn(`${feature}.ai_failed`, { code: error.code, refunded });
      const failure = AI_FAILURES[error.code];
      return fail(failure.code, failure.message(copy, refunded), failure.status);
    }
  } catch (error) {
    log.error(`${feature}.failed`, error);
    return fail("server_error", "Something went wrong. Please try again.", 500);
  }
}

// Resolves whether the unit came back. A lost refund costs the person one unit; it mustn't also
// turn their AI error into a 500.
async function refund(user: SessionUser, feature: Feature, now: number, cause: unknown): Promise<boolean> {
  try {
    if (!(cause instanceof AIError && UNBILLED_FAILURES.has(cause.code))) {
      const cap = await rateLimit(`refund:${feature}:user:${user.id}`, BILLED_REFUNDS_PER_DAY, DAY_MS, now);
      if (!cap.allowed) {
        log.warn(`${feature}.refund_capped`, { plan: user.plan });
        return false;
      }
    }
    await refundUsage(user, feature, now);
    return true;
  } catch (error) {
    log.error("usage.refund_failed", error, { feature, userId: user.id });
    return false;
  }
}
