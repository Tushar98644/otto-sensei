import { z } from "zod";
import {
  BILLING_INTERVALS,
  PAID_PLANS,
  TEXT_LIMITS,
  type BillingInterval,
  type PaidPlanId,
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

// Client-safe contract for every API route. Routes validate bodies with these schemas; the client
// in ./client.ts is typed with the response types.

export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  // 403: sent from another website's page (see rejectCrossSite in @/lib/auth/route-guards).
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "limit_reached"
  // 402: the plan doesn't include this at all (Free has no AI help and no portfolio). The client
  // answers with the trial or upgrade prompt, never an error.
  | "upgrade_required"
  | "too_large"
  | "unsupported_type"
  | "parse_failed"
  | "ai_unavailable"
  | "ai_refused"
  | "billing_unavailable"
  // 409 (or 502/503 when Creem's side is the problem): the payment provider turned a plan change
  // down, or the last payment failed first. The message says why.
  | "plan_change_failed"
  // Sign-in code email: 502 when Supabase or its SMTP provider failed to send it.
  | "email_unavailable"
  // 503: sign-in (Supabase) isn't configured, or account deletion has no Supabase secret key.
  | "auth_unavailable"
  | "server_error";

export type ApiErrorBody = { ok: false; error: { code: ApiErrorCode; message: string } };

// POST /api/import, multipart/form-data with field "file" (PDF or DOCX). No account needed.
export type ImportResponse = {
  ok: true;
  resume: Resume;
  report: RecruiterReport;
  usedAI: boolean;
  // The plan's AI reads were used up, so the rule-based reader read it. Optional for older servers.
  basicReader?: boolean;
  // The rule-based read looked complete, so the AI reader wasn't needed and no AI read was spent.
  // POST /api/import?reader=ai asks for the AI reader anyway. Optional for older servers.
  readWell?: boolean;
};

// POST /api/check, multipart/form-data with field "file". Deterministic checks only, no AI.
export type CheckResponse = { ok: true; report: RecruiterReport };

// POST /api/fix. Requires sign-in; counts against the "fix" allowance.
export const FixRequestSchema = z.object({
  bullet: z.string().trim().min(1).max(TEXT_LIMITS.bulletChars),
  role: z.object({ title: z.string().max(200), company: z.string().max(200) }),
  answers: z
    .array(z.object({ question: z.string().max(300), answer: z.string().trim().max(500) }))
    .max(5)
    .default([]),
});
export type FixRequestBody = z.input<typeof FixRequestSchema>;
// demo: the server has no AI key, so the result is Otto's sample output, not a real rewrite.
export type FixResponse = { ok: true; result: FixResult; usage: UsageSnapshot; demo: boolean };

// POST /api/tailor. Requires sign-in; counts against the "tailor" allowance.
export const TailorRequestSchema = z.object({
  resume: ResumeSchema,
  job: z.object({
    text: z.string().trim().min(80).max(TEXT_LIMITS.jobPostChars),
    title: z.string().trim().max(200).default(""),
    company: z.string().trim().max(200).default(""),
  }),
});
export type TailorRequestBody = z.input<typeof TailorRequestSchema>;
// demo: as in FixResponse.
export type TailorResponse = {
  ok: true;
  result: TailorResult;
  usage: UsageSnapshot;
  demo: boolean;
};

// POST /api/letter. Requires sign-in; counts against the "letter" allowance.
export const LetterRequestSchema = TailorRequestSchema;
export type LetterRequestBody = z.input<typeof LetterRequestSchema>;
export type LetterResponse = {
  ok: true;
  result: CoverLetterResult;
  usage: UsageSnapshot;
  demo: boolean;
};

// POST /api/answer. Requires sign-in; shares the "letter" allowance with cover letters.
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

// POST /api/interview: an interview prep pack for one application, saved on it. Requires sign-in;
// shares the "letter" allowance. GET /api/interview/:applicationId: its job details and saved pack.
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

// POST /api/summary. Requires sign-in; counts against the "fix" allowance. "write" drafts two
// summaries from the resume's facts; "improve" tightens the person's own summary and sees nothing
// else, so it has nothing to add facts from.
export const SUMMARY_IMPROVE_CHARS = { min: 15, max: 3_000 } as const;
export const SummaryRequestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("write"), resume: ResumeSchema }),
  z.object({
    mode: z.literal("improve"),
    summary: z.string().trim().min(SUMMARY_IMPROVE_CHARS.min).max(SUMMARY_IMPROVE_CHARS.max),
  }),
]);
export type SummaryRequestBody = z.input<typeof SummaryRequestSchema>;
// "achievements" leads with the resume's strongest results, "role" with what the person does,
// "tightened" is the person's own summary made shorter and plainer.
export type SummaryOptionKind = "achievements" | "role" | "tightened";
export type SummaryOption = {
  kind: SummaryOptionKind;
  // 2-3 sentences. "[number]" marks a figure Otto couldn't find in the resume.
  text: string;
  // Plain-language things to check before using it.
  warnings: string[];
};
// write: 1-2 options (one may be dropped by the guards); improve: exactly 1.
export type SummaryResult = { options: SummaryOption[] };
export type SummaryResponse = {
  ok: true;
  result: SummaryResult;
  usage: UsageSnapshot;
  demo: boolean;
};

// POST /api/job. Reads a job post from its link, as input for POST /api/tailor. No account needed.
export const JobRequestSchema = z.object({ url: z.string().max(2048) });
export type JobRequestBody = z.input<typeof JobRequestSchema>;
export type JobSource =
  "greenhouse" | "lever" | "ashby" | "workable" | "recruitee" | "personio" | "jsonld" | "page";
export type JobPosting = {
  // The board's own link for the job when it has one, else the page that was read.
  url: string;
  source: JobSource;
  // Each "" when the source doesn't say.
  title: string;
  company: string;
  location: string;
  // Plain text, "- " list items, at most TEXT_LIMITS.jobPostChars.
  text: string;
  // Epoch ms. firstPostedAt is when the job first went up; updatedAt is its last edit, which is not
  // a posting date. closesAt is the closing date the post gives, if any.
  firstPostedAt: number | null;
  updatedAt: number | null;
  closesAt: number | null;
  // The application form's yes/no and pick-a-choice questions. Only Greenhouse's API lists them,
  // and only when there are some.
  questions?: ScreeningQuestion[];
};
export type JobResponse = { ok: true; posting: JobPosting };

// POST /api/auth/request-code. Supabase emails the code. devCode: development's dev sign-in only,
// where no email is sent and the form shows the code instead.
export const RequestCodeSchema = z.object({ email: z.email().max(254) });
export type RequestCodeResponse = { ok: true; devCode?: string };

// POST /api/auth/google. url: Google's consent page; it comes back to /auth/callback?next=<next>.
export const GoogleSignInSchema = z.object({ next: z.string().max(512).optional() });
export type GoogleSignInResponse = { ok: true; url: string };

// POST /api/auth/verify. Sets the session cookies.
export const VerifyCodeSchema = z.object({
  email: z.email().max(254),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code."),
});
export type VerifyCodeResponse = { ok: true; user: SessionUser };

// GET /api/me
export type MeResponse = {
  ok: true;
  user: SessionUser | null;
  usage: UsageSnapshot | null;
  // The period usage counts in: a billing month (renewal to renewal; the calendar month on Free and
  // on paid rows with no billing period yet), a weekly subscriber's billing week, or a trial.
  period: UsagePeriod | null;
  // offer: how often each paid plan can bill here, "month" first; a plan with none isn't on sale.
  // trial: Pro monthly would start with the free trial (signed out: a new account would). Optional
  // for servers from before trials.
  billing: { mode: BillingMode; offer: Record<PaidPlanId, BillingInterval[]>; trial?: boolean };
  auth: { mode: AuthMode };
};

// GET /api/resumes, PUT /api/resumes/:id (body: Resume), DELETE /api/resumes/:id. Requires sign-in.
export const PutResumeSchema = ResumeSchema;
// deletedIds: resumes deleted from the account (newest first, capped). A browser drops its own
// copies of these instead of uploading them again.
export type ResumesResponse = { ok: true; resumes: Resume[]; deletedIds: string[] };
// deleted: the resume was deleted on another device, so nothing was saved and the sender should
// drop its copy.
export type PutResumeResponse = { ok: true; deleted: boolean };

// GET /api/applications?cursor=…, POST /api/applications, PATCH /api/applications (one status for
// many), PATCH/DELETE /api/applications/:id. Requires sign-in. Lists are newest applied first, one
// page at a time (APPLICATION_LIMITS.pageSize); nextCursor is null on the last page.
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
// GET /api/applications/:id: the application and everything linked to it.
export type { ApplicationThread } from "@/lib/applications/thread";
export type ApplicationThreadResponse = { ok: true; thread: ApplicationThread };
// The applications that changed; ones already on that status are left out.
export type BulkApplicationsResponse = { ok: true; applications: Application[] };

// POST /api/draft: "Build with Otto". No account needed; limited per device and IP like imports.
// The person's name and contact details stay in the browser and never reach this route.
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
// usedAI is false when the AI is off or failed: the draft is then the person's own lines, as typed.
export type DraftResponse = { ok: true; resume: Resume; usedAI: boolean };

// POST /api/auth/logout, DELETE /api/account
export type EmptyOk = { ok: true };

// POST /api/billing/checkout, POST /api/billing/portal. Requires sign-in.
export type UrlResponse = { ok: true; url: string };
// The checkout body. Sending none at all still means Pro, monthly. Someone already on a paid plan
// who picks the other one has their subscription changed instead of a second checkout.
export const CheckoutRequestSchema = z.object({
  plan: z.enum(PAID_PLANS).default("pro"),
  interval: z.enum(BILLING_INTERVALS).default("month"),
});
export type CheckoutRequestBody = z.input<typeof CheckoutRequestSchema>;

// POST /api/feedback. Works signed out; limited per device, IP and account.
export { FeedbackRequestSchema } from "@/lib/feedback/validation";
export type { FeedbackKind, FeedbackRequestBody } from "@/lib/feedback/types";

// GET /api/referrals: the signed-in account's invite link and counts. POST /api/referrals/claim
// (body {}): links a new account to the invite in the otto_ref cookie, if any.
export type { ReferralClaimOutcome, ReferralSummary } from "@/lib/referrals/referrals";
export type ReferralSummaryResponse = { ok: true; referrals: ReferralSummary };
export type ReferralClaimResponse = { ok: true; outcome: ReferralClaimOutcome };

// GET/POST /api/share, PATCH/DELETE /api/share/:id. Requires sign-in. The public page is /s/:slug.
export { CreateShareSchema, UpdateShareSchema } from "@/lib/share/validation";
export type {
  CreateShareBody,
  SharedLink,
  ShareResponse,
  SharesResponse,
  UpdateShareBody,
} from "@/lib/share/types";

// GET/POST/PATCH /api/portfolio, GET /api/portfolio/slug, POST /api/portfolio/views. Sign-in,
// except views (sent by the public page /p/:slug).
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

// GET /api/profile, PUT /api/profile (body: the whole work profile). Requires sign-in; PUT is Pro.
export { WorkProfileSchema } from "@/lib/eligibility/validation";
export type { WorkProfile, WorkProfileBody, WorkProfileResponse } from "@/lib/eligibility/profile";

// POST /api/jobs/matches (jobs ranked for one resume, or the saved ones), GET /api/jobs/saved (the
// saved ones, unranked, for the Applications board), PUT/DELETE /api/jobs/saved/:id, POST /api/jobs/events (what was done with a match). Requires sign-in.
// Free sees its closest few matches; filters, paging, saving and the full list are Pro.
// PUT /api/jobs/looking-for (the "Looking for" card's choices; any plan). GET
// /api/jobs/occupations?q= (the card's search over every occupation; no account needed).
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

// GET/PATCH /api/notifications, GET/PUT /api/notifications/settings. Requires sign-in.
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
