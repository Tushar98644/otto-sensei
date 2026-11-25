"use client";

import { useCallback } from "react";
import { useLocale, useMessages } from "@/i18n/client";
import { localizeCheck } from "@/lib/checks/text";
import type { RecruiterCheck } from "@/lib/checks/types";

// A file check with its title, detail and fix in the studio's language.
export function useCheckText(): (check: RecruiterCheck) => RecruiterCheck {
  const t = useMessages("fileChecks");
  const locale = useLocale();
  return useCallback((check) => localizeCheck(check, t, locale), [t, locale]);
}
