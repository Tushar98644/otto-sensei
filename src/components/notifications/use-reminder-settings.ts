"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { ReminderSettingsBody } from "@/lib/notifications/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";
import { queryKeys } from "@/lib/queries/keys";
import { reminderSettingsQuery, type ReminderSettingsData } from "@/lib/queries/options";

export function useReminderSettings(userId: string | null, enabled = true) {
  const client = useAppQueryClient();
  return useQuery(
    { ...reminderSettingsQuery(userId ?? ""), enabled: enabled && userId !== null },
    client,
  );
}

let queue: Promise<unknown> = Promise.resolve();

// Saves run one after another, so quick changes reach the server in order.
export function saveReminderSettings(
  userId: string,
  change: ReminderSettingsBody,
): Promise<ReminderSettingsData> {
  const client = getQueryClient();
  const key = queryKeys.reminderSettings(userId);
  const before = client.getQueryData<ReminderSettingsData>(key);
  if (before) {
    client.setQueryData<ReminderSettingsData>(key, { ...before, ...change, chosen: true });
  }
  const saved = queue.then(async () => {
    try {
      const res = await api.saveReminderSettings(change);
      const next: ReminderSettingsData = {
        emailAvailable: res.emailAvailable,
        chosen: true,
        emailReminders: res.emailReminders,
        followUpDays: res.followUpDays,
      };
      client.setQueryData(key, next);
      return next;
    } catch (error) {
      if (before) client.setQueryData(key, before);
      throw error;
    }
  });
  queue = saved.catch(() => undefined);
  return saved;
}
