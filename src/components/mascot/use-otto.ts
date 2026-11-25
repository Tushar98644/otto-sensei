"use client";

import { useMemo } from "react";
import { useFormat, useMessagesOr } from "@/i18n/client";
import EN_APP from "@/i18n/messages/en/app";
import EN_OTTO from "@/i18n/messages/en/otto";
import EN_SIGN_IN from "@/i18n/messages/en/sign-in";
import { ottoLines, type OttoLines } from "./lines";

// Otto's sign-in, limit, plan and error lines in the reader's language, or English where no provider sends them.
export function useOtto(): OttoLines {
  const otto = useMessagesOr("otto", EN_OTTO);
  const signIn = useMessagesOr("signIn", EN_SIGN_IN);
  const { usage } = useMessagesOr("app", EN_APP);
  const format = useFormat();
  return useMemo(() => ottoLines({ otto, signIn, usage }, format), [otto, signIn, usage, format]);
}
