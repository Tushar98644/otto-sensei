"use client";

import { useFormat, useMessages } from "@/i18n/client";
import type { FixWords } from "./fix-text";

// The editor's words, the usage sentences and the page's number and date format, for fix-text.ts.
export function useFixWords(): FixWords {
  return {
    t: useMessages("studioEditor"),
    usage: useMessages("studio").usage,
    format: useFormat(),
  };
}
