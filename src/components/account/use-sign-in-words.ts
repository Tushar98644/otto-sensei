"use client";

import { useFormat, useWordsOr } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { signedOutNote } from "./copy";

export type SignInWords = Messages["signIn"];

// Pages with a provider read the signIn namespace; /login, which has none, passes the words.
export function useSignInWords(words?: SignInWords): SignInWords {
  return useWordsOr("signIn")(words, (signIn) => signIn);
}

export function useSignedOutNote(): (kept: number) => string {
  const { signedOut } = useSignInWords();
  const format = useFormat();
  return (kept) => signedOutNote(kept, signedOut, format);
}
