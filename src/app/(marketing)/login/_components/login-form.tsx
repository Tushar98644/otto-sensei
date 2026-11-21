"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_NEXT_PATH, safeNextPath } from "@/components/account/next-path";
import { SignInForm } from "@/components/account/sign-in-form";
import { SignInFormSkeleton } from "@/components/account/sign-in-form-skeleton";
import { useMe } from "@/components/account/use-me";
import { OttoLoadingScreen } from "@/components/mascot/otto-loading-screen";

const ALREADY_SIGNED_IN_PATH = DEFAULT_NEXT_PATH;

const GOOGLE_FAILED = "Google sign-in didn't finish. Try again, or use your email.";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = params.get("next");
  const googleFailed = params.get("error") === "google";
  const { user, loading } = useMe();
  // Both the store update and onSignedIn announce the same sign-in; navigate once.
  const leaving = useRef(false);
  const arrivedSignedOut = useRef(false);

  const leave = useCallback(
    (fallback: string) => {
      if (leaving.current) return;
      leaving.current = true;
      router.replace(safeNextPath(requestedNext, fallback));
    },
    [router, requestedNext],
  );

  useEffect(() => {
    if (!loading && !user) arrivedSignedOut.current = true;
  }, [loading, user]);

  useEffect(() => {
    if (user) leave(arrivedSignedOut.current ? DEFAULT_NEXT_PATH : ALREADY_SIGNED_IN_PATH);
  }, [user, leave]);

  if (loading) return <SignInFormSkeleton />;

  if (user) return <OttoLoadingScreen detail="Signing you in" />;

  return (
    <SignInForm
      autoFocus
      next={safeNextPath(requestedNext, DEFAULT_NEXT_PATH)}
      initialError={googleFailed ? GOOGLE_FAILED : undefined}
      onSignedIn={() => leave(DEFAULT_NEXT_PATH)}
    />
  );
}
