import type { BillingHistoryResponse } from "@/lib/billing/history-types";
import { REQUEST_ID_HEADER, RESUME_HEADER, type MeteredRun } from "@/lib/api/request-id";
import {
  dropSeeds,
  listFromVersions,
  takeSeed,
  type ResumeVersions,
  type SeedKey,
} from "@/lib/api/seeds";
import type { GitHubConnectionResponse } from "@/lib/github/connect";
import { JOBS_PREFETCH_HEADER } from "@/lib/job-feed/prefetch-header";
import type { ImpressionBatchInput } from "@/lib/job-feed/types";
import type {
  GitHubConnectBody,
  GitHubDraftBody,
  GitHubDraftResponse,
  GitHubLookupBody,
  GitHubLookupResponse,
} from "@/lib/github/types";
import type {
  EmailChoicesBody,
  EmailChoicesResponse,
  FollowUpActionResponse,
  MarkNotificationsReadBody,
  MarkNotificationsReadResponse,
  NotificationsResponse,
  ReminderSettingsBody,
  ReminderSettingsResponse,
  SessionFollowUpActionBody,
} from "@/lib/notifications/types";
import type { Resume } from "@/lib/resume/schema";
import type {
  KnownResumes,
  PutResumeOptions,
  PutResumeResult,
  ResumeList,
} from "@/lib/sync/api-types";
import type {
  AccountSetupChange,
  AccountSetupResponse,
  SetupDefaults,
  SetupDefaultsResponse,
} from "@/lib/setup/types";
import type {
  CreateShareBody,
  ShareResponse,
  SharesResponse,
  UpdateShareBody,
} from "@/lib/share/types";
import type {
  CreatePortfolioBody,
  PortfolioResponse,
  PortfolioSaveResponse,
  PortfolioSlugResponse,
  UpdatePortfolioBody,
} from "@/lib/portfolio/types";
import type {
  ContentResponse,
  GitHubRefreshResponse,
  SaveContentBody,
} from "@/lib/portfolio/content";
import type {
  CreateWritingBody,
  OutreachLookup,
  OutreachWritingResponse,
  UpdateWritingBody,
  WritingResponse,
  WritingsResponse,
} from "@/lib/writings/schema";
import type { WritingStyleBody, WritingStyleResponse } from "@/lib/writing-style/schema";
import type {
  AnswerRequestBody,
  AnswerResponse,
  ApiErrorBody,
  ApiErrorCode,
  ApiErrorReason,
  ApplicationResponse,
  ApplicationsResponse,
  ApplicationThreadResponse,
  BulkApplicationStatusBody,
  BulkApplicationsResponse,
  CheckResponse,
  CheckoutRequestBody,
  CreateApplicationBody,
  DraftRequestBody,
  DraftResponse,
  EmptyOk,
  FeedbackRequestBody,
  FixRequestBody,
  FixResponse,
  GoogleSignInResponse,
  ImportResponse,
  InterviewPacksResponse,
  InterviewPrepResponse,
  InterviewRequestBody,
  InterviewResponse,
  JobMatchesRequestBody,
  LookingForChoice,
  LookingForResponse,
  OccupationSearchResponse,
  JobMatchesResponse,
  JobPostResponse,
  JobRequestBody,
  MatchActionInput,
  JobResponse,
  LetterRequestBody,
  LetterResponse,
  MeResponse,
  OutreachRequestBody,
  OutreachResponse,
  ReferralClaimResponse,
  ReferralSummaryResponse,
  RequestCodeResponse,
  SavedJobResponse,
  SavedJobsResponse,
  SummaryRequestBody,
  SummaryResponse,
  TailorRequestBody,
  TailorResponse,
  TranscribeResponse,
  UpdateApplicationBody,
  UrlResponse,
  VerifyCodeResponse,
  WorkProfileBody,
  WorkProfileResponse,
} from "./types";

export class ApiClientError extends Error {
  readonly code: ApiErrorCode | "network_error";
  readonly status: number;
  readonly reason?: ApiErrorReason;

  constructor(
    code: ApiErrorCode | "network_error",
    message: string,
    status: number,
    reason?: ApiErrorReason,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    if (reason) this.reason = reason;
  }
}

export function isApiError(error: unknown, code?: ApiClientError["code"]): error is ApiClientError {
  return error instanceof ApiClientError && (code === undefined || error.code === code);
}

export function isBudgetReached(error: unknown): boolean {
  return isApiError(error, "limit_reached") && error.reason === "ai_budget";
}

// POSTs that only read: they leave the layout's answers (lib/api/seeds) standing.
const READ_ONLY_POSTS: ReadonlySet<string> = new Set(["/api/resumes", "/api/jobs/matches"]);

function isWrite(path: string, init?: RequestInit): boolean {
  const method = init?.method?.toUpperCase() ?? "GET";
  return method !== "GET" && method !== "HEAD" && !(method === "POST" && READ_ONLY_POSTS.has(path));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (isWrite(path, init)) dropSeeds();
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiClientError("network_error", "Can't reach the server. Check your connection.", 0);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {}
  if (!res.ok || (body as { ok?: unknown } | null)?.ok !== true) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiClientError(
      error?.code ?? "server_error",
      error?.message ?? "Something went wrong. Please try again.",
      res.status,
      error?.reason,
    );
  }
  return body as T;
}

function seeded<T>(
  key: SeedKey,
  ask: () => Promise<T>,
  answer: (body: unknown) => T | null = (body) => body as T,
): Promise<T> {
  const seed = takeSeed(key);
  if (!seed) return ask();
  return seed.then((body) => (body === null ? null : answer(body)) ?? ask());
}

const postJson = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function withRun(init: RequestInit, run: MeteredRun): RequestInit {
  const headers = new Headers(init.headers);
  headers.set(REQUEST_ID_HEADER, run.id);
  if (run.resume) headers.set(RESUME_HEADER, "1");
  return { ...init, headers };
}

function fileForm(file: Blob, filename?: string): FormData {
  const form = new FormData();
  if (filename) form.append("file", file, filename);
  else form.append("file", file);
  return form;
}

function clipForm(clip: Blob, seconds: number): FormData {
  const form = fileForm(clip, `speech.${/^\w+\/(\w+)/.exec(clip.type)?.[1] ?? "audio"}`);
  form.append("seconds", seconds.toFixed(1));
  return form;
}

export const api = {
  importFile: (file: File, { reader }: { reader?: "ai" } = {}) =>
    request<ImportResponse>(reader === "ai" ? "/api/import?reader=ai" : "/api/import", {
      method: "POST",
      body: fileForm(file),
    }),
  draft: (body: DraftRequestBody) => request<DraftResponse>("/api/draft", postJson(body)),
  checkFile: (file: Blob, filename: string) =>
    request<CheckResponse>("/api/check", { method: "POST", body: fileForm(file, filename) }),
  fix: (body: FixRequestBody) => request<FixResponse>("/api/fix", postJson(body)),
  transcribe: (clip: Blob, seconds: number, signal?: AbortSignal) =>
    request<TranscribeResponse>("/api/transcribe", {
      method: "POST",
      body: clipForm(clip, seconds),
      signal,
    }),
  tailor: (body: TailorRequestBody, run: MeteredRun) =>
    request<TailorResponse>("/api/tailor", withRun(postJson(body), run)),
  letter: (body: LetterRequestBody) => request<LetterResponse>("/api/letter", postJson(body)),
  answer: (body: AnswerRequestBody) => request<AnswerResponse>("/api/answer", postJson(body)),
  outreach: (body: OutreachRequestBody) =>
    request<OutreachResponse>("/api/outreach", postJson(body)),
  interview: (body: InterviewRequestBody) =>
    request<InterviewResponse>("/api/interview", postJson(body)),
  interviewPrep: (applicationId: string) =>
    request<InterviewPrepResponse>(`/api/interview/${encodeURIComponent(applicationId)}`, {
      cache: "no-store",
    }),
  interviewPacks: () =>
    seeded("interviewPacks", () =>
      request<InterviewPacksResponse>("/api/interview", { cache: "no-store" }),
    ),
  writings: () =>
    seeded("writings", () => request<WritingsResponse>("/api/writings", { cache: "no-store" })),
  saveWriting: (body: CreateWritingBody) =>
    request<WritingResponse>("/api/writings", postJson(body)),
  editWriting: (id: string, body: UpdateWritingBody) =>
    request<WritingResponse>(`/api/writings/${encodeURIComponent(id)}`, postJson(body, "PATCH")),
  deleteWriting: (id: string, { keepalive = false }: { keepalive?: boolean } = {}) =>
    request<EmptyOk>(`/api/writings/${encodeURIComponent(id)}`, { method: "DELETE", keepalive }),
  outreachWriting: (lookup: OutreachLookup) =>
    request<OutreachWritingResponse>(`/api/writings/outreach?${new URLSearchParams(lookup)}`, {
      cache: "no-store",
    }),
  summary: (body: SummaryRequestBody) => request<SummaryResponse>("/api/summary", postJson(body)),
  readJob: (body: JobRequestBody) => request<JobResponse>("/api/job", postJson(body)),
  jobMatches: (body: JobMatchesRequestBody, { prefetch = false }: { prefetch?: boolean } = {}) =>
    request<JobMatchesResponse>("/api/jobs/matches", {
      ...postJson(body),
      ...(prefetch
        ? { headers: { "content-type": "application/json", [JOBS_PREFETCH_HEADER]: "1" } }
        : {}),
    }),
  jobPost: (id: string) =>
    request<JobPostResponse>(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" }),
  savedJobs: () =>
    seeded("savedJobs", () => request<SavedJobsResponse>("/api/jobs/saved", { cache: "no-store" })),
  saveJob: (id: string) =>
    request<SavedJobResponse>(`/api/jobs/saved/${encodeURIComponent(id)}`, { method: "PUT" }),
  unsaveJob: (id: string) =>
    request<SavedJobResponse>(`/api/jobs/saved/${encodeURIComponent(id)}`, { method: "DELETE" }),
  saveLookingFor: (body: LookingForChoice) =>
    request<LookingForResponse>("/api/jobs/looking-for", postJson(body, "PUT")),
  searchOccupations: (query: string, signal?: AbortSignal) =>
    request<OccupationSearchResponse>(`/api/jobs/occupations?q=${encodeURIComponent(query)}`, {
      signal,
    }),
  jobEvent: (body: MatchActionInput) =>
    request<EmptyOk>("/api/jobs/events", { ...postJson(body), keepalive: true }),
  jobImpressions: (body: ImpressionBatchInput) =>
    request<EmptyOk>("/api/jobs/events", { ...postJson(body), keepalive: true }),
  me: () => request<MeResponse>("/api/me", { cache: "no-store" }),
  requestCode: (email: string) =>
    request<RequestCodeResponse>("/api/auth/request-code", postJson({ email })),
  verifyCode: (email: string, code: string) =>
    request<VerifyCodeResponse>("/api/auth/verify", postJson({ email, code })),
  googleSignIn: (next: string) =>
    request<GoogleSignInResponse>("/api/auth/google", postJson({ next })),
  logout: () => request<EmptyOk>("/api/auth/logout", { method: "POST" }),
  listResumes: (known?: KnownResumes) =>
    known
      ? seeded(
          "resumeVersions",
          () => request<ResumeList>("/api/resumes", postJson({ known })),
          (versions) => listFromVersions(versions as ResumeVersions, known),
        )
      : request<ResumeList>("/api/resumes", { cache: "no-store" }),
  putResume: (resume: Resume, { base, keepalive = false }: PutResumeOptions = {}) =>
    request<PutResumeResult>(
      `/api/resumes/${encodeURIComponent(resume.id)}${base === undefined ? "" : `?base=${base}`}`,
      { ...postJson(resume, "PUT"), keepalive },
    ),
  deleteResume: (id: string) =>
    request<EmptyOk>(`/api/resumes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listApplications: (cursor: string | null = null) =>
    cursor === null
      ? seeded("applications", () =>
          request<ApplicationsResponse>("/api/applications", { cache: "no-store" }),
        )
      : request<ApplicationsResponse>(`/api/applications?cursor=${encodeURIComponent(cursor)}`, {
          cache: "no-store",
        }),
  applicationThread: (id: string) =>
    request<ApplicationThreadResponse>(`/api/applications/${encodeURIComponent(id)}`, {
      cache: "no-store",
    }),
  createApplication: (body: CreateApplicationBody) =>
    request<ApplicationResponse>("/api/applications", postJson(body)),
  updateApplication: (id: string, body: UpdateApplicationBody) =>
    request<ApplicationResponse>(
      `/api/applications/${encodeURIComponent(id)}`,
      postJson(body, "PATCH"),
    ),
  setApplicationsStatus: (body: BulkApplicationStatusBody) =>
    request<BulkApplicationsResponse>("/api/applications", postJson(body, "PATCH")),
  deleteApplication: (id: string, { keepalive = false }: { keepalive?: boolean } = {}) =>
    request<EmptyOk>(`/api/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
      keepalive,
    }),
  checkout: (
    plan: CheckoutRequestBody["plan"] = "pro",
    interval: CheckoutRequestBody["interval"] = "month",
    next?: string | null,
  ) =>
    request<UrlResponse>(
      "/api/billing/checkout",
      postJson({ plan, interval, ...(next ? { next } : {}) } satisfies CheckoutRequestBody),
    ),
  feedback: (body: FeedbackRequestBody) => request<EmptyOk>("/api/feedback", postJson(body)),
  referrals: () => request<ReferralSummaryResponse>("/api/referrals", { cache: "no-store" }),
  claimReferral: () => request<ReferralClaimResponse>("/api/referrals/claim", postJson({})),
  portal: () => request<UrlResponse>("/api/billing/portal", { method: "POST" }),
  billingHistory: () =>
    request<BillingHistoryResponse>("/api/billing/history", { cache: "no-store" }),
  deleteAccount: () => request<EmptyOk>("/api/account", { method: "DELETE" }),
  workProfile: () =>
    seeded("workProfile", () =>
      request<WorkProfileResponse>("/api/profile", { cache: "no-store" }),
    ),
  saveWorkProfile: (body: WorkProfileBody) =>
    request<WorkProfileResponse>("/api/profile", postJson(body, "PUT")),
  githubConnection: () =>
    seeded("githubConnection", () =>
      request<GitHubConnectionResponse>("/api/github/connection", { cache: "no-store" }),
    ),
  connectGitHub: (body: GitHubConnectBody) =>
    request<UrlResponse>("/api/github/connection", postJson(body)),
  disconnectGitHub: () =>
    request<GitHubConnectionResponse>("/api/github/connection", { method: "DELETE" }),
  githubLookup: (body: GitHubLookupBody) =>
    request<GitHubLookupResponse>("/api/github/lookup", postJson(body)),
  githubDraft: (body: GitHubDraftBody) =>
    request<GitHubDraftResponse>("/api/github/draft", postJson(body)),
  notifications: () =>
    seeded("notifications", () =>
      request<NotificationsResponse>("/api/notifications", { cache: "no-store" }),
    ),
  markNotificationsRead: (body: MarkNotificationsReadBody) =>
    request<MarkNotificationsReadResponse>("/api/notifications", postJson(body, "PATCH")),
  followUpAction: (body: SessionFollowUpActionBody) =>
    request<FollowUpActionResponse>("/api/notifications/follow-up", postJson(body)),
  accountSetup: () =>
    seeded("accountSetup", () =>
      request<AccountSetupResponse>("/api/setup", { cache: "no-store" }),
    ),
  saveAccountSetup: (body: AccountSetupChange) =>
    request<AccountSetupResponse>("/api/setup", postJson(body, "PUT")),
  saveSetupDefaults: (body: SetupDefaults) =>
    request<SetupDefaultsResponse>("/api/setup/defaults", postJson(body)),
  writingStyle: () => request<WritingStyleResponse>("/api/writing-style", { cache: "no-store" }),
  saveWritingStyle: (body: WritingStyleBody) =>
    request<WritingStyleResponse>("/api/writing-style", postJson(body, "PUT")),
  reminderSettings: () =>
    seeded("reminderSettings", () =>
      request<ReminderSettingsResponse>("/api/notifications/settings", { cache: "no-store" }),
    ),
  saveReminderSettings: (body: ReminderSettingsBody) =>
    request<ReminderSettingsResponse>("/api/notifications/settings", postJson(body, "PUT")),
  emailChoices: () =>
    request<EmailChoicesResponse>("/api/notifications/emails", { cache: "no-store" }),
  saveEmailChoices: (body: EmailChoicesBody) =>
    request<EmailChoicesResponse>("/api/notifications/emails", postJson(body, "PUT")),
  shares: () =>
    seeded("shares", () => request<SharesResponse>("/api/share", { cache: "no-store" })),
  share: (body: CreateShareBody) => request<ShareResponse>("/api/share", postJson(body)),
  updateShare: (id: string, body: UpdateShareBody) =>
    request<ShareResponse>(`/api/share/${encodeURIComponent(id)}`, postJson(body, "PATCH")),
  revokeShare: (id: string, { keepalive = false }: { keepalive?: boolean } = {}) =>
    request<EmptyOk>(`/api/share/${encodeURIComponent(id)}`, { method: "DELETE", keepalive }),
  portfolio: () =>
    seeded("portfolio", () => request<PortfolioResponse>("/api/portfolio", { cache: "no-store" })),
  createPortfolio: (body: CreatePortfolioBody) =>
    request<PortfolioSaveResponse>("/api/portfolio", postJson(body)),
  updatePortfolio: (body: UpdatePortfolioBody) =>
    request<PortfolioSaveResponse>("/api/portfolio", postJson(body, "PATCH")),
  checkPortfolioSlug: (value: string) =>
    request<PortfolioSlugResponse>(`/api/portfolio/slug?value=${encodeURIComponent(value)}`, {
      cache: "no-store",
    }),
  deletePortfolio: () => request<EmptyOk>("/api/portfolio", { method: "DELETE" }),
  portfolioContent: () => request<ContentResponse>("/api/portfolio/content", { cache: "no-store" }),
  savePortfolioContent: (
    body: SaveContentBody,
    { keepalive = false }: { keepalive?: boolean } = {},
  ) => request<ContentResponse>("/api/portfolio/content", { ...postJson(body, "PUT"), keepalive }),
  refreshPortfolioGitHub: () =>
    request<GitHubRefreshResponse>("/api/portfolio/github", { method: "POST" }),
};
