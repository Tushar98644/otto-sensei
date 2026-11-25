"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { DEFAULT_NEXT_PATH, safeNextPath, withPageHash } from "@/components/account/next-path";
import { SignInForm } from "@/components/account/sign-in-form";
import { SignInFormSkeleton } from "@/components/account/sign-in-form-skeleton";
import { useMe } from "@/components/account/use-me";
import { OttoLoadingScreen } from "@/components/mascot/otto-loading-screen";

const ALREADY_SIGNED_IN_PATH = DEFAULT_NEXT_PATH;

export function LoginForm({
  googleFailed,
  signingIn,
}: {
  googleFailed: string;
  signingIn: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = params.get("next");
  const failed = params.get("error") === "google";
  const { user, loading } = useMe();
  // Both the store update and onSignedIn announce the same sign-in; navigate once.
  const leaving = useRef(false);
  const arrivedSignedOut = useRef(false);

  const leave = useCallback(
    (fallback: string) => {
      if (leaving.current) return;
      leaving.current = true;
      const target = safeNextPath(requestedNext, fallback);
      router.replace(requestedNext ? withPageHash(target, window.location.hash) : target);
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

  if (user) return <OttoLoadingScreen detail={signingIn} />;

  return (
    <SignInForm
      autoFocus
      next={safeNextPath(requestedNext, DEFAULT_NEXT_PATH)}
      initialError={failed ? googleFailed : undefined}
      onSignedIn={() => leave(DEFAULT_NEXT_PATH)}
    />
  );
}
