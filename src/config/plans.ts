import type { TemplateId } from "@/lib/resume/schema";

export type PlanId = "free" | "pro" | "max";
export type PaidPlanId = Exclude<PlanId, "free">;

// AI features, counted per account per allowance period. Free has none of them.
// letter: cover letters, application answers, interview prep. fix: line fixes and summaries.
// import: an AI upload read; never blocked, it falls back to the free rule-based reader.
// draft: "Build with Otto". github: project lines drafted from GitHub.
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

export const BLOCKING_FEATURES: readonly Feature[] = ["tailor", "letter", "fix", "draft", "github"];

type Plan = {
  id: PlanId;
  name: string;
  priceUsd: number;
  // Per billing month; all zero on Free.
  limits: Record<Feature, number>;
  // Per billing week: a quarter of the monthly limit, so a $6 week can't use a month's allowance.
  weeklyLimits: Record<Feature, number> | null;
};

// The pricing page, the terms and the usage meters all show these numbers.
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
    limits: { tailor: 150, letter: 150, fix: 750, import: 100, draft: 50, github: 50 },
    weeklyLimits: { tailor: 38, letter: 38, fix: 188, import: 25, draft: 13, github: 13 },
  },
  max: {
    id: "max",
    name: "Max",
    priceUsd: 29,
    limits: { tailor: 300, letter: 300, fix: 2000, import: 300, draft: 150, github: 150 },
    weeklyLimits: { tailor: 75, letter: 75, fix: 500, import: 75, draft: 38, github: 38 },
  },
} as const satisfies Record<PlanId, Plan>;

// One trial per person (src/lib/billing/trial.ts); nothing is charged until Pro monthly starts at
// its end. The allowance covers the whole trial and is capped: worst case a trial costs ~$0.44.
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

// Tokens (prompt + answer, reasoning included) per allowance period. An abuse guard: heavy real use
// is ~3.1M a month on Pro and ~7.3M on Max, so only scripted use reaches it.
export const AI_TOKEN_BUDGETS = { pro: 5_000_000, max: 10_000_000, trial: 500_000 } as const;

export const PLAN_ORDER: readonly PlanId[] = ["free", "pro", "max"];
export const PAID_PLANS: readonly PaidPlanId[] = ["pro", "max"];

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan !== "free";
}

export function isTrialing(account: { plan: PlanId; trialEndsAt?: number | null }): boolean {
  return isPaidPlan(account.plan) && account.trialEndsAt != null;
}

export function nextPlan(plan: PlanId): PaidPlanId | null {
  if (plan === "free") return "pro";
  if (plan === "pro") return "max";
  return null;
}

// Pro monthly is always offered; other intervals appear once their Creem product id is set.
// Creem charges what each product says, so change prices here and there together.
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

// Off: these prices were never charged, which Creem's review and EU/UK/US consumer rules can treat
// as a misleading discount. Weekly and yearly prices never get one.
export const SHOW_REFERENCE_PRICES = false;
export const REFERENCE_MONTHLY_USD: Record<PaidPlanId, number> = { pro: 30, max: 60 };

/** Whole percent: 50 for $15 against $30. */
export function referenceDiscountPercent(plan: PaidPlanId): number {
  return Math.round((1 - PRICES_USD[plan].month / REFERENCE_MONTHLY_USD[plan]) * 100);
}

// From Rezi's own pricing page, checked 2026-11-08.
export const PRO_PRICE_COMPARISON = { name: "Rezi Pro", priceUsd: 29 } as const;

// trial: PRO_TRIAL's limits once. week: the weekly limits per billing week. month: the monthly
// limits, reset on renewal (yearly plans: the same day each month). src/lib/usage.ts has the dates.
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

/** null on Free. A week gets a quarter, like its limits. */
export function aiTokenBudget(plan: PlanId, period: AllowancePeriod): number | null {
  if (!isPaidPlan(plan)) return null;
  if (period === "trial") return AI_TOKEN_BUDGETS.trial;
  return period === "week" ? Math.ceil(AI_TOKEN_BUDGETS[plan] / 4) : AI_TOKEN_BUDGETS[plan];
}

export function planIncludes(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan].limits[feature] > 0;
}

// Tools Free leaves out or limits. An account over a limit (say after a paid plan ends) keeps and
// can edit what it made; it just can't add more.
export type ProTool = "resumes" | "formats" | "word" | "tracker" | "jobs" | "share" | "eligibility";

// paid is a storage cap (src/app/api/resumes/backups.ts).
export const RESUME_LIMITS = { free: 1, paid: 50 } as const;
// Paid plans stop only at the storage cap, APPLICATION_LIMITS.perUser.
export const FREE_APPLICATIONS = 1;
export const FREE_JOB_MATCHES = 5;
// The formats Free downloads in. A resume set to another one downloads in Classic on Free.
export const FREE_TEMPLATES = ["classic", "compact"] as const satisfies readonly TemplateId[];

export function hasProTools(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function resumeLimit(plan: PlanId): number {
  return hasProTools(plan) ? RESUME_LIMITS.paid : RESUME_LIMITS.free;
}

// Signed-out checks are limited per device and IP, only to stop a flood. They get what Free gets.
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

// Vercel rejects bodies over 4.5 MB before our code runs; leave room for multipart overhead.
export const UPLOAD_LIMITS = { maxBytes: 4 * 1024 * 1024, maxPages: 6 } as const;
export const TEXT_LIMITS = { resumeChars: 40_000, jobPostChars: 20_000, bulletChars: 600 } as const;

export type Usage = { used: number; limit: number };
export type UsageSnapshot = Record<Feature, Usage>;
// resetsAt is epoch ms. renews: the reset is the plan's own renewal (monthly), not a mid-term
// monthly reset (yearly).
export type UsagePeriod = { kind: AllowancePeriod; resetsAt: number; renews?: boolean };
