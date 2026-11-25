"use client";

import { useMemo } from "react";
import { useFormat, useMessages } from "@/i18n/client";
import { ottoLines, type OttoLines } from "./lines";

// Otto's sign-in, limit, plan and error lines in the reader's language.
export function useOtto(): OttoLines {
  const otto = useMessages("otto");
  const signIn = useMessages("signIn");
  const { usage } = useMessages("app");
  const format = useFormat();
  return useMemo(() => ottoLines({ otto, signIn, usage }, format), [otto, signIn, usage, format]);
}
