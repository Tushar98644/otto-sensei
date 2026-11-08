// The event catalogue, shared by the browser and the server. Props are names, counts and flags
// only: never resume text, job posts, emails, names or file names. A new event starts here, so the
// type system stops anyone from passing something personal by accident.

import type { PlanId } from "@/config/plans";
import type { ApplicationStatus } from "@/lib/applications/status";

export type ImportSource = "pdf" | "docx" | "linkedin" | "jsonresume" | "draft" | "scratch" | "sample";

type NoProps = Record<string, never>;

export type ClientEventProps = {
  landing_viewed: NoProps;
  resume_imported: { source: ImportSource };
  recruiter_view_seen: { checks: number; problems: number; warnings: number };
  screener_viewed: { must: number; must_proven: number; nice: number; nice_proven: number };
  pdf_downloaded: { page_size: "LETTER" | "A4" };
  docx_downloaded: NoProps;
  signed_in: { plan: PlanId };
  upgrade_clicked: NoProps;
};

// "fallback": the model failed and the rule-based parser read the resume instead.
export type AICallOutcome =
  | "ok"
  | "fallback"
  | "refused"
  | "too_long"
  | "rate_limited"
  | "unavailable"
  | "invalid_output"
  | "error";

export type ServerEventProps = {
  signed_up: NoProps;
  checkout_completed: { plan: "pro" | "max" };
  ai_call: { task: string; model: string; latency_ms: number; outcome: AICallOutcome };
  // demo: no AI key, so Otto answered with sample output.
  line_fixed: { demo: boolean };
  tailor_run: { demo: boolean };
  letter_written: { demo: boolean };
  application_logged: { status: ApplicationStatus };
};

export type ClientEvent = keyof ClientEventProps;
export type ServerEvent = keyof ServerEventProps;

/** Events without props can leave the argument out: track("landing_viewed"). */
export type EventArgs<P> = P extends NoProps ? [props?: P] : [props: P];
