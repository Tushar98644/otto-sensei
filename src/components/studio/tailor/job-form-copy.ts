"use client";

import { useMessagesOr } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import englishJobForm from "@/i18n/messages/en/job-form";

export type JobFormCopy = Messages["jobForm"];

// The dashboard's letter dialog renders the job form too, and reads English until it passes jobForm.
export function useJobFormCopy(): JobFormCopy {
  return useMessagesOr("jobForm", englishJobForm);
}
