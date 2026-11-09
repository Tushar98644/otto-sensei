import type {
  GitHubDraftBody,
  GitHubDraftResponse,
  GitHubLookupBody,
  GitHubLookupResponse,
} from "@/lib/github/types";
import type {
  MarkNotificationsReadBody,
  MarkNotificationsReadResponse,
  NotificationsResponse,
  ReminderSettingsBody,
  ReminderSettingsResponse,
} from "@/lib/notifications/types";
import type { Resume } from "@/lib/resume/schema";
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
  MediaUploadResponse,
  SaveContentBody,
} from "@/lib/portfolio/content";
import type { MediaKind } from "@/lib/portfolio/media";
import type {
  CreateWritingBody,
  UpdateWritingBody,
  WritingResponse,
  WritingsResponse,
} from "@/lib/writings/schema";
import type {
  AnswerRequestBody,
  AnswerResponse,
  ApiErrorBody,
  ApiErrorCode,
  ApplicationResponse,
  ApplicationsResponse,
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
  JobMatchesResponse,
  JobPostResponse,
  JobRequestBody,
  MatchActionInput,
  JobResponse,
  LetterRequestBody,
  LetterResponse,
  MeResponse,
  PutResumeResponse,
  ReferralClaimResponse,
  ReferralSummaryResponse,
  RequestCodeResponse,
  ResumesResponse,
  SavedJobResponse,
  SummaryRequestBody,
  SummaryResponse,
  TailorRequestBody,
  TailorResponse,
  UpdateApplicationBody,
  UrlResponse,
  VerifyCodeResponse,
  WorkProfileBody,
  WorkProfileResponse,
} from "./types";

// Browser-side typed client. Every method resolves with the success body or throws ApiClientError.

export class ApiClientError extends Error {
  readonly code: ApiErrorCode | "network_error";
  readonly status: number;

  constructor(code: ApiErrorCode | "network_error", message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

export function isApiError(error: unknown, code?: ApiClientError["code"]): error is ApiClientError {
  return error instanceof ApiClientError && (code === undefined || error.code === code);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiClientError("network_error", "Can't reach the server. Check your connection.", 0);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON body (e.g. a platform error page); handled below.
  }
  if (!res.ok || (body as { ok?: unknown } | null)?.ok !== true) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiClientError(
      error?.code ?? "server_error",
      error?.message ?? "Something went wrong. Please try again.",
      res.status,
    );
  }
  return body as T;
}

const postJson = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function fileForm(file: Blob, filename?: string): FormData {
  const form = new FormData();
  if (filename) form.append("file", file, filename);
  else form.append("file", file);
  return form;
}

export const api = {
  importFile: (file: File) =>
    request<ImportResponse>("/api/import", { method: "POST", body: fileForm(file) }),
  draft: (body: DraftRequestBody) => request<DraftResponse>("/api/draft", postJson(body)),
  checkFile: (file: Blob, filename: string) =>
    request<CheckResponse>("/api/check", { method: "POST", body: fileForm(file, filename) }),
  fix: (body: FixRequestBody) => request<FixResponse>("/api/fix", postJson(body)),
  tailor: (body: TailorRequestBody) => request<TailorResponse>("/api/tailor", postJson(body)),
  letter: (body: LetterRequestBody) => request<LetterResponse>("/api/letter", postJson(body)),
  answer: (body: AnswerRequestBody) => request<AnswerResponse>("/api/answer", postJson(body)),
  interview: (body: InterviewRequestBody) =>
    request<InterviewResponse>("/api/interview", postJson(body)),
  interviewPrep: (applicationId: string) =>
    request<InterviewPrepResponse>(`/api/interview/${encodeURIComponent(applicationId)}`, {
      cache: "no-store",
    }),
  interviewPacks: () => request<InterviewPacksResponse>("/api/interview", { cache: "no-store" }),
  writings: () => request<WritingsResponse>("/api/writings", { cache: "no-store" }),
  saveWriting: (body: CreateWritingBody) =>
    request<WritingResponse>("/api/writings", postJson(body)),
  editWriting: (id: string, body: UpdateWritingBody) =>
    request<WritingResponse>(`/api/writings/${encodeURIComponent(id)}`, postJson(body, "PATCH")),
  // keepalive: sent from a page that is closing (an undo window that never ran out).
  deleteWriting: (id: string, { keepalive = false }: { keepalive?: boolean } = {}) =>
    request<EmptyOk>(`/api/writings/${encodeURIComponent(id)}`, { method: "DELETE", keepalive }),
  summary: (body: SummaryRequestBody) => request<SummaryResponse>("/api/summary", postJson(body)),
  readJob: (body: JobRequestBody) => request<JobResponse>("/api/job", postJson(body)),
  jobMatches: (body: JobMatchesRequestBody) =>
    request<JobMatchesResponse>("/api/jobs/matches", postJson(body)),
  jobPost: (id: string) =>
    request<JobPostResponse>(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" }),
  saveJob: (id: string) =>
    request<SavedJobResponse>(`/api/jobs/saved/${encodeURIComponent(id)}`, { method: "PUT" }),
  unsaveJob: (id: string) =>
    request<SavedJobResponse>(`/api/jobs/saved/${encodeURIComponent(id)}`, { method: "DELETE" }),
  // keepalive: "Open job" leaves for another tab, and the note should still arrive.
  jobEvent: (body: MatchActionInput) =>
    request<EmptyOk>("/api/jobs/events", { ...postJson(body), keepalive: true }),
  me: () => request<MeResponse>("/api/me", { cache: "no-store" }),
  requestCode: (email: string) =>
    request<RequestCodeResponse>("/api/auth/request-code", postJson({ email })),
  verifyCode: (email: string, code: string) =>
    request<VerifyCodeResponse>("/api/auth/verify", postJson({ email, code })),
  googleSignIn: (next: string) =>
    request<GoogleSignInResponse>("/api/auth/google", postJson({ next })),
  logout: () => request<EmptyOk>("/api/auth/logout", { method: "POST" }),
  listResumes: () => request<ResumesResponse>("/api/resumes", { cache: "no-store" }),
  putResume: (resume: Resume) =>
    request<PutResumeResponse>(
      `/api/resumes/${encodeURIComponent(resume.id)}`,
      postJson(resume, "PUT"),
    ),
  deleteResume: (id: string) =>
    request<EmptyOk>(`/api/resumes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listApplications: (cursor: string | null = null) =>
    request<ApplicationsResponse>(
      cursor === null
        ? "/api/applications"
        : `/api/applications?cursor=${encodeURIComponent(cursor)}`,
      { cache: "no-store" },
    ),
  createApplication: (body: CreateApplicationBody) =>
    request<ApplicationResponse>("/api/applications", postJson(body)),
  updateApplication: (id: string, body: UpdateApplicationBody) =>
    request<ApplicationResponse>(
      `/api/applications/${encodeURIComponent(id)}`,
      postJson(body, "PATCH"),
    ),
  setApplicationsStatus: (body: BulkApplicationStatusBody) =>
    request<BulkApplicationsResponse>("/api/applications", postJson(body, "PATCH")),
  // keepalive: sent from a page that is closing (an undo window that never ran out).
  deleteApplication: (id: string, { keepalive = false }: { keepalive?: boolean } = {}) =>
    request<EmptyOk>(`/api/applications/${encodeURIComponent(id)}`, {
      method: "DELETE",
      keepalive,
    }),
  checkout: (
    plan: CheckoutRequestBody["plan"] = "pro",
    interval: CheckoutRequestBody["interval"] = "month",
  ) =>
    request<UrlResponse>(
      "/api/billing/checkout",
      postJson({ plan, interval } satisfies CheckoutRequestBody),
    ),
  feedback: (body: FeedbackRequestBody) => request<EmptyOk>("/api/feedback", postJson(body)),
  referrals: () => request<ReferralSummaryResponse>("/api/referrals", { cache: "no-store" }),
  claimReferral: () => request<ReferralClaimResponse>("/api/referrals/claim", postJson({})),
  portal: () => request<UrlResponse>("/api/billing/portal", { method: "POST" }),
  deleteAccount: () => request<EmptyOk>("/api/account", { method: "DELETE" }),
  workProfile: () => request<WorkProfileResponse>("/api/profile", { cache: "no-store" }),
  saveWorkProfile: (body: WorkProfileBody) =>
    request<WorkProfileResponse>("/api/profile", postJson(body, "PUT")),
  githubLookup: (body: GitHubLookupBody) =>
    request<GitHubLookupResponse>("/api/github/lookup", postJson(body)),
  githubDraft: (body: GitHubDraftBody) =>
    request<GitHubDraftResponse>("/api/github/draft", postJson(body)),
  notifications: () => request<NotificationsResponse>("/api/notifications", { cache: "no-store" }),
  markNotificationsRead: (body: MarkNotificationsReadBody) =>
    request<MarkNotificationsReadResponse>("/api/notifications", postJson(body, "PATCH")),
  reminderSettings: () =>
    request<ReminderSettingsResponse>("/api/notifications/settings", { cache: "no-store" }),
  saveReminderSettings: (body: ReminderSettingsBody) =>
    request<ReminderSettingsResponse>("/api/notifications/settings", postJson(body, "PUT")),
  shares: () => request<SharesResponse>("/api/share", { cache: "no-store" }),
  share: (body: CreateShareBody) => request<ShareResponse>("/api/share", postJson(body)),
  updateShare: (id: string, body: UpdateShareBody) =>
    request<ShareResponse>(`/api/share/${encodeURIComponent(id)}`, postJson(body, "PATCH")),
  revokeShare: (id: string, { keepalive = false }: { keepalive?: boolean } = {}) =>
    request<EmptyOk>(`/api/share/${encodeURIComponent(id)}`, { method: "DELETE", keepalive }),
  portfolio: () => request<PortfolioResponse>("/api/portfolio", { cache: "no-store" }),
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
  uploadPortfolioMedia: (file: File, kind: MediaKind) => {
    const form = fileForm(file);
    form.append("kind", kind);
    return request<MediaUploadResponse>("/api/portfolio/media", { method: "POST", body: form });
  },
  portfolioSiteIcon: (url: string) =>
    request<MediaUploadResponse>("/api/portfolio/media/icon", postJson({ url })),
};
