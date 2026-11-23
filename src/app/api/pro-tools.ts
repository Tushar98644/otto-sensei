import { applicationLimit, hasProTools, PLANS, resumeLimit, type ProTool } from "@/config/plans";
import { fail } from "@/lib/api/respond";
import type { SessionUser } from "@/lib/auth/types";
import { trialHeadline } from "@/lib/billing/prices";
import { log } from "@/lib/log";
import { pluralize } from "@/lib/utils";

const count = new Intl.NumberFormat("en-US");

export const PRO_TOOL_MESSAGES: Record<ProTool, string> = {
  resumes: `Free keeps ${pluralize(resumeLimit("free"), "resume")}.`,
  formats: "That format comes with Pro. Free has Classic and Compact.",
  word: "Word downloads come with Pro. PDF downloads stay free.",
  tracker: `Free tracks ${pluralize(applicationLimit("free"), "application")}. ${PLANS.pro.name} tracks up to ${count.format(applicationLimit("pro"))}.`,
  jobs: "Filters, saved jobs and every match come with Pro.",
  share: "Share links come with Pro.",
  eligibility: "The work-rights check comes with Pro.",
  portfolio: "Portfolios come with Pro.",
};

export function proToolRequired(user: SessionUser | null, tool: ProTool): Response {
  log.info(`${tool}.upgrade_required`, { plan: user?.plan ?? "signed_out" });
  return fail("upgrade_required", `${PRO_TOOL_MESSAGES[tool]} ${trialHeadline()}.`, 402);
}

export function requireProTool(user: SessionUser, tool: ProTool): Response | null {
  return hasProTools(user.plan) ? null : proToolRequired(user, tool);
}
