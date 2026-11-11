import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Application } from "@/lib/api/types";
import { APPLICATION_LIMITS } from "@/lib/applications/schema";
import type { WorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE, type LookingForChoice } from "@/lib/job-feed/types";
import type { ReminderSettings } from "@/lib/notifications/types";
import { queryKeys } from "./keys";

// A fresh copy is shown without asking again; an older one shows at once while a new one loads.

const MINUTE = 60_000;

export type ReminderSettingsData = ReminderSettings & { emailAvailable: boolean; chosen: boolean };

export type WorkProfileData = {
  profile: WorkProfile;
  updatedAt: number | null;
  lookingFor: LookingForChoice;
};

const MAX_APPLICATION_PAGES =
  Math.ceil(APPLICATION_LIMITS.perUser / APPLICATION_LIMITS.pageSize) + 1;

export async function fetchAllApplications(): Promise<Application[]> {
  const items: Application[] = [];
  let cursor: string | null = null;
  // Bounded by the per-account cap, in case a server ever keeps handing out cursors.
  for (let page = 0; page < MAX_APPLICATION_PAGES; page++) {
    const res = await api.listApplications(cursor);
    items.push(...res.applications);
    cursor = res.nextCursor;
    if (cursor === null) break;
  }
  return items;
}

export const savedJobsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.savedJobs(userId),
    queryFn: async () => (await api.savedJobs()).jobs,
  });

export const writingsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.writings(userId),
    queryFn: async () => {
      const res = await api.writings();
      return { items: res.writings, total: res.total };
    },
  });

export const prepPacksQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.prepPacks(userId),
    queryFn: async () => (await api.interviewPacks()).packs,
  });

// Changed only from this tab's own screens, which update the cache themselves.
export const sharesQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.shares(userId),
    queryFn: async () => (await api.shares()).links,
    staleTime: 5 * MINUTE,
  });

export const portfolioQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.portfolio(userId),
    queryFn: async () => (await api.portfolio()).portfolio,
    staleTime: 5 * MINUTE,
  });

export const reminderSettingsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.reminderSettings(userId),
    queryFn: async (): Promise<ReminderSettingsData> => {
      const res = await api.reminderSettings();
      return {
        emailAvailable: res.emailAvailable,
        chosen: res.chosen === true,
        emailReminders: res.emailReminders,
        followUpDays: res.followUpDays,
      };
    },
    staleTime: 5 * MINUTE,
  });

export const workProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.workProfile(userId),
    queryFn: async (): Promise<WorkProfileData> => {
      const res = await api.workProfile();
      return {
        profile: res.profile,
        updatedAt: res.updatedAt,
        lookingFor: res.lookingFor ?? NO_CHOICE,
      };
    },
    staleTime: 5 * MINUTE,
  });

// Jobs are read in once a day, so a ranking stays good for a while.
export const JOB_MATCHES_STALE_MS = 5 * MINUTE;
