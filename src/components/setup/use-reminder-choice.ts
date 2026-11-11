"use client";

import { useCallback } from "react";
import {
  saveReminderSettings,
  useReminderSettings,
} from "@/components/notifications/use-reminder-settings";
import type { ReminderSettingsBody } from "@/lib/notifications/types";

export type ReminderChoice = { available: boolean; chosen: boolean; emailReminders: boolean };

export function useReminderChoice(userId: string | null, enabled: boolean) {
  const query = useReminderSettings(userId, enabled);

  const save = useCallback(
    async (change: ReminderSettingsBody) => {
      if (userId && enabled) await saveReminderSettings(userId, change);
    },
    [userId, enabled],
  );

  const status: "off" | "loading" | "ready" | "error" =
    !userId || !enabled ? "off" : query.data ? "ready" : query.isError ? "error" : "loading";
  const value: ReminderChoice | null = query.data
    ? {
        available: query.data.emailAvailable,
        chosen: query.data.chosen,
        emailReminders: query.data.emailReminders,
      }
    : null;
  return { status, value: status === "off" ? null : value, save };
}
