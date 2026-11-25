import {
  applicationLimit,
  FEATURE_LABELS,
  FREE_JOB_MATCHES,
  FREE_TEMPLATES,
  isPaidPlan,
  PLANS,
  PLAN_ORDER,
  planLimits,
  resumeLimit,
  type AllowancePeriod,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import { countClaim, JOB_COUNTS_FALLBACK, type JobCounts } from "@/lib/job-feed/counts";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { perPeriod } from "@/lib/usage-copy";
import { pluralize } from "@/lib/utils";

export type PlanCopy = {
  summary: string;
  lead?: string;
  features: readonly string[];
  quota: string;
  note: string;
};

export { PLAN_ORDER };

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

const QUOTA: readonly { feature: Feature; label: string }[] = [
  { feature: "tailor", label: FEATURE_LABELS.tailor },
  { feature: "letter", label: "letters and prep" },
  { feature: "fix", label: FEATURE_LABELS.fix },
];

export function quotaLine(plan: PlanId, period: AllowancePeriod = "month"): string {
  const kind = periodOf(plan, period);
  if (!isPaidPlan(plan)) {
    return `${pluralize(resumeLimit("free"), "resume")} · ${count.format(PLANS.free.limits.fix)} ${FEATURE_LABELS.fix} ${perPeriod(kind)} from Otto`;
  }
  const limits = planLimits(plan, kind);
  const parts = QUOTA.map(({ feature, label }) => `${count.format(limits[feature])} ${label}`);
  return `${parts.join(" · ")} ${perPeriod(kind)}`;
}

const freeFormats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" or ");

const FREE_OUTCOMES: readonly string[] = [
  "Upload a resume and see what hiring software reads",
  "Fix every line by hand, or with Otto",
  `Download a clean PDF in ${freeFormats}`,
  `Your ${FREE_JOB_MATCHES} closest job matches`,
  `Track ${pluralize(applicationLimit("free"), "application")}, with a follow-up reminder`,
];

function jobsLine(jobs: JobCounts): string {
  const open = countClaim(jobs.open);
  return open
    ? `Every match from ${open} open jobs, with filters and saved jobs`
    : "Open jobs matched to your resume, with filters and saved jobs";
}

export function proTools(jobs: JobCounts = JOB_COUNTS_FALLBACK): readonly string[] {
  return [
    `All ${TEMPLATE_IDS.length} formats, up to ${count.format(resumeLimit("pro"))} resumes and Word downloads`,
    jobsLine(jobs),
    `Track up to ${count.format(applicationLimit("pro"))} applications, with follow-up reminders`,
    `Share links, and a portfolio site in all ${PORTFOLIO_TEMPLATE_IDS.length} designs`,
  ];
}

const PRO_AI_OUTCOMES: readonly string[] = [
  "Otto tailors your resume to each job",
  "Cover letters, outreach and interview prep from Otto",
];

const MAX_MORE: readonly { features: readonly Feature[]; noun: string }[] = [
  { features: ["tailor"], noun: "tailored versions" },
  { features: ["letter"], noun: "cover letters, outreach and interview prep" },
  { features: ["fix"], noun: "line fixes" },
  { features: ["import"], noun: "uploads read by AI" },
  { features: ["draft", "github"], noun: "drafts from your notes and GitHub" },
];

function moreThanPro(features: readonly Feature[], noun: string): string {
  const ratio = Math.min(
    ...features.map((feature) => PLANS.max.limits[feature] / PLANS.pro.limits[feature]),
  );
  const whole = Math.floor(ratio);
  if (whole < 2) return `More ${noun}`;
  const times = whole === 2 ? "twice" : `${whole} times`;
  return ratio === whole
    ? `${times.charAt(0).toUpperCase()}${times.slice(1)} the ${noun}`
    : `Over ${times} the ${noun}`;
}

export function planCopy(
  plan: PlanId,
  period: AllowancePeriod = "month",
  jobs: JobCounts = JOB_COUNTS_FALLBACK,
): PlanCopy {
  switch (plan) {
    case "free":
      return {
        summary: "Check, fix and download one resume.",
        features: FREE_OUTCOMES,
        quota: quotaLine("free"),
        note: "No card needed",
      };
    case "pro":
      return {
        summary: "Otto's help for a busy job hunt.",
        lead: "Everything in Free, plus:",
        features: [...PRO_AI_OUTCOMES, ...proTools(jobs)],
        quota: quotaLine("pro", period),
        note: "Cancel anytime from your account",
      };
    case "max":
      return {
        summary: "For a long search or many roles.",
        lead: "Everything in Pro, with more:",
        features: [
          ...MAX_MORE.map(({ features, noun }) => moreThanPro(features, noun)),
          `Up to ${count.format(resumeLimit("max"))} resumes and ${count.format(applicationLimit("max"))} tracked applications`,
        ],
        quota: quotaLine("max", period),
        note: "Cancel anytime from your account",
      };
  }
}

export function plansOnSale(offer: Record<PaidPlanId, readonly BillingInterval[]>): PlanId[] {
  return PLAN_ORDER.filter((plan) => plan === "free" || offer[plan].length > 0);
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

export function formatUsd(amount: number): string {
  return usd.format(amount);
}
