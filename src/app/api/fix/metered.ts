import type { z } from "zod";
import type { Feature, UsageSnapshot } from "@/config/plans";
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
import {
  claimRun,
  dropRun,
  isResume,
  readRequestId,
  requestKey,
  saveResult,
} from "@/lib/metered-results";
import { rateLimit, retryAfterHeader, waitText } from "@/lib/rate-limit";
import { DAY_MS, MINUTE_MS } from "@/lib/time";
import type { CreditNote } from "@/lib/api/types";
import { getUsage } from "@/lib/usage";
import { creditField, takeUnitOrCredit } from "@/lib/usage-credit";
import { openPass, returnPass, takePass } from "@/lib/usage-passes";
import { budgetReached, limitReached, requirePlanFeature } from "../metered-free";

// Order matters: sign-in, plan, burst limit, validation, nothing to do, stored result, AI budget, allowance or credit, then the call.

export type MeteredCopy = {
  signIn: string;
  invalid: string;
  refused: string;
  tooLong: string;
};

export type FollowUp<I, R> = {
  subject: (input: I) => string;
  isFollowUp: (input: I) => boolean;
  opensPass: (result: R) => boolean;
};

export type MeteredRoute<S extends z.ZodType, R> = {
  feature: Feature;
  schema: S;
  copy: MeteredCopy;
  run: (input: z.output<S>, user: SessionUser) => Promise<R>;
  // The answer for input with nothing to work on, given without a call or a unit.
  nothingToDo?: (input: z.output<S>, user: SessionUser) => R | null | Promise<R | null>;
  // Calls that ride on the unit an earlier call on the same subject took, like answers to Otto's questions.
  followUp?: FollowUp<z.output<S>, R>;
};

type Unit = {
  usage: UsageSnapshot;
  giveBack: () => Promise<void>;
  opensPass: (() => Promise<void>) | null;
  credit: CreditNote | null;
};

const CALLS_PER_MINUTE: Record<Feature, number> = {
  fix: 30,
  tailor: 10,
  letter: 10,
  import: 10,
  draft: 10,
  github: 10,
};

const UNBILLED_FAILURES: ReadonlySet<AIErrorCode> = new Set<AIErrorCode>([
  "too_long",
  "rate_limited",
]);
// Failures may still be billed; refunding all would let crafted input run free calls.
const BILLED_REFUNDS_PER_DAY = 3;

const AI_UNAVAILABLE = "Otto couldn't finish that right now. Try again in a minute.";
const NOT_COUNTED = " It won't count against your allowance.";
const STILL_RUNNING = "Otto is still working on this. Try again in a minute.";
const NOTHING_TO_RESUME = "There's nothing to pick up for this one. Start it again.";

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

// currentUser: the session by default; Otto for Chrome's token routes pass the token's account.
export async function runMetered<S extends z.ZodType, R>(
  req: Request,
  route: MeteredRoute<S, R>,
  currentUser: () => Promise<SessionUser | null> = getCurrentUser,
): Promise<Response> {
  const { feature, copy } = route;
  const notJson = rejectNonJson(req);
  if (notJson) return notJson;
  try {
    const user = await currentUser();
    if (!user) return fail("unauthorized", copy.signIn, 401);
    const missing = requirePlanFeature(user, feature);
    if (missing) return missing;

    const now = Date.now();
    // Looked up together; the budget's answer still comes after validation, in the order above.
    const [burst, budget] = await Promise.all([
      rateLimit(`${feature}:user:${user.id}`, CALLS_PER_MINUTE[feature], MINUTE_MS),
      checkAiBudget(user, now),
    ]);
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
      log.info(`${feature}.bad_request`, { reason: body.message });
      return fail("bad_request", copy.invalid, 400);
    }

    const empty = (await route.nothingToDo?.(body.data, user)) ?? null;
    if (empty !== null) {
      log.info(`${feature}.nothing_to_do`, { plan: user.plan });
      return ok({ result: empty, usage: await getUsage(user, now), demo: !aiEnabled() });
    }

    const requestId = readRequestId(req);
    const resume = isResume(req);
    const claim = requestId
      ? await claimRun<R>(user.id, requestKey(feature, requestId, body.data), now, { resume })
      : null;
    if (claim?.kind === "done") {
      log.info(`${feature}.result_replayed`, { plan: user.plan });
      return ok({ result: claim.result, usage: await getUsage(user, now), demo: claim.demo });
    }
    if (claim?.kind === "busy") {
      log.info(`${feature}.still_running`, { plan: user.plan });
      return fail("rate_limited", STILL_RUNNING, 429, retryAfterHeader(MINUTE_MS));
    }
    if (resume) {
      log.info(`${feature}.nothing_to_resume`, { plan: user.plan });
      return fail("not_found", NOTHING_TO_RESUME, 404);
    }

    const runKey = claim?.kind === "run" ? claim.key : null;
    let kept = false;
    try {
      const unit = await takeUnit(user, route, body.data, now, budget.allowed);
      if (unit instanceof Response) return unit;

      const call = {
        userId: user.id,
        path: new URL(req.url).pathname,
        feature,
        startedAt: Date.now(),
      };
      try {
        const result = await spendAiTokens(user, now, () => route.run(body.data, user));
        trackMeteredCall(call);
        const demo = !aiEnabled();
        if (runKey)
          kept = await keep(user, feature, () => saveResult(user.id, runKey, result, demo, now));
        if (unit.opensPass && route.followUp?.opensPass(result))
          await keep(user, feature, unit.opensPass);
        return ok({ result, usage: unit.usage, demo, ...creditField(unit.credit) });
      } catch (error) {
        trackMeteredCall(call, error);
        const refunded = await refund(user, feature, now, error, unit);
        if (!(error instanceof AIError)) throw error;
        log.warn(`${feature}.ai_failed`, { code: error.code, refunded });
        const failure = AI_FAILURES[error.code];
        return fail(failure.code, failure.message(copy, refunded), failure.status);
      }
    } finally {
      if (runKey && !kept) await keep(user, feature, () => dropRun(user.id, runKey));
    }
  } catch (error) {
    log.error(`${feature}.failed`, error);
    return fail("server_error", "Something went wrong. Please try again.", 500);
  }
}

// A follow-up with a live pass on its subject uses the pass; anything else takes a unit, or credit past the allowance or AI budget.
async function takeUnit<S extends z.ZodType, R>(
  user: SessionUser,
  route: MeteredRoute<S, R>,
  input: z.output<S>,
  now: number,
  budgetAllowed: boolean,
): Promise<Unit | Response> {
  const { feature, followUp } = route;
  const pass = followUp ? { userId: user.id, feature, subject: followUp.subject(input) } : null;
  if (budgetAllowed && pass && followUp?.isFollowUp(input) && (await takePass(pass, now))) {
    log.info(`${feature}.follow_up`, { plan: user.plan });
    return {
      usage: await getUsage(user, now),
      giveBack: () => returnPass(pass),
      opensPass: null,
      credit: null,
    };
  }
  const taken = await takeUnitOrCredit(user, feature, now, { budgetAllowed });
  if (!taken.allowed) {
    if (taken.budget) return budgetReached(user, taken.period, now);
    return limitReached(user, feature, taken.period, now, taken.usage?.[feature].limit);
  }
  if (taken.credit) log.info(`${feature}.paid_with_credit`, { cents: taken.credit.cents });
  return {
    usage: taken.usage,
    giveBack: taken.giveBack,
    opensPass: pass ? () => openPass(pass, now) : null,
    credit: taken.credit,
  };
}

// Bookkeeping after the answer is ready must never cost the person that answer.
async function keep(
  user: SessionUser,
  feature: Feature,
  write: () => Promise<void>,
): Promise<boolean> {
  try {
    await write();
    return true;
  } catch (error) {
    log.error(`${feature}.bookkeeping_failed`, error, { userId: user.id });
    return false;
  }
}

// Credit paid for an answer that never came always comes back; allowance units keep the daily cap.
async function refund(
  user: SessionUser,
  feature: Feature,
  now: number,
  cause: unknown,
  { giveBack, credit }: Pick<Unit, "giveBack" | "credit">,
): Promise<boolean> {
  try {
    const unbilled = cause instanceof AIError && UNBILLED_FAILURES.has(cause.code);
    if (credit === null && !unbilled) {
      const cap = await rateLimit(
        `refund:${feature}:user:${user.id}`,
        BILLED_REFUNDS_PER_DAY,
        DAY_MS,
        now,
      );
      if (!cap.allowed) {
        log.warn(`${feature}.refund_capped`, { plan: user.plan });
        return false;
      }
    }
    await giveBack();
    return true;
  } catch (error) {
    log.error("usage.refund_failed", error, { feature, userId: user.id });
    return false;
  }
}
