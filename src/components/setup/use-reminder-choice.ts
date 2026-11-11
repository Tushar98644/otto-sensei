"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import type { ReminderSettingsBody } from "@/lib/notifications/types";

export type ReminderChoice = { available: boolean; chosen: boolean; emailReminders: boolean };

type Load =
  | { key: string; status: "ready"; value: ReminderChoice }
  | { key: string; status: "error" };

// The reminder settings as the setup list and the tracker's prompt need them, read fresh on each
// visit (the Account card may have changed them in between). Only loaded when `enabled`: Free
// gets no follow-up reminders, so there's nothing to ask.
export function useReminderChoice(userId: string | null, enabled: boolean) {
  const key = userId && enabled ? userId : null;
  const [load, setLoad] = useState<Load | null>(null);

  useEffect(() => {
    if (!key) return;
    let current = true;
    api
      .reminderSettings()
      .then((res) => {
        if (current) {
          setLoad({
            key,
            status: "ready",
            value: {
              available: res.emailAvailable,
              chosen: res.chosen === true,
              emailReminders: res.emailReminders,
            },
          });
        }
      })
      .catch(() => {
        if (current) setLoad({ key, status: "error" });
      });
    return () => {
      current = false;
    };
  }, [key]);

  const save = useCallback(
    async (change: ReminderSettingsBody) => {
      if (!key) return;
      const res = await api.saveReminderSettings(change);
      setLoad({
        key,
        status: "ready",
        value: {
          available: res.emailAvailable,
          chosen: true,
          emailReminders: res.emailReminders,
        },
      });
    },
    [key],
  );

  const status: "off" | "loading" | "ready" | "error" = !key
    ? "off"
    : load?.key !== key
      ? "loading"
      : load.status;
  const value = load?.key === key && load.status === "ready" ? load.value : null;
  return { status, value, save };
}
