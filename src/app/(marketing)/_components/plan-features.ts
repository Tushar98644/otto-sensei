import {
  FEATURE_LABELS,
  FEATURES,
  FREE_APPLICATIONS,
  FREE_JOB_MATCHES,
  FREE_TEMPLATES,
  isPaidPlan,
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

export type PlanCopy = {
  summary: string;
  lead?: string;
  features: readonly string[];
  note: string;
};

export { PLAN_ORDER } from "@/config/plans";

const count = new Intl.NumberFormat("en-US");

function periodOf(plan: PlanId, period: AllowancePeriod): AllowancePeriod {
  return isPaidPlan(plan) ? period : "month";
}

export function limitLine(
  plan: PlanId,
  feature: Feature,
  period: AllowancePeriod = "month",
): string {
  const kind = periodOf(plan, period);
  return `${count.format(planLimits(plan, kind)[feature])} ${FEATURE_LABELS[feature]} ${perPeriod(kind)}`;
}

const PORTFOLIO_PAGE = `A hosted portfolio site made from your resume, in all ${PORTFOLIO_TEMPLATE_IDS.length} designs`;

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");

export const FREE_BASICS: readonly string[] = [
  "Upload a resume, read by the basic reader (no AI)",
  "The recruiter view: what hiring software reads",
  "Edit and fix every line by hand",
  `${count.format(PLANS.free.limits.fix)} ${FEATURE_LABELS.fix} a month with Otto`,
  pluralize(RESUME_LIMITS.free, "resume"),
  `${freeFormats} formats`,
  "PDF download",
  `Your ${FREE_JOB_MATCHES} closest job matches`,
  `${pluralize(FREE_APPLICATIONS, "tracked application")}, with a follow-up reminder`,
];

function jobsLine(jobs: JobCounts): string {
  const open = countClaim(jobs.open);
  return open
    ? `Every match from ${open} open jobs, with filters and saved jobs`
    : "Open jobs matched to your resume, with filters and saved jobs";
}

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

const HEADLINE_FEATURES: readonly Feature[] = ["tailor", "letter", "fix"];

const headlineLines = (plan: PlanId, period: AllowancePeriod) =>
  HEADLINE_FEATURES.map((feature) => limitLine(plan, feature, period));

const namedFeatures = FEATURES.filter((feature) => !HEADLINE_FEATURES.includes(feature)).map(
  (feature) => FEATURE_LABELS[feature].charAt(0).toUpperCase() + FEATURE_LABELS[feature].slice(1),
);

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

export function formatUsd(amount: number): string {
  return usd.format(amount);
}
