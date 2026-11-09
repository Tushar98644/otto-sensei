import {
  FREE_APPLICATIONS,
  hasProTools,
  PRO_TRIAL,
  RESUME_LIMITS,
  type ProTool,
} from "@/config/plans";
import { fail } from "@/lib/api/respond";
import type { SessionUser } from "@/lib/auth/types";
import { log } from "@/lib/log";
import { pluralize } from "@/lib/utils";

// Server-only. How routes answer a Free account asking for a Pro tool: the same 402
// upgrade_required the AI routes send (metered-free.ts), which the client turns into the trial
// prompt. Reading what the account already has is never refused; only adding or changing is.

export const PRO_TOOL_MESSAGES: Record<ProTool, string> = {
  resumes: `Free keeps ${pluralize(RESUME_LIMITS.free, "resume")}.`,
  formats: "That format comes with Pro. Free has Classic and Compact.",
  word: "Word downloads come with Pro. PDF downloads stay free.",
  tracker: `Free tracks ${pluralize(FREE_APPLICATIONS, "application")}. Pro tracks every one.`,
  jobs: "Filters, saved jobs and every match come with Pro.",
  share: "Share links come with Pro.",
  eligibility: "The work-rights check comes with Pro.",
};

/** The 402 for a Pro tool on Free. */
export function proToolRequired(user: SessionUser | null, tool: ProTool): Response {
  log.info(`${tool}.upgrade_required`, { plan: user?.plan ?? "signed_out" });
  return fail(
    "upgrade_required",
    `${PRO_TOOL_MESSAGES[tool]} Try Pro free for ${PRO_TRIAL.days} days.`,
    402,
  );
}

/** The 402 when the plan doesn't have Pro tools, else null. */
export function requireProTool(user: SessionUser, tool: ProTool): Response | null {
  return hasProTools(user.plan) ? null : proToolRequired(user, tool);
}
