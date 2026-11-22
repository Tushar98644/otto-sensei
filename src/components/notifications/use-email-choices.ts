"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type {
  EmailChoices,
  EmailChoicesBody,
  EmailChoicesResponse,
} from "@/lib/notifications/types";
import { getQueryClient, useAppQueryClient } from "@/lib/queries/client";

export type EmailChoicesData = EmailChoices & { emailAvailable: boolean };

const emailChoicesKey = (userId: string) => ["email-choices", userId] as const;

function choicesOf(res: EmailChoicesResponse): EmailChoicesData {
  return {
    jobEmails: res.jobEmails,
    tipEmails: res.tipEmails,
    viewEmails: res.viewEmails,
    jobPromptClosed: res.jobPromptClosed,
    jobPromptSnoozed: res.jobPromptSnoozed,
    viewPromptClosed: res.viewPromptClosed,
    viewPromptSnoozed: res.viewPromptSnoozed,
    emailAvailable: res.emailAvailable,
  };
}

export function useEmailChoices(userId: string | null, enabled = true) {
  const client = useAppQueryClient();
  return useQuery(
    {
      queryKey: emailChoicesKey(userId ?? ""),
      queryFn: async (): Promise<EmailChoicesData> => choicesOf(await api.emailChoices()),
      staleTime: 5 * 60_000,
      enabled: enabled && userId !== null,
    },
    client,
  );
}

// What the server will answer, so a card goes the moment it's pressed.
export function expectedChoices(
  before: EmailChoicesData,
  change: EmailChoicesBody,
): EmailChoicesData {
  const jobsAnswered = change.jobPromptClosed === true || change.jobEmails !== undefined;
  return {
    ...before,
    ...(change.jobEmails === undefined ? {} : { jobEmails: change.jobEmails }),
    ...(change.tipEmails === undefined ? {} : { tipEmails: change.tipEmails }),
    ...(change.viewEmails === undefined ? {} : { viewEmails: change.viewEmails }),
    jobPromptClosed: before.jobPromptClosed || jobsAnswered,
    jobPromptSnoozed: before.jobPromptSnoozed || change.jobPromptSnoozed === true,
    viewPromptClosed: before.viewPromptClosed || change.viewEmails !== undefined,
    viewPromptSnoozed: before.viewPromptSnoozed || change.viewPromptSnoozed === true,
  };
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
  if (before) client.setQueryData<EmailChoicesData>(key, expectedChoices(before, change));
  const saved = queue.then(async () => {
    try {
      const next = choicesOf(await api.saveEmailChoices(change));
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
