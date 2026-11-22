"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { CareerLogEntry, CareerLogSettings } from "@/lib/career-log/types";
import type { EntryChangeBody, SettingsChangeBody } from "@/lib/career-log/validation";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";

export type CareerLogData = {
  entries: CareerLogEntry[];
  settings: CareerLogSettings;
  emailAvailable: boolean;
};

const careerLogKey = (userId: string) => ["career-log", userId] as const;

export function useCareerLog(userId: string | null, enabled = true) {
  const client = useAppQueryClient();
  return useQuery(
    {
      queryKey: careerLogKey(userId ?? ""),
      queryFn: async (): Promise<CareerLogData> => {
        const res = await api.careerLog();
        return { entries: res.entries, settings: res.settings, emailAvailable: res.emailAvailable };
      },
      staleTime: 5 * 60_000,
      enabled: enabled && userId !== null,
    },
    client,
  );
}

function patch(userId: string, update: (data: CareerLogData) => CareerLogData): void {
  const client = getQueryClient();
  const key = careerLogKey(userId);
  const before = client.getQueryData<CareerLogData>(key);
  if (before) client.setQueryData<CareerLogData>(key, update(before));
}

export function putEntry(
  entries: readonly CareerLogEntry[],
  month: string,
  entry: CareerLogEntry | null,
): CareerLogEntry[] {
  const rest = entries.filter((item) => item.month !== month);
  return (entry ? [...rest, entry] : rest).sort((a, b) => b.month.localeCompare(a.month));
}

export async function saveEntry(
  userId: string,
  month: string,
  change: EntryChangeBody,
  options?: { keepalive?: boolean },
): Promise<CareerLogEntry | null> {
  const { entry } = await api.saveCareerEntry(month, change, options);
  patch(userId, (data) => ({ ...data, entries: putEntry(data.entries, month, entry) }));
  return entry;
}

// Hidden at once; the delete waits for the undo toast, and Undo puts it back.
export function hideEntry(userId: string, month: string): CareerLogEntry | null {
  const data = getQueryClient().getQueryData<CareerLogData>(careerLogKey(userId));
  const entry = data?.entries.find((item) => item.month === month) ?? null;
  patch(userId, (current) => ({ ...current, entries: putEntry(current.entries, month, null) }));
  return entry;
}

export function restoreEntry(userId: string, entry: CareerLogEntry): void {
  patch(userId, (data) => ({ ...data, entries: putEntry(data.entries, entry.month, entry) }));
}

export async function deleteEntry(userId: string, month: string): Promise<void> {
  await api.deleteCareerEntry(month);
}

export async function saveSettings(
  userId: string,
  change: SettingsChangeBody,
): Promise<CareerLogSettings> {
  const res = await api.saveCareerSettings(change);
  patch(userId, (data) => ({
    ...data,
    settings: res.settings,
    emailAvailable: res.emailAvailable,
  }));
  return res.settings;
}

// The browser's own zone, so the check-in lands on the person's day.
export function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return zone && zone.length <= 64 ? zone : undefined;
  } catch {
    return undefined;
  }
}

export function offerShows(settings: CareerLogSettings | undefined): boolean {
  return Boolean(
    settings && !settings.checkins && !settings.promptClosed && !settings.promptSnoozed,
  );
}
