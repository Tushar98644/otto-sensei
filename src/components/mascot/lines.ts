import { usdIn } from "@/components/account/local-prices";
import { BRAND } from "@/config/brand";
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
import { formatFor, type Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import EN_APP from "@/i18n/messages/en/app";
import EN_OTTO from "@/i18n/messages/en/otto";
import EN_SIGN_IN from "@/i18n/messages/en/sign-in";
import { planFullCopy, type KeptTool } from "@/lib/plan-limits-copy";
import { periodNoun, usageCopy } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";
import { OTTO_ERRORS } from "./error-lines";

type Line = string | ((...args: never[]) => string);

function whole(n: number) {
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

const count = new Intl.NumberFormat("en-US");

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

export const OTTO_EN: OttoLines = ottoLines(
  { otto: EN_OTTO, signIn: EN_SIGN_IN, usage: EN_APP.usage },
  formatFor("en"),
);

function jobsFound(matching: number, shown: number, strong: number, newToday: number) {
  const n = whole(matching);
  if (n === 0 || whole(shown) === 0)
    return "No open jobs match this resume yet. I check the boards every day.";
  const lead =
    n > whole(shown)
      ? `I found ${count.format(n)} matching jobs. Here are the closest ${count.format(whole(shown))}.`
      : `I found ${count.format(n)} ${n === 1 ? "job that matches" : "jobs that match"} your resume.`;
  const s = whole(strong);
  const fresh = whole(newToday);
  const parts = [
    s > 0 ? `${count.format(s)} ${s === 1 ? "looks" : "look"} strong` : "",
    fresh > 0 ? `${count.format(fresh)} ${fresh === 1 ? "is" : "are"} new today` : "",
  ].filter(Boolean);
  return parts.length > 0 ? `${lead} ${parts.join(", ")}.` : lead;
}

// English; the app reads its lines through useOtto() (./use-otto), so they follow the reader's language.
export const OTTO = {
  landing: {
    hello: `Hi, I'm ${BRAND.mascotName}. I read resumes the way hiring software does.`,
  },
  home: {
    first: "Upload your resume and I'll show you what hiring software reads.",
    sampleOnly: "That's the sample. Now drop in yours.",
    returning: "Pick up where you left off, or tailor a resume to a new job.",
  },
  signIn: {
    ...OTTO_EN.signIn,
    codeSent: "Check your email for a 6-digit code. It works for 10 minutes.",
  },
  limit: OTTO_EN.limit,
  working: EN_APP.working,
  pricing: {
    samePrinciples: "Plans change how much I help each month, never what I will or won't do.",
  },
  formats: {
    tip: "Not sure? Classic suits any job. Compact fits a long career on one page.",
  },
  upgrade: OTTO_EN.upgrade,
  errors: OTTO_ERRORS,
  jobs: {
    found: jobsFound,
    filtered: "Nothing matches these filters. Try loosening one of them.",
    noResume: "Add a resume and I'll find open jobs that fit it.",
    noJobs: "No jobs here yet. The boards are read once a day.",
    saved: (saved: number) =>
      whole(saved) === 0
        ? "Nothing saved yet. Save a job and it waits for you here."
        : `${pluralize(whole(saved), "saved job")}. Closed ones stay here for 30 days.`,
    noSkills:
      "I couldn't find any skills in this resume. Add a skills section and I'll match again.",
  },
  letters: {
    empty:
      "Nothing written yet. Pick a job and I'll write a letter, an answer or an outreach message.",
    noResume: "I need a resume to write from. Add one, then come back here.",
    write: "I'll write about 200 words from your resume and this job, nothing made up.",
    answer: "Paste the question. I'll draft a short answer from your resume and this job.",
    outreach: "I'll write a short email and a LinkedIn note from your resume and this job.",
    locked:
      "With Pro, I write cover letters, answers and outreach messages from your resume. Here's an example.",
    lockedKept:
      "Writing new ones comes with Pro. What you wrote before stays here to read, copy and edit.",
  },
  interview: {
    empty: "No prep yet. Pick an application or paste a job link and I'll start.",
    pick: "Pick the job. A pasted link joins your Applications, marked as an interview.",
    locked:
      "With Pro, I prep you for each interview from your own resume lines. Here's an example.",
    lockedKept: "Making new prep comes with Pro. The prep you made before stays here to read.",
  },
} as const satisfies Record<string, Line | Record<string, Line>>;
