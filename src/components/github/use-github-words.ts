"use client";

import { useMessagesOr } from "@/i18n/client";
import EN_GITHUB from "@/i18n/messages/en/github";

export function useGitHubWords() {
  return useMessagesOr("github", EN_GITHUB);
}
