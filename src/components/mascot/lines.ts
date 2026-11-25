import { usdIn } from "@/components/account/local-prices";
import {
  applicationLimit,
  type Feature,
  type PaidPlanId,
  type PlanId,
  PLANS,
  PRO_TRIAL,
  type ProTool,
  resumeLimit,
  type Usage,
  type UsagePeriod,
} from "@/config/plans";
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { planFullCopy, type KeptTool } from "@/lib/plan-limits-copy";
import { periodNoun, usageCopy } from "@/lib/usage-copy";

export function whole(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

export type OttoWords = {
  otto: Messages["otto"];
  signIn: Messages["signIn"];
  usage: Messages["app"]["usage"];
};

// The lines about sign-in, limits, plans and errors in the reader's language; English reads as it always has.
export function ottoLines({ otto, signIn, usage }: OttoWords, format: Format) {
  const periods = usageCopy(usage, format);
  const number = (n: number) => format.number(n);
  const trial = { plan: PLANS[PRO_TRIAL.plan].name, days: PRO_TRIAL.days };
  const withTrial = (line: string) => fmt(otto.withTrial, { line, ...trial });
  const full = planFullCopy(otto.full, format);
  const toolLine = (tool: ProTool): string => {
    if (tool !== "resumes" && tool !== "tracker") return otto.tool[tool];
    const limit = tool === "resumes" ? resumeLimit : applicationLimit;
    return fmt(otto.tool[tool], {
      free: format.plural(tool === "resumes" ? otto.resumes : otto.applications, limit("free")),
      pro: PLANS.pro.name,
      proCount: number(limit("pro")),
      max: PLANS.max.name,
      maxCount: number(limit("max")),
    });
  };
  return {
    signIn: {
      reason: (feature: Feature) =>
        fmt(signIn.gate.reasons[feature], { limit: PLANS.free.limits.fix, ...trial }),
      done: signIn.gate.backIn,
    },
    limit: {
      reached: (
        feature: Feature,
        limit: number = PLANS.pro.limits[feature],
        period?: UsagePeriod | null,
      ) =>
        whole(limit) === 0
          ? withTrial(otto.comesWithPro[feature])
          : fmt(otto.reached[periodNoun(period)], {
              limit: whole(limit),
              label: otto.labels[feature],
              reset: periods.resetSentence(period),
            }),
      freeUsed: (feature: Feature, limit: number = PLANS.free.limits[feature]) =>
        fmt(otto.freeUsed, {
          limit: number(limit),
          label: otto.labels[feature],
          pro: PLANS.pro.name,
          proLimit: number(PLANS.pro.limits[feature]),
        }),
      none: (feature: Feature, trialOn = true) =>
        trialOn ? withTrial(otto.comesWithPro[feature]) : otto.comesWithPro[feature],
      tool: (tool: ProTool, trialOn = true) =>
        trialOn ? withTrial(toolLine(tool)) : toolLine(tool),
      full: (tool: KeptTool, plan: PaidPlanId, held?: number, offerNext = true) =>
        full(tool, plan, held, offerNext),
      near: (feature: Feature, used: number, limit: number, period?: UsagePeriod | null) =>
        fmt(otto.near, {
          used: whole(used),
          limit: whole(limit),
          label: otto.labels[feature],
          reset: periods.resetSentence(period),
        }),
    },
    // budgetReachedText (src/lib/ai-budget-copy.ts) in this language.
    budget: (period: UsagePeriod | null | undefined, timeZone?: string) => {
      const used = otto.budget[periodNoun(period)];
      if (period?.kind === "trial") return `${used} ${periods.resetSentence(period, timeZone)}`;
      const day = period
        ? format.date(period.resetsAt, { month: "short", day: "numeric", timeZone })
        : null;
      return `${used} ${day ? fmt(otto.budget.resetsOn, { day }) : otto.budget.resetsWhenRenews}`;
    },
    errors: otto.errors,
    signedOut: otto.signedOut,
    // Cover letters, messages and answers left; its own line so the writing dialogs don't pull in the screener.
    writing: (
      plan: PlanId | null | undefined,
      left: Usage | null | undefined,
      period?: UsagePeriod | null,
      trialOn = true,
    ): string | null => {
      const none = trialOn ? withTrial(otto.comesWithPro.letter) : otto.comesWithPro.letter;
      if (!plan) return none;
      if (!left) return null;
      if (left.limit === 0) return none;
      const remaining = Math.max(0, left.limit - left.used);
      const values = { period: periods.thisPeriod(period) };
      if (remaining === 0)
        return fmt(otto.writing.none, { ...values, reset: periods.resetSentence(period) });
      return fmt(otto.writing.left, { ...values, left: remaining, limit: left.limit });
    },
    upgrade: {
      done: (plan: string) => fmt(otto.upgrade.done, { plan }),
      trial: fmt(otto.upgrade.trial, { ...trial, price: usdIn(format, PRO_TRIAL.priceUsd) }),
      trialStarted: (endsOn: string) => fmt(otto.upgrade.trialStarted, { day: endsOn }),
    },
  };
}

export type OttoLines = ReturnType<typeof ottoLines>;
