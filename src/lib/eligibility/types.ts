import type { CheckStatus } from "@/lib/checks/types";

export type EligibilityVerdict = "ok" | "check" | "blocked";

export type EligibilityRule =
  "location" | "authorization" | "sponsorship" | "time_zone" | "work_type";

export type ProfileGap = "country" | "time_zone" | "rights";

export type EligibilityFinding = {
  rule: EligibilityRule;
  verdict: EligibilityVerdict;
  note: string;
  quote: string;
  source: "post" | "location";
  gap?: ProfileGap;
};

export const VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  ok: "OK",
  check: "Check",
  blocked: "Likely blocked",
};

export const VERDICT_STATUS: Record<EligibilityVerdict, CheckStatus> = {
  ok: "pass",
  check: "warn",
  blocked: "fail",
};

export const RULE_LABELS: Record<EligibilityRule, string> = {
  location: "Where you live",
  authorization: "Right to work",
  sponsorship: "Visa sponsorship",
  time_zone: "Time zone",
  work_type: "Job type",
};
