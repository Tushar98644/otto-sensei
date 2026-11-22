// Props are names, counts and flags only: never resume text, emails, names or file names.

import type { BillingInterval, PaidPlanId, PlanId } from "@/config/plans";
import type { ApplicationStatus } from "@/lib/applications/status";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { DashboardSection, EmailCampaign } from "./landing";

export type ImportSource =
  "pdf" | "docx" | "linkedin" | "jsonresume" | "draft" | "scratch" | "sample" | "example" | "paste";

type NoProps = Record<string, never>;

export type ClientEventProps = {
  landing_viewed: NoProps;
  resume_imported: { source: ImportSource };
  recruiter_view_seen: { checks: number; problems: number; warnings: number };
  screener_viewed: { must: number; must_proven: number; nice: number; nice_proven: number };
  pdf_downloaded: { page_size: "LETTER" | "A4" };
  docx_downloaded: NoProps;
  upgrade_clicked: NoProps;
  // Sign-in and sign-up are one flow, so this is anyone asking for a code or going to Google.
  signup_started: { method: "email" | "google" };
};

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
  // The first page this browser opens signed in, once its visitor id is linked to the account.
  signed_in: { plan: PlanId };
  checkout_started: { plan: PaidPlanId; interval: BillingInterval };
  checkout_completed: { plan: "pro" | "max"; trial?: boolean };
  ai_call: { task: string; model: string; latency_ms: number; outcome: AICallOutcome };
  line_fixed: { demo: boolean };
  tailor_run: { demo: boolean };
  letter_written: { demo: boolean };
  application_logged: { status: ApplicationStatus };
  dashboard_viewed: { section: DashboardSection };
  // The first app page of the person's calendar day; days_away is missing on their first day.
  returned: { section: DashboardSection; days_away?: number };
  email_clicked: { campaign: EmailCampaign; link?: string };
  job_saved: { source: JobSaveSource };
  application_status_changed: { from: ApplicationStatus; to: ApplicationStatus; count: number };
  tailored_copy_made: NoProps;
  portfolio_published: { template: PortfolioTemplateId };
  // Sent as the owner: nothing about whoever opened the page.
  share_link_viewed: NoProps;
  portfolio_viewed: NoProps;
  extension_connected: NoProps;
};

export type JobSaveSource = "jobs" | "extension";

export type ClientEvent = keyof ClientEventProps;
export type ServerEvent = keyof ServerEventProps;

export type EventArgs<P> = P extends NoProps ? [props?: P] : [props: P];
