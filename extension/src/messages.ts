import type { ApplyAnswers, ApplyAnswersPatch } from "@/lib/extension/answers";
import type {
  ExtensionProfile,
  FillProfile,
  SavePostBody,
  SavePostResponse,
} from "@/lib/extension/types";
import type { FormPlatform } from "./forms/platforms";

// A form Otto filled, kept per tab until its thank-you page shows (or it goes stale).
export type Pending = {
  applicationId: string;
  platform: FormPlatform;
  url: string;
  title: string;
  company: string;
  resumeId: string | null;
  resumeTitle: string;
  tailored: boolean;
  filledAt: number;
  submittedAt: number | null;
};

export type DraftJob = { text: string; title: string; company: string };

// Messages from the page scripts to the background worker, and what each gets back.
export type Request =
  | { type: "state" }
  | { type: "connect"; token: string; expiresAt: number }
  | { type: "save"; post: SavePostBody }
  | { type: "open"; path: string }
  | { type: "pick-resume"; id: string }
  | { type: "refresh" }
  | { type: "disconnect" }
  | { type: "otto-visit" }
  | { type: "fill-data"; resumeId: string | null; url: string }
  | { type: "resume-file"; id: string; size: "A4" | "LETTER" }
  | { type: "answers" }
  | { type: "save-answers"; patch: ApplyAnswersPatch }
  | { type: "draft"; resumeId: string; job: DraftJob; question: string; requestId: string }
  | { type: "arm"; pending: Pending }
  | { type: "submitting" }
  | { type: "armed" }
  | { type: "applied" }
  | { type: "undo-applied"; id: string };

export type State = {
  connected: boolean;
  profile: ExtensionProfile | null;
  resumeId: string | null;
};

export type Failure = { ok: false; code: string; message: string };

export type SaveReply = { ok: true; post: SavePostResponse["post"] } | Failure;
export type ConnectReply = { ok: true; email: string } | Failure;
export type FillReply = { ok: true; fill: FillProfile } | Failure;
export type FileReply = { ok: true; base64: string; name: string } | Failure;
export type AnswersReply = { ok: true; answers: ApplyAnswers; saved: ApplyAnswers } | Failure;
export type DraftReply = { ok: true; answer: string } | Failure;
export type ArmedReply = { ok: true; pending: Pending | null };
export type AppliedReply =
  { ok: true; id: string; company: string; role: string; boardPath: string } | Failure;

// The background worker's message to a tab when the toolbar button is pressed.
export type TabMessage = { type: "toggle" };

export function isTabMessage(value: unknown): value is TabMessage {
  return (
    typeof value === "object" && value !== null && (value as { type?: unknown }).type === "toggle"
  );
}
