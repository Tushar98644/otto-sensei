import type { JobMatchesRequestBody } from "@/lib/api/types";
import type { WorkProfile } from "@/lib/eligibility/profile";

// Resource first, then account: invalidating by the first part drops it for every account.

export const APPLICATIONS = ["applications"] as const;
export const SAVED_JOBS = ["saved-jobs"] as const;
export const WRITINGS = ["writings"] as const;
export const PREP_PACKS = ["prep-packs"] as const;
export const SHARES = ["shares"] as const;
export const PORTFOLIO = ["portfolio"] as const;
export const REMINDER_SETTINGS = ["reminder-settings"] as const;
export const WORK_PROFILE = ["work-profile"] as const;
export const JOB_MATCHES = ["job-matches"] as const;
export const BILLING_HISTORY = ["billing-history"] as const;

export const queryKeys = {
  applications: (userId: string) => [...APPLICATIONS, userId] as const,
  savedJobs: (userId: string) => [...SAVED_JOBS, userId] as const,
  writings: (userId: string) => [...WRITINGS, userId] as const,
  prepPacks: (userId: string) => [...PREP_PACKS, userId] as const,
  shares: (userId: string) => [...SHARES, userId] as const,
  portfolio: (userId: string) => [...PORTFOLIO, userId] as const,
  reminderSettings: (userId: string) => [...REMINDER_SETTINGS, userId] as const,
  workProfile: (userId: string) => [...WORK_PROFILE, userId] as const,
  // A plan change shows up in /api/me first, so the plan's state is part of the key.
  billingHistory: (userId: string, planState: string) =>
    [...BILLING_HISTORY, userId, planState] as const,
  // The server also reads the saved work profile ("Likely blocked"), so it's part of the key.
  jobMatches: (userId: string, body: JobMatchesRequestBody, workProfile: WorkProfile | null) =>
    [...JOB_MATCHES, userId, body, workProfile] as const,
};
