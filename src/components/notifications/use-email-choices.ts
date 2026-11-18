"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { EmailChoices, EmailChoicesBody } from "@/lib/notifications/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";

export type EmailChoicesData = EmailChoices & { emailAvailable: boolean };

const emailChoicesKey = (userId: string) => ["email-choices", userId] as const;

export function useEmailChoices(userId: string | null, enabled = true) {
  const client = useAppQueryClient();
  return useQuery(
    {
      queryKey: emailChoicesKey(userId ?? ""),
      queryFn: async (): Promise<EmailChoicesData> => {
        const { jobEmails, tipEmails, jobPromptClosed, emailAvailable } = await api.emailChoices();
        return { jobEmails, tipEmails, jobPromptClosed, emailAvailable };
      },
      staleTime: 5 * 60_000,
      enabled: enabled && userId !== null,
    },
    client,
  );
}

let queue: Promise<unknown> = Promise.resolve();

// Shown at once, saved in order, and put back if the save fails.
export function saveEmailChoices(
  userId: string,
  change: EmailChoicesBody,
): Promise<EmailChoicesData> {
  const client = getQueryClient();
  const key = emailChoicesKey(userId);
  const before = client.getQueryData<EmailChoicesData>(key);
  if (before) {
    const answered = change.jobPromptClosed === true || change.jobEmails !== undefined;
    client.setQueryData<EmailChoicesData>(key, {
      ...before,
      ...(change.jobEmails === undefined ? {} : { jobEmails: change.jobEmails }),
      ...(change.tipEmails === undefined ? {} : { tipEmails: change.tipEmails }),
      jobPromptClosed: before.jobPromptClosed || answered,
    });
  }
  const saved = queue.then(async () => {
    try {
      const { jobEmails, tipEmails, jobPromptClosed, emailAvailable } =
        await api.saveEmailChoices(change);
      const next: EmailChoicesData = { jobEmails, tipEmails, jobPromptClosed, emailAvailable };
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
