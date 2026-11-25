import {
  applicationLimit,
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
import { fmt } from "@/i18n/format";
import type { Format } from "@/i18n/intl";
import { countClaimWith, JOB_COUNTS_FALLBACK, type JobCounts } from "@/lib/job-feed/counts";
import { PORTFOLIO_TEMPLATE_IDS } from "@/lib/portfolio/types";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";
import { joinList, type PricingMessages } from "./price-copy";

export type PlanCopy = {
  summary: string;
  lead?: string;
  features: readonly string[];
  quota: string;
  note: string;
};

export type PlanCopyMessages = Pick<PricingMessages, "prices" | "features" | "copy">;

export { PLAN_ORDER };

function periodOf(plan: PlanId, period: AllowancePeriod): AllowancePeriod {
  return isPaidPlan(plan) ? period : "month";
}

export function limitLine(
  t: PlanCopyMessages,
  format: Format,
  plan: PlanId,
  feature: Feature,
  period: AllowancePeriod = "month",
): string {
  const kind = periodOf(plan, period);
  return fmt(t.copy.limit, {
    count: format.number(planLimits(plan, kind)[feature]),
    label: t.features[feature],
    period: t.prices.perPeriod[kind],
  });
}

const QUOTA: readonly Feature[] = ["tailor", "letter", "fix"];

export function quotaLine(
  t: PlanCopyMessages,
  format: Format,
  plan: PlanId,
  period: AllowancePeriod = "month",
): string {
  const kind = periodOf(plan, period);
  const words = t.copy.quota;
  if (!isPaidPlan(plan)) {
    return fmt(words.free, {
      resumes: format.plural(t.copy.resumes, resumeLimit("free")),
      fix: format.number(PLANS.free.limits.fix),
      fixLabel: t.features.fix,
      period: t.prices.perPeriod[kind],
    });
  }
  const limits = planLimits(plan, kind);
  const items = QUOTA.map((feature) =>
    fmt(words.item, {
      count: format.number(limits[feature]),
      label: feature === "letter" ? words.letters : t.features[feature],
    }),
  );
  return fmt(words.paid, { items: items.join(" · "), period: t.prices.perPeriod[kind] });
}

function freeOutcomes(t: PlanCopyMessages, format: Format): string[] {
  const outcomes = t.copy.free.outcomes;
  const formats = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name);
  return [
    outcomes.upload,
    outcomes.fix,
    fmt(outcomes.download, { formats: joinList(format, formats, "or") }),
    fmt(outcomes.matches, { count: format.number(FREE_JOB_MATCHES) }),
    fmt(outcomes.track, {
      applications: format.plural(t.copy.applications, applicationLimit("free")),
    }),
  ];
}

export function proTools(
  t: PlanCopyMessages,
  format: Format,
  jobs: JobCounts = JOB_COUNTS_FALLBACK,
): readonly string[] {
  const tools = t.copy.pro.tools;
  const open = countClaimWith(format.number, jobs.open);
  return [
    fmt(tools.formats, {
      formats: format.number(TEMPLATE_IDS.length),
      resumes: format.number(resumeLimit("pro")),
    }),
    open ? fmt(tools.jobs, { open }) : tools.jobsNoCount,
    fmt(tools.track, { applications: format.number(applicationLimit("pro")) }),
    fmt(tools.share, { designs: format.number(PORTFOLIO_TEMPLATE_IDS.length) }),
  ];
}

type MaxNoun = keyof PricingMessages["copy"]["max"]["more"];

const MAX_MORE: readonly { features: readonly Feature[]; noun: MaxNoun }[] = [
  { features: ["tailor"], noun: "tailor" },
  { features: ["letter"], noun: "letter" },
  { features: ["fix"], noun: "fix" },
  { features: ["import"], noun: "import" },
  { features: ["draft", "github"], noun: "drafts" },
];

function moreThanPro(
  t: PlanCopyMessages,
  format: Format,
  features: readonly Feature[],
  noun: string,
): string {
  const ratio = Math.min(
    ...features.map((feature) => PLANS.max.limits[feature] / PLANS.pro.limits[feature]),
  );
  const whole = Math.floor(ratio);
  const words = t.copy.max.ratio;
  if (whole < 2) return fmt(words.more, { noun });
  const exact = ratio === whole;
  if (whole === 2) return fmt(exact ? words.twice : words.overTwice, { noun });
  return fmt(exact ? words.times : words.overTimes, { times: format.number(whole), noun });
}

export function planCopy(
  t: PlanCopyMessages,
  format: Format,
  plan: PlanId,
  period: AllowancePeriod = "month",
  jobs: JobCounts = JOB_COUNTS_FALLBACK,
): PlanCopy {
  const copy = t.copy;
  switch (plan) {
    case "free":
      return {
        summary: copy.free.summary,
        features: freeOutcomes(t, format),
        quota: quotaLine(t, format, "free"),
        note: copy.free.note,
      };
    case "pro":
      return {
        summary: copy.pro.summary,
        lead: copy.pro.lead,
        features: [copy.pro.ai.tailor, copy.pro.ai.letters, ...proTools(t, format, jobs)],
        quota: quotaLine(t, format, "pro", period),
        note: copy.pro.note,
      };
    case "max":
      return {
        summary: copy.max.summary,
        lead: copy.max.lead,
        features: [
          ...MAX_MORE.map(({ features, noun }) =>
            moreThanPro(t, format, features, copy.max.more[noun]),
          ),
          fmt(copy.max.keep, {
            resumes: format.number(resumeLimit("max")),
            applications: format.number(applicationLimit("max")),
          }),
        ],
        quota: quotaLine(t, format, "max", period),
        note: copy.max.note,
      };
  }
}

export function plansOnSale(offer: Record<PaidPlanId, readonly BillingInterval[]>): PlanId[] {
  return PLAN_ORDER.filter((plan) => plan === "free" || offer[plan].length > 0);
}
