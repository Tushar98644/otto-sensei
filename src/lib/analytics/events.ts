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
  checkout_completed: { plan: "pro" | "max"; trial?: boolean; usd?: number };
  credit_checkout_started: { usd: number };
  credit_added: { usd: number };
  // From the Dodo webhook; usd is before tax for charges and as Dodo reports it for refunds and disputes.
  subscription_renewed: { plan: PaidPlanId; interval: BillingInterval; usd: number };
  subscription_plan_changed: {
    from_plan: PaidPlanId;
    to_plan: PaidPlanId;
    interval: BillingInterval;
  };
  subscription_cancelled: { plan: PaidPlanId; at_period_end: boolean; trial: boolean };
  subscription_ended: { plan: PaidPlanId; status: SubscriptionEndStatus; trial: boolean };
  payment_failed: {
    kind: BillingKind;
    plan?: PaidPlanId;
    charge?: ChargeType;
    reason?: string;
    attempt?: number;
  };
  refund_issued: { kind: BillingKind; partial: boolean; usd?: number };
  dispute_opened: { kind: BillingKind };
  dispute_lost: { kind: BillingKind; usd?: number };
  // PostHog's own person update, for a plan change no other event carries.
  $set: NoProps;
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

export type BillingKind = "subscription" | "credit";
export type ChargeType = "new" | "renewal" | "plan_change" | "on_demand";
export type SubscriptionEndStatus = "cancelled" | "expired" | "on_hold" | "paused";

export type ClientEvent = keyof ClientEventProps;
export type ServerEvent = keyof ServerEventProps;

export type EventArgs<P> = P extends NoProps ? [props?: P] : [props: P];
