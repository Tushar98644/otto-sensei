import {
  FEATURE_LABELS,
  FEATURES,
  FREE_APPLICATIONS,
  FREE_JOB_MATCHES,
  FREE_TEMPLATES,
  PLANS,
  planLimits,
  RESUME_LIMITS,
  type AllowancePeriod,
  type Feature,
  type PlanId,
} from "@/config/plans";
import { countClaim, JOB_COUNTS_FALLBACK, type JobCounts } from "@/lib/job-feed/counts";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { periodNoun, perPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";

// Pricing copy shared by the landing teaser, /pricing and the terms. Numbers come from PLANS, so
// changing a limit or price there updates every page.

export type PlanCopy = {
  summary: string;
  // A plain line above the feature list, e.g. "Everything in Free, plus AI help each month:".
  lead?: string;
  features: readonly string[];
  // The small gray line under the plan's button.
  note: string;
};

export { PLAN_ORDER } from "@/config/plans";

const count = new Intl.NumberFormat("en-US");

// Free has no weekly option, whatever the switch on the pricing page says.
function periodOf(plan: PlanId, period: AllowancePeriod): AllowancePeriod {
  return PLANS[plan].weeklyLimits ? period : "month";
}

/** "150 tailored versions a month", or "38 tailored versions a week" on a weekly plan. */
export function limitLine(
  plan: PlanId,
  feature: Feature,
  period: AllowancePeriod = "month",
): string {
  const kind = periodOf(plan, period);
  return `${count.format(planLimits(plan, kind)[feature])} ${FEATURE_LABELS[feature]} ${perPeriod(kind)}`;
}

// Pro.s portfolio line; Max has it too, as "Everything in Pro".
const PORTFOLIO_PAGE = `A hosted portfolio site made from your resume, in all ${PORTFOLIO_TEMPLATE_IDS.length} designs`;

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");

// What Free keeps for good, and nothing more (owner decision, 2026-11-08). Numbers come from
// src/config/plans.ts.
export const FREE_BASICS: readonly string[] = [
  "Upload a resume, read by the basic reader (no AI)",
  "The recruiter view: what hiring software reads",
  "Edit and fix every line by hand",
  pluralize(RESUME_LIMITS.free, "resume"),
  `${freeFormats} formats`,
  "PDF download",
  // Owner decision, 2026-11-09: Free sees a few real matches and tracks one application.
  `Your ${FREE_JOB_MATCHES} closest job matches`,
  `${pluralize(FREE_APPLICATIONS, "tracked application")}, with a follow-up reminder`,
];

// "21,000+ quality jobs matched to your resume": the live count of what matching ranks, rounded
// down (src/lib/job-feed/counts.ts); no number at all when there are too few to state one.
function jobsLine(jobs: JobCounts): string {
  const quality = countClaim(jobs.matchable);
  return quality
    ? `${quality} quality jobs matched to your resume, with filters and saved jobs`
    : "Open jobs matched to your resume, with filters and saved jobs";
}

// What Pro (and the trial, and Max) adds besides AI help. "Up to", not "unlimited": 50 is the
// storage cap on every account.
export function proTools(jobs: JobCounts = JOB_COUNTS_FALLBACK): readonly string[] {
  return [
    `All ${TEMPLATE_IDS.length} formats and up to ${RESUME_LIMITS.paid} resumes`,
    "Word (.docx) downloads",
    jobsLine(jobs),
    "Track every application, with follow-up reminders",
    "Share links, and a check of where each job can hire from",
  ];
}

export const PRO_TOOLS: readonly string[] = proTools();

const limitLines = (plan: PlanId, period: AllowancePeriod) =>
  FEATURES.map((feature) => limitLine(plan, feature, period));

/**
 * A plan card's copy for the allowance its picked billing option gives. `jobs`: the live job
 * counts the page was built with.
 */
export function planCopy(
  plan: PlanId,
  period: AllowancePeriod = "month",
  jobs: JobCounts = JOB_COUNTS_FALLBACK,
): PlanCopy {
  const each = `each ${periodNoun(periodOf(plan, period))}`;
  switch (plan) {
    case "free":
      return {
        summary: "Check, fix and download one resume, free for good.",
        features: FREE_BASICS,
        note: "No card needed",
      };
    case "pro":
      return {
        summary: "Otto's AI help for a busy job hunt with lots of applications.",
        lead: "Everything in Free, plus:",
        features: [...limitLines("pro", period), ...proTools(jobs), PORTFOLIO_PAGE],
        note: "Cancel anytime from your account",
      };
    case "max":
      return {
        summary: "For a long search, or many roles at once.",
        lead: `Everything in Pro, with more ${each}:`,
        features: limitLines("max", period),
        note: "Cancel anytime from your account",
      };
  }
}

/** What the trial's allowance is, line by line: "10 tailored versions during the trial". */
export function trialLines(): string[] {
  return FEATURES.map((feature) => limitLine("pro", feature, "trial"));
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

// "$15", or "$12.50" if a price ever has cents.
export function formatUsd(amount: number): string {
  return usd.format(amount);
}
