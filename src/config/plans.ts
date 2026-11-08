export type PlanId = "free" | "pro" | "max";
export type PaidPlanId = Exclude<PlanId, "free">;

// Everything that costs an AI call, counted per account per allowance period (see
// allowancePeriodFor):
// - letter covers cover letters, answers to application questions and interview prep packs;
// - fix covers line fixes and summaries;
// - import is an upload read by the AI. Uploads are never blocked: past the limit they are read by
//   the rule-based reader instead, which costs nothing;
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

// Features that stop at their limit and offer the next plan. Imports fall back instead.
export const BLOCKING_FEATURES: readonly Feature[] = ["tailor", "letter", "fix", "draft", "github"];

type Plan = {
  id: PlanId;
  name: string;
  // Monthly price; PRICES_USD has every billing option.
  priceUsd: number;
  // Per calendar month (UTC): Free, and monthly and yearly subscribers.
  limits: Record<Feature, number>;
  // Per billing week, for weekly subscribers. A quarter of the monthly limit, rounded up, so a
  // $6 week can't take a whole month's allowance. Free is never weekly.
  weeklyLimits: Record<Feature, number> | null;
};

// Real limits on every plan: these are the numbers the pricing page, the terms and the usage
// meters show.
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    limits: { tailor: 3, letter: 5, fix: 20, import: 3, draft: 2, github: 2 },
    weeklyLimits: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 15,
    limits: { tailor: 60, letter: 100, fix: 300, import: 30, draft: 20, github: 20 },
    weeklyLimits: { tailor: 15, letter: 25, fix: 75, import: 8, draft: 5, github: 5 },
  },
  max: {
    id: "max",
    name: "Max",
    priceUsd: 29,
    limits: { tailor: 200, letter: 300, fix: 1000, import: 100, draft: 60, github: 60 },
    weeklyLimits: { tailor: 50, letter: 75, fix: 250, import: 25, draft: 15, github: 15 },
  },
} as const satisfies Record<PlanId, Plan>;

export const PLAN_ORDER: readonly PlanId[] = ["free", "pro", "max"];
export const PAID_PLANS: readonly PaidPlanId[] = ["pro", "max"];

export function isPaidPlan(plan: PlanId): plan is PaidPlanId {
  return plan !== "free";
}

/** The plan an upgrade prompt offers: Free goes to Pro, Pro to Max, Max has nowhere to go. */
export function nextPlan(plan: PlanId): PaidPlanId | null {
  if (plan === "free") return "pro";
  if (plan === "pro") return "max";
  return null;
}

// How often a paid plan bills. Pro monthly is DODO_PAYMENTS_PRODUCT_ID and always offered; every
// other option appears only once its product id is set (src/lib/billing/intervals.ts). These are
// the prices people see: Dodo charges what each product says, so change both together.
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

// How long an allowance lasts. Weekly subscribers get the weekly limits per billing week; everyone
// else (Free, monthly, yearly) gets the monthly limits per calendar month.
export type AllowancePeriod = "month" | "week";

export function allowancePeriodFor(
  plan: PlanId,
  interval: BillingInterval | null | undefined,
): AllowancePeriod {
  return isPaidPlan(plan) && interval === "week" ? "week" : "month";
}

export function planLimits(plan: PlanId, period: AllowancePeriod): Record<Feature, number> {
  return (period === "week" ? PLANS[plan].weeklyLimits : null) ?? PLANS[plan].limits;
}

// Checks need no account, so they're limited per device and per IP instead. Uploads are never
// turned away for the plan: these only stop a flood. Signed-out visitors get Free's AI reads per
// device over 30 days (and a per-network cap), then the rule-based reader; Build with Otto and
// GitHub drafts get Free's numbers per device per day.
export const ANON_LIMITS = {
  uploadsPerDay: 30,
  checksPerDay: 30,
  aiReadsPer30Days: PLANS.free.limits.import,
  draftsPer30Days: PLANS.free.limits.draft,
  githubDraftsPer30Days: PLANS.free.limits.github,
} as const;
export const IP_LIMITS = {
  uploadsPerDay: 120,
  checksPerDay: 120,
  aiReadsPer30Days: 20,
  draftsPer30Days: 20,
  githubDraftsPer30Days: 20,
  loginCodesPerHour: 10,
} as const;
export const EMAIL_LIMITS = { loginCodesPerHour: 5 } as const;

// Vercel rejects function request bodies over 4.5 MB before our code runs, so stay under it with
// room for multipart overhead. Real resumes are almost always under 1 MB.
export const UPLOAD_LIMITS = { maxBytes: 4 * 1024 * 1024, maxPages: 6 } as const;
export const TEXT_LIMITS = { resumeChars: 40_000, jobPostChars: 20_000, bulletChars: 600 } as const;

export type Usage = { used: number; limit: number };
export type UsageSnapshot = Record<Feature, Usage>;
// The allowance period a snapshot counts: its kind and when it starts over (epoch ms).
export type UsagePeriod = { kind: AllowancePeriod; resetsAt: number };
