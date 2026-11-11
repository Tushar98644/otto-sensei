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

// Numbers come from PLANS, so changing a limit or price there updates every page.

export type PlanCopy = {
  summary: string;
  lead?: string;
  features: readonly string[];
  note: string;
};

export { PLAN_ORDER } from "@/config/plans";

const count = new Intl.NumberFormat("en-US");

// Free has no weekly option, whatever the switch on the pricing page says.
function periodOf(plan: PlanId, period: AllowancePeriod): AllowancePeriod {
  return PLANS[plan].weeklyLimits ? period : "month";
}

export function limitLine(
  plan: PlanId,
  feature: Feature,
  period: AllowancePeriod = "month",
): string {
  const kind = periodOf(plan, period);
  return `${count.format(planLimits(plan, kind)[feature])} ${FEATURE_LABELS[feature]} ${perPeriod(kind)}`;
}

// Max has this too, as "Everything in Pro".
const PORTFOLIO_PAGE = `A hosted portfolio site made from your resume, in all ${PORTFOLIO_TEMPLATE_IDS.length} designs`;

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");

// What Free keeps for good, and nothing more (owner decision, 2026-11-08).
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

// The same live open-job count as the home page and the pricing lead, rounded down.
function jobsLine(jobs: JobCounts): string {
  const open = countClaim(jobs.open);
  return open
    ? `Every match from ${open} open jobs, with filters and saved jobs`
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

// Pricing states numbers only for what people compare plans on; the other AI features are listed
// by name, and every exact limit is in the terms.
const HEADLINE_FEATURES: readonly Feature[] = ["tailor", "letter", "fix"];

const headlineLines = (plan: PlanId, period: AllowancePeriod) =>
  HEADLINE_FEATURES.map((feature) => limitLine(plan, feature, period));

const namedFeatures = FEATURES.filter((feature) => !HEADLINE_FEATURES.includes(feature)).map(
  (feature) => FEATURE_LABELS[feature].charAt(0).toUpperCase() + FEATURE_LABELS[feature].slice(1),
);

/** `jobs`: the live job counts the page was built with. */
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
        features: [
          ...headlineLines("pro", period),
          ...namedFeatures,
          ...proTools(jobs),
          PORTFOLIO_PAGE,
        ],
        note: "Cancel anytime from your account",
      };
    case "max":
      return {
        summary: "For a long search, or many roles at once.",
        lead: `Everything in Pro, with more ${each}:`,
        features: headlineLines("max", period),
        note: "Cancel anytime from your account",
      };
  }
}

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
