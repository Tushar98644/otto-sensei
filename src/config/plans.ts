import type { TemplateId } from "@/lib/resume/schema";

export type PlanId = "free" | "pro" | "max";
export type PaidPlanId = Exclude<PlanId, "free">;

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
  letter: "cover letters, outreach messages, answers and interview prep",
  import: "AI reads of an uploaded resume",
  draft: "Build with Otto drafts",
  github: "GitHub project drafts",
};

export const BLOCKING_FEATURES: readonly Feature[] = ["tailor", "letter", "fix", "draft", "github"];

type Plan = {
  id: PlanId;
  name: string;
  priceUsd: number;
  limits: Record<Feature, number>;
};

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    limits: { tailor: 0, letter: 0, fix: 3, import: 0, draft: 0, github: 0 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 15,
    limits: { tailor: 150, letter: 150, fix: 750, import: 100, draft: 50, github: 50 },
  },
  max: {
    id: "max",
    name: "Max",
    priceUsd: 29,
    limits: { tailor: 300, letter: 300, fix: 2000, import: 300, draft: 150, github: 150 },
  },
} as const satisfies Record<PlanId, Plan>;

export const PRO_TRIAL = {
  plan: "pro",
  interval: "month",
  days: 3,
  priceUsd: 1,
  limits: { tailor: 10, letter: 15, fix: 50, import: 5, draft: 3, github: 3 },
} as const satisfies {
  plan: PaidPlanId;
  interval: BillingInterval;
  days: number;
  priceUsd: number;
  limits: Record<Feature, number>;
};

// Abuse guard: heavy real use is ~3.1M a month on Pro and ~7.3M on Max.
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

// Paddle charges what each price says: change prices here and in Paddle together.
export type BillingInterval = "month" | "year";
export const BILLING_INTERVALS = ["month", "year"] as const satisfies readonly BillingInterval[];
export const PRICES_USD: Record<PaidPlanId, Record<BillingInterval, number>> = {
  pro: { month: PLANS.pro.priceUsd, year: 120 },
  max: { month: PLANS.max.priceUsd, year: 232 },
};

// Off: never-charged reference prices can count as a misleading discount (EU/UK/US rules).
export const SHOW_REFERENCE_PRICES = false;
export const REFERENCE_MONTHLY_USD: Record<PaidPlanId, number> = { pro: 30, max: 60 };

export function referenceDiscountPercent(plan: PaidPlanId): number {
  return Math.round((1 - PRICES_USD[plan].month / REFERENCE_MONTHLY_USD[plan]) * 100);
}

// From Rezi's own pricing page, checked 2026-11-08.
export const PRO_PRICE_COMPARISON = { name: "Rezi Pro", priceUsd: 29 } as const;

export type AllowancePeriod = "month" | "trial";

export function planLimits(plan: PlanId, period: AllowancePeriod): Record<Feature, number> {
  if (!isPaidPlan(plan)) return PLANS.free.limits;
  return period === "trial" ? PRO_TRIAL.limits : PLANS[plan].limits;
}

export function aiTokenBudget(plan: PlanId, period: AllowancePeriod): number | null {
  if (!isPaidPlan(plan)) return null;
  return period === "trial" ? AI_TOKEN_BUDGETS.trial : AI_TOKEN_BUDGETS[plan];
}

export function planIncludes(plan: PlanId, feature: Feature): boolean {
  return PLANS[plan].limits[feature] > 0;
}

export type ProTool = "resumes" | "formats" | "word" | "tracker" | "jobs" | "share" | "eligibility";

export const RESUME_LIMITS = { free: 1, paid: 50 } as const;
export const FREE_APPLICATIONS = 1;
export const FREE_JOB_MATCHES = 5;
export const FREE_TEMPLATES = ["classic", "compact"] as const satisfies readonly TemplateId[];

export function hasProTools(plan: PlanId): boolean {
  return isPaidPlan(plan);
}

export function resumeLimit(plan: PlanId): number {
  return hasProTools(plan) ? RESUME_LIMITS.paid : RESUME_LIMITS.free;
}

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
export const DRAFT_LIMITS = { jobs: 6, notesPerJob: 4, noteChars: 400 } as const;
export const SUMMARY_IMPROVE_CHARS = { min: 15, max: 3_000 } as const;

export type Usage = { used: number; limit: number };
export type UsageSnapshot = Record<Feature, Usage>;
export type UsagePeriod = { kind: AllowancePeriod; resetsAt: number; renews?: boolean };
