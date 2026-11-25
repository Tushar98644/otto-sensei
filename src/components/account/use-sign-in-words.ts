"use client";

import { useFormat, useMessagesOr } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import EN_SIGN_IN from "@/i18n/messages/en/sign-in";
import { signedOutNote } from "./copy";

export type SignInWords = Messages["signIn"];

// Pages with a provider read the signIn namespace; /login, which has none, passes the words.
export function useSignInWords(words?: SignInWords): SignInWords {
  const provided = useMessagesOr("signIn", EN_SIGN_IN);
  return words ?? provided;
}

export function useSignedOutNote(): (kept: number) => string {
  const { signedOut } = useSignInWords();
  const format = useFormat();
  return (kept) => signedOutNote(kept, signedOut, format);
}
