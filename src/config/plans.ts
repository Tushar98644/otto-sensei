import type { TemplateId } from "@/lib/resume/schema";

export type PlanId = "free" | "pro" | "max";
export type PaidPlanId = Exclude<PlanId, "free">;

// Everything that costs an AI call, counted per account per allowance period (see
// allowancePeriodFor). Free has none of them: AI help is Pro and Max, and the Pro trial.
// - letter covers cover letters, answers to application questions and interview prep packs;
// - fix covers line fixes and summaries;
// - import is an upload read by the AI. Uploads are never blocked: without an AI read left (and on
//   Free, always) they are read by the rule-based reader instead, which costs nothing;
// - draft is "Build with Otto", github is drafting project lines from GitHub.
export type Feature = "fix" | "tailor" | "letter" | "import" | "draft" | "github";

export const FEATURES: readonly Feature[] = [
  "tailor",
  "letter",
  "fix",
  "import",
  "draft",
  "github",
];

export const FEATURE_LABELS: Record<Feature, string> = {
  fix: "line fixes",
  tailor: "tailored versions",
  letter: "cover letters, answers and interview prep",
  import: "AI reads of an uploaded resume",
  draft: "Build with Otto drafts",
  github: "GitHub project drafts",
};

// Features that stop at their limit and offer the next plan (on Free, the trial). Imports fall back
// instead.
export const BLOCKING_FEATURES: readonly Feature[] = ["tailor", "letter", "fix", "draft", "github"];

type Plan = {
  id: PlanId;
  name: string;
  // Monthly price; PRICES_USD has every billing option.
  priceUsd: number;
  // Per billing month: monthly subscribers from one renewal to the next, yearly ones each month
  // from the day their plan started (src/lib/usage.ts). All zero on Free.
  limits: Record<Feature, number>;
  // Per billing week, for weekly subscribers. A quarter of the monthly limit, rounded up, so a
  // $6 week can't take a whole month's allowance. Free is never weekly.
  weeklyLimits: Record<Feature, number> | null;
};

// Real limits on every plan: these are the numbers the pricing page, the terms and the usage
// meters show. Free keeps everything that costs no AI call (the rule-based reader, the recruiter
// view, editing, formats, PDFs, jobs and matching, the tracker); it has no AI allowance at all.
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    limits: { tailor: 0, letter: 0, fix: 0, import: 0, draft: 0, github: 0 },
    weeklyLimits: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 15,
    limits: { tailor: 150, letter: 100, fix: 300, import: 30, draft: 20, github: 20 },
    weeklyLimits: { tailor: 38, letter: 25, fix: 75, import: 8, draft: 5, github: 5 },
  },
  max: {
    id: "max",
    name: "Max",
    priceUsd: 29,
    limits: { tailor: 300, letter: 300, fix: 1000, import: 100, draft: 60, github: 60 },
    weeklyLimits: { tailor: 75, letter: 75, fix: 250, import: 25, draft: 15, github: 15 },
  },
} as const satisfies Record<PlanId, Plan>;

// New accounts can start Pro with a free trial: the card is saved at checkout and nothing is charged
// until Pro monthly starts when it ends. One per person (src/lib/billing/trial.ts). Its allowance
// covers the whole trial, not a month or week, and is capped because a trial brings in nothing:
// worst case, every call at its token cap, a trial costs about $0.44 (PLAN.md).
export const PRO_TRIAL = {
  plan: "pro",
  interval: "month",
  days: 3,
  priceUsd: 0,
  limits: { tailor: 10, letter: 15, fix: 50, import: 5, draft: 3, github: 3 },
} as const satisfies {
  plan: PaidPlanId;
  interval: BillingInterval;
  days: number;
  priceUsd: number;
  limits: Record<Feature, number>;
};

export const PLAN_ORDER: readonly PlanId[] = ["free", "pro", "max"];
export const PAID_PLANS: readonly PaidPlanId[] = ["pro", "max"];

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan !== "free";
}

/** On a paid plan's trial: the subscription hasn't made its first regular payment yet. */
export function isTrialing(account: { plan: PlanId; trialEndsAt?: number | null }): boolean {
  return isPaidPlan(account.plan) && account.trialEndsAt != null;
}

/** The plan an upgrade prompt offers: Free goes to Pro, Pro to Max, Max has nowhere to go. */
export function nextPlan(plan: PlanId): PaidPlanId | null {
  if (plan === "free") return "pro";
  if (plan === "pro") return "max";
  return null;
}

// How often a paid plan bills. Pro monthly is CREEM_PRO_MONTHLY_PRODUCT_ID and always offered; every
// other option appears only once its product id is set (src/lib/billing/intervals.ts). These are
// the prices people see: Creem charges what each product says, so change both together.
export type BillingInterval = "month" | "year" | "week";
export const BILLING_INTERVALS = [
  "month",
  "year",
  "week",
] as const satisfies readonly BillingInterval[];
export const PRICES_USD: Record<PaidPlanId, Record<BillingInterval, number>> = {
  pro: { month: PLANS.pro.priceUsd, year: 120, week: 6 },
  max: { month: PLANS.max.priceUsd, year: 232, week: 12 },
};

// Reference prices shown struck through beside the monthly price on the pricing cards, with the
// discount from them. Off since 2026-11-10 (owner): these were never charged, which payment review
// (Creem rejects "false information") and consumer rules in the EU, UK and US can treat as a
// misleading discount (PLAN.md). true shows every one again. Weekly and yearly prices never get one.
export const SHOW_REFERENCE_PRICES = false;
export const REFERENCE_MONTHLY_USD: Record<PaidPlanId, number> = { pro: 30, max: 60 };

/** The monthly price's discount from its reference, in whole percent: 50 for $15 against $30. */
export function referenceDiscountPercent(plan: PaidPlanId): number {
  return Math.round((1 - PRICES_USD[plan].month / REFERENCE_MONTHLY_USD[plan]) * 100);
}

// What the Pro card compares its monthly price to, from the competitor's own pricing page
// (checked 2026-11-08).
export const PRO_PRICE_COMPARISON = { name: "Rezi Pro", priceUsd: 29 } as const;

// How long an allowance lasts. Trials get PRO_TRIAL's limits once, for the whole trial; weekly
// subscribers get the weekly limits per billing week; everyone else (Free, monthly, yearly) gets
// the monthly limits per month, which starts over when a monthly plan renews (yearly: on the same
// day each month). src/lib/usage.ts works out the dates.
export type AllowancePeriod = "month" | "week" | "trial";

export function allowancePeriodFor(
  plan: PlanId,
  interval: BillingInterval | null | undefined,
  trialing = false,
): AllowancePeriod {
  if (!isPaidPlan(plan)) return "month";
  if (trialing) return "trial";
  return interval === "week" ? "week" : "month";
}

export function planLimits(plan: PlanId, period: AllowancePeriod): Record<Feature, number> {
  if (!isPaidPlan(plan)) return PLANS.free.limits;
  if (period === "trial") return PRO_TRIAL.limits;
  return (period === "week" ? PLANS[plan].weeklyLimits : null) ?? PLANS[plan].limits;
}

/** Whether the plan includes any of this feature. Free includes no AI feature at all. */
export function planIncludes(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan].limits[feature] > 0;
}

// Beyond AI help, Free leaves out these tools or keeps a small part of them (owner decisions,
// 2026-11-08 and 2026-11-09); Pro, Max and the trial have all of them. Free keeps uploading, the
// recruiter view, editing by hand, PDF downloads, one tracked application and a few job matches. An
// account over a limit, say after a paid plan ends, keeps everything it made and can still read and
// change it; it just can't add more.
export type ProTool = "resumes" | "formats" | "word" | "tracker" | "jobs" | "share" | "eligibility";

// Resumes an account keeps. 50 is a storage cap on every paid plan (src/app/api/resumes/backups.ts).
export const RESUME_LIMITS = { free: 1, paid: 50 } as const;
// Applications Free tracks, reminders included. Paid plans stop only at the storage cap
// (APPLICATION_LIMITS.perUser in src/lib/applications/schema.ts).
export const FREE_APPLICATIONS = 1;
// Matches Free sees on the Jobs tab: the closest few from the normal ranking (owner decision,
// 2026-11-09). Filters, more pages, saved jobs and the work-rights check stay Pro.
export const FREE_JOB_MATCHES = 5;
// The formats Free downloads in. A resume set to another one downloads in Classic on Free.
export const FREE_TEMPLATES = ["classic", "compact"] as const satisfies readonly TemplateId[];

/** Pro, Max and the trial have every Pro tool and every format; Free has neither. */
export function hasProTools(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function resumeLimit(plan: PlanId): number {
  return hasProTools(plan) ? RESUME_LIMITS.paid : RESUME_LIMITS.free;
}

// Checks need no account, so they're limited per device and per IP instead. Uploads are never
// turned away for the plan: these only stop a flood. Signed-out visitors get what Free gets: the
// rule-based reader, and no AI.
export const ANON_LIMITS = {
  uploadsPerDay: 30,
  checksPerDay: 30,
} as const;
export const IP_LIMITS = {
  uploadsPerDay: 120,
  checksPerDay: 120,
  loginCodesPerHour: 10,
} as const;
export const EMAIL_LIMITS = { loginCodesPerHour: 5 } as const;

// Vercel rejects function request bodies over 4.5 MB before our code runs, so stay under it with
// room for multipart overhead. Real resumes are almost always under 1 MB.
export const UPLOAD_LIMITS = { maxBytes: 4 * 1024 * 1024, maxPages: 6 } as const;
export const TEXT_LIMITS = { resumeChars: 40_000, jobPostChars: 20_000, bulletChars: 600 } as const;

export type Usage = { used: number; limit: number };
export type UsageSnapshot = Record<Feature, Usage>;
// The allowance period a snapshot counts: its kind and when it starts over (epoch ms). A trial's
// ends with the trial, when the plan's own allowance takes over. renews: the reset is the plan's
// own renewal (a monthly plan's), not a day in between (a yearly plan's monthly reset).
export type UsagePeriod = { kind: AllowancePeriod; resetsAt: number; renews?: boolean };
