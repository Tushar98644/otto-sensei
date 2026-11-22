import type { ApplicationStatus } from "@/lib/applications/status";

// Shared by the browser and the server: no zod or database imports here.

export const EMAIL_KINDS = [
  "applied",
  "rejected",
  "interview",
  "assessment",
  "offer",
  "unknown",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_CHANGES = ["created", "moved", "dated", "none", "pending"] as const;
export type EmailChange = (typeof EMAIL_CHANGES)[number];

// Why a change went through without asking: the person's own Gmail, a signed hiring sender, or their own press.
export const EMAIL_TRUST = ["source", "sender", "you"] as const;
export type EmailTrust = (typeof EMAIL_TRUST)[number];

export const HIRING_SYSTEMS = [
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "smartrecruiters",
  "icims",
  "taleo",
  "workable",
  "naukri",
  "linkedin",
  "indeed",
] as const;
export type HiringSystem = (typeof HIRING_SYSTEMS)[number];

export const SYSTEM_NAMES: Record<HiringSystem, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  icims: "iCIMS",
  taleo: "Taleo",
  workable: "Workable",
  naukri: "Naukri",
  linkedin: "LinkedIn",
  indeed: "Indeed",
};

export const INBOUND_LIMITS = {
  sender: 253,
  subject: 300,
  company: 200,
  role: 200,
  eventText: 120,
  confirmCode: 20,
  source: 320,
  sources: 5,
  confirmUrl: 2_048,
  listed: 50,
  text: 40_000,
  bodyBytes: 256 * 1024,
  perHour: 40,
  perDay: 300,
} as const;

export type EmailEvent = {
  id: string;
  receivedAt: number;
  sender: string;
  subject: string;
  kind: EmailKind;
  system: HiringSystem | null;
  company: string;
  role: string;
  eventAt: number | null;
  eventText: string;
  trust: EmailTrust | null;
  applicationId: string | null;
  change: EmailChange;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  undoneAt: number | null;
  // For a change waiting in Check this: what Apply would do to the board as it is now.
  proposal: Proposal | null;
};

export type Proposal = {
  change: EmailChange;
  applicationId: string | null;
  company: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
};

export type GmailConfirmation = {
  code: string | null;
  url: string;
  at: number;
  source: string | null;
};

export type TrackingAddress = {
  email: string;
  handle: string;
  sources: string[];
  createdAt: number;
  confirm: GmailConfirmation | null;
  confirmedAt: number | null;
  testAt: number | null;
  lastEmailAt: number | null;
};

export type EmailTrackingState = {
  available: boolean;
  allowed: boolean;
  address: TrackingAddress | null;
  events: EmailEvent[];
  // For the handle picker: what goes either side of the handle, and a first suggestion.
  parts: { before: string; after: string };
  suggestion: string;
};

export type HandleCheckResponse = {
  ok: true;
  available: boolean;
  problem: string | null;
  handle: string;
  address: string;
  others: string[];
};

export type EmailTrackingResponse = { ok: true; tracking: EmailTrackingState };

export type EmailTrackingAction =
  | { action: "start"; handle: string }
  | { action: "handle"; handle: string }
  | { action: "confirmed" }
  | { action: "not_mine" };

export type UndoEmailResponse = { ok: true; tracking: EmailTrackingState };
