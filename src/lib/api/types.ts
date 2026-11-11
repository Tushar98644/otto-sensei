import { z } from "zod";
import {
  BILLING_INTERVALS,
  PAID_PLANS,
  TEXT_LIMITS,
  type BillingInterval,
  type PaidPlanId,
  type Usage,
  type UsagePeriod,
  type UsageSnapshot,
} from "@/config/plans";
import type { AnswerResult, CoverLetterResult, FixResult, TailorResult } from "@/lib/ai/types";
import type { Application } from "@/lib/applications/schema";
import type { ApplicationThread } from "@/lib/applications/thread";
import type { ScreeningQuestion } from "@/lib/ats/types";
import type { AuthMode, SessionUser } from "@/lib/auth/types";
import type { BillingMode } from "@/lib/billing/types";
import type { ReferralClaimOutcome, ReferralSummary } from "@/lib/referrals/referrals";
import type { RecruiterReport } from "@/lib/checks/types";
import type { InterviewPrep, InterviewResult, PrepSummary, PrepTarget } from "@/lib/insights/prep";
import { type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";

// Routes validate bodies with these schemas; ./client.ts is typed with the response types.

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  // 403: sent from another website's page (rejectCrossSite).
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "limit_reached"
  // 402: not on this plan. The client answers with the trial or upgrade prompt, never an error.
  | "upgrade_required"
  | "too_large"
  | "unsupported_type"
  | "parse_failed"
  | "ai_unavailable"
  | "ai_refused"
  | "billing_unavailable"
  // 409 (or 502/503 when Creem fails): the provider turned a plan change down; the message says
  // why.
  | "plan_change_failed"
  | "email_unavailable"
  | "auth_unavailable"
  // 403: no GitHub connected, or a different GitHub account asked about.
  | "github_not_connected"
  | "server_error";

// "ai_budget": the period's AI token budget, not the feature's own limit.
export type ApiErrorReason = "ai_budget";

export type ApiErrorBody = {
  ok: false;
  error: { code: ApiErrorCode; message: string; reason?: ApiErrorReason };
};

// No account needed.
export type ImportResponse = {
  ok: true;
  resume: Resume;
  report: RecruiterReport;
  usedAI: boolean;
  // The plan's AI reads were used up. Optional for older servers.
  basicReader?: boolean;
  // The rules read it well, so no AI read was spent; ?reader=ai asks anyway. Optional for older
  // servers.
  readWell?: boolean;
};

// Deterministic checks only, no AI.
export type CheckResponse = { ok: true; report: RecruiterReport };

export const FixRequestSchema = z.object({
  bullet: z.string().trim().min(1).max(TEXT_LIMITS.bulletChars),
  role: z.object({ title: z.string().max(200), company: z.string().max(200) }),
  answers: z
    .array(z.object({ question: z.string().max(300), answer: z.string().trim().max(500) }))
    .max(5)
    .default([]),
});
export type FixRequestBody = z.input<typeof FixRequestSchema>;
// demo: no AI key, so the result is sample output.
export type FixResponse = { ok: true; result: FixResult; usage: UsageSnapshot; demo: boolean };

export const TailorRequestSchema = z.object({
  resume: ResumeSchema,
  job: z.object({
    text: z.string().trim().min(80).max(TEXT_LIMITS.jobPostChars),
    title: z.string().trim().max(200).default(""),
    company: z.string().trim().max(200).default(""),
  }),
});
export type TailorRequestBody = z.input<typeof TailorRequestSchema>;
export type TailorResponse = {
  ok: true;
  result: TailorResult;
  usage: UsageSnapshot;
  demo: boolean;
};

export const LetterRequestSchema = TailorRequestSchema;
export type LetterRequestBody = z.input<typeof LetterRequestSchema>;
export type LetterResponse = {
  ok: true;
  result: CoverLetterResult;
  usage: UsageSnapshot;
  demo: boolean;
};

// Shares the "letter" allowance with cover letters.
export const AnswerRequestSchema = TailorRequestSchema.extend({
  question: z.string().trim().min(8).max(500),
});
export type AnswerRequestBody = z.input<typeof AnswerRequestSchema>;
export type AnswerResponse = {
  ok: true;
  result: AnswerResult;
  usage: UsageSnapshot;
  demo: boolean;
};

// Shares the "letter" allowance.
export { InterviewRequestSchema } from "@/lib/insights/prep";
export type {
  InterviewPrep,
  InterviewRequestBody,
  InterviewResult,
  PrepQuestion,
  PrepSummary,
  PrepTarget,
  StarStory,
} from "@/lib/insights/prep";
export type InterviewResponse = {
  ok: true;
  result: InterviewResult;
  usage: UsageSnapshot;
  demo: boolean;
};
export type InterviewPrepResponse = { ok: true; target: PrepTarget; prep: InterviewPrep | null };
export type InterviewPacksResponse = { ok: true; packs: PrepSummary[] };

// Counts against "fix". "improve" sees only the person's own summary, so it has nothing to add
// facts from.
export const SUMMARY_IMPROVE_CHARS = { min: 15, max: 3_000 } as const;
export const SummaryRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("write"), resume: ResumeSchema }),
  z.object({
    mode: z.literal("improve"),
    summary: z.string().trim().min(SUMMARY_IMPROVE_CHARS.min).max(SUMMARY_IMPROVE_CHARS.max),
  }),
]);
export type SummaryRequestBody = z.input<typeof SummaryRequestSchema>;
export type SummaryOptionKind = "achievements" | "role" | "tightened";
export type SummaryOption = {
  kind: SummaryOptionKind;
  // "[number]" marks a figure Otto couldn't find in the resume.
  text: string;
  warnings: string[];
};
// write: 1-2 options (the guards may drop one); improve: exactly 1.
export type SummaryResult = { options: SummaryOption[] };
export type SummaryResponse = {
  ok: true;
  result: SummaryResult;
  usage: UsageSnapshot;
  demo: boolean;
};

// No account needed.
export const JobRequestSchema = z.object({ url: z.string().max(2048) });
export type JobRequestBody = z.input<typeof JobRequestSchema>;
export type JobSource =
  "greenhouse" | "lever" | "ashby" | "workable" | "recruitee" | "personio" | "jsonld" | "page";
export type JobPosting = {
  url: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  text: string;
  // updatedAt is the last edit, not a posting date.
  firstPostedAt: number | null;
  updatedAt: number | null;
  closesAt: number | null;
  // Only Greenhouse's API lists them.
  questions?: ScreeningQuestion[];
};
export type JobResponse = { ok: true; posting: JobPosting };

// devCode: dev sign-in only, where the form shows the code instead of emailing it.
export const RequestCodeSchema = z.object({ email: z.email().max(254) });
export type RequestCodeResponse = { ok: true; devCode?: string };

export const GoogleSignInSchema = z.object({ next: z.string().max(512).optional() });
export type GoogleSignInResponse = { ok: true; url: string };

export const VerifyCodeSchema = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});
export type VerifyCodeResponse = { ok: true; user: SessionUser };

export type MeResponse = {
  ok: true;
  user: SessionUser | null;
  usage: UsageSnapshot | null;
  // Calendar month on Free and on paid rows with no billing period yet.
  period: UsagePeriod | null;
  // null on Free and signed out. Optional for older servers.
  aiBudget?: Usage | null;
  // offer: a plan with no intervals isn't on sale. trial: Pro monthly would start with the trial.
  billing: { mode: BillingMode; offer: Record<PaidPlanId, BillingInterval[]>; trial?: boolean };
  auth: { mode: AuthMode };
};

export const PutResumeSchema = ResumeSchema;
// deletedIds: a browser drops its own copies of these instead of uploading them again.
export type ResumesResponse = { ok: true; resumes: Resume[]; deletedIds: string[] };
// deleted: deleted on another device, so nothing was saved and the sender should drop its copy.
export type PutResumeResponse = { ok: true; deleted: boolean };

// Lists are newest applied first, paged by APPLICATION_LIMITS.pageSize; nextCursor null on the
// last.
export {
  BulkApplicationStatusSchema,
  CreateApplicationSchema,
  UpdateApplicationSchema,
} from "@/lib/applications/validation";
export type {
  Application,
  BulkApplicationStatusBody,
  CreateApplicationBody,
  UpdateApplicationBody,
} from "@/lib/applications/schema";
export type ApplicationsResponse = {
  ok: true;
  applications: Application[];
  nextCursor: string | null;
};
export type ApplicationResponse = { ok: true; application: Application };
export type { ApplicationThread } from "@/lib/applications/thread";
export type ApplicationThreadResponse = { ok: true; thread: ApplicationThread };
// Ones already on that status are left out.
export type BulkApplicationsResponse = { ok: true; applications: Application[] };

// No account needed; limited per device and IP. The person's name and contacts never reach this
// route.
export const DRAFT_LIMITS = { jobs: 6, notesPerJob: 4, noteChars: 400 } as const;
export const DraftJobSchema = z.object({
  company: z.string().trim().max(200),
  title: z.string().trim().min(1).max(200),
  startDate: z.string().trim().max(50),
  endDate: z.string().trim().max(50),
  notes: z
    .array(z.string().trim().max(DRAFT_LIMITS.noteChars))
    .max(DRAFT_LIMITS.notesPerJob)
    .transform((notes) => notes.filter(Boolean))
    .refine((notes) => notes.length > 0, "Add at least one thing you did."),
});
export const DraftRequestSchema = z.object({
  targetRole: z.string().trim().min(1).max(200),
  jobs: z.array(DraftJobSchema).min(1).max(DRAFT_LIMITS.jobs),
});
export type DraftRequestBody = z.input<typeof DraftRequestSchema>;
export type DraftRequest = z.output<typeof DraftRequestSchema>;
// usedAI is false when the AI is off or failed: the draft is the person's own lines.
export type DraftResponse = { ok: true; resume: Resume; usedAI: boolean };

export type EmptyOk = { ok: true };

export type UrlResponse = { ok: true; url: string };
// No body still means Pro, monthly. A subscriber picking the other plan is changed, not re-checked
// out.
export const CheckoutRequestSchema = z.object({
  plan: z.enum(PAID_PLANS).default("pro"),
  interval: z.enum(BILLING_INTERVALS).default("month"),
});
export type CheckoutRequestBody = z.input<typeof CheckoutRequestSchema>;

export { FeedbackRequestSchema } from "@/lib/feedback/validation";
export type { FeedbackKind, FeedbackRequestBody } from "@/lib/feedback/types";

export type { ReferralClaimOutcome, ReferralSummary } from "@/lib/referrals/referrals";
export type ReferralSummaryResponse = { ok: true; referrals: ReferralSummary };
export type ReferralClaimResponse = { ok: true; outcome: ReferralClaimOutcome };

export { CreateShareSchema, UpdateShareSchema } from "@/lib/share/validation";
export type {
  CreateShareBody,
  SharedLink,
  ShareResponse,
  SharesResponse,
  UpdateShareBody,
} from "@/lib/share/types";

export {
  CreatePortfolioSchema,
  PortfolioViewSchema,
  UpdatePortfolioSchema,
} from "@/lib/portfolio/validation";
export type {
  CreatePortfolioBody,
  Portfolio,
  PortfolioResponse,
  PortfolioSaveResponse,
  PortfolioSlugResponse,
  UpdatePortfolioBody,
} from "@/lib/portfolio/types";

// PUT is Pro.
export { WorkProfileSchema } from "@/lib/eligibility/validation";
export type { WorkProfile, WorkProfileBody, WorkProfileResponse } from "@/lib/eligibility/profile";

// Free sees its closest few matches; filters, paging, saving and the full list are Pro.
export {
  JobMatchesRequestSchema,
  LookingForChoiceSchema,
  MatchActionSchema,
} from "@/lib/job-feed/validation";
export type {
  JobMatchesRequestBody,
  JobMatchesResponse,
  LookingFor,
  LookingForChoice,
  LookingForResponse,
  OccupationOption,
  OccupationSearchResponse,
  JobPostResponse,
  MatchActionInput,
  MatchedJob,
  SavedJob,
  SavedJobResponse,
  SavedJobsResponse,
} from "@/lib/job-feed/types";

export {
  MarkNotificationsReadSchema,
  ReminderSettingsSchema,
} from "@/lib/notifications/validation";
export type {
  MarkNotificationsReadBody,
  MarkNotificationsReadResponse,
  Notification,
  NotificationsResponse,
  ReminderSettingsBody,
  ReminderSettingsResponse,
} from "@/lib/notifications/types";
