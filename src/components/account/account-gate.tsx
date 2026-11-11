"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { OTTO } from "@/components/mascot/lines";
import { toast } from "@/components/ui/toast";
import type { Feature } from "@/config/plans";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import { SESSION_ENDED_REASON } from "./copy";
import { LazySignInDialog, LazyUpgradeDialog } from "./lazy-dialogs";
import { refreshMe, useMe } from "./use-me";

export type AccountGate = {
  requireUser: (reason: string) => Promise<boolean>;
  handleApiError: (error: unknown, feature: Feature) => boolean;
  dialogs: ReactNode;
};

type SignInPrompt = { open: boolean; reason?: string };
type UpgradePrompt = { open: boolean; feature?: Feature; budget?: boolean };

// On a fresh page /api/me may not have answered yet. Ask the server rather than assume signed out.
async function signedInNow(): Promise<boolean> {
  try {
    return (await api.me()).user !== null;
  } catch {
    return false;
  }
}

export function useAccountGate(): AccountGate {
  const { user, loading } = useMe();
  const [signIn, setSignIn] = useState<SignInPrompt>({ open: false });
  const [upgrade, setUpgrade] = useState<UpgradePrompt>({ open: false });
  const waiting = useRef<Array<(signedIn: boolean) => void>>([]);

  const settle = useCallback((signedIn: boolean) => {
    const resolvers = waiting.current;
    waiting.current = [];
    for (const resolve of resolvers) resolve(signedIn);
  }, []);

  useEffect(() => () => settle(false), [settle]);

  const requireUser = useCallback(
    async (reason: string) => {
      if (user) return true;
      if (loading && (await signedInNow())) {
        void refreshMe();
        return true;
      }
      return new Promise<boolean>((resolve) => {
        waiting.current.push(resolve);
        setSignIn({ open: true, reason });
      });
    },
    [user, loading],
  );

  const handleApiError = useCallback(
    (error: unknown, feature: Feature) => {
      if (isApiError(error, "unauthorized")) {
        setSignIn({ open: true, reason: user ? SESSION_ENDED_REASON : OTTO.signIn.reason(feature) });
        void refreshMe();
        return true;
      }
      if (isApiError(error, "limit_reached") || isApiError(error, "upgrade_required")) {
        setUpgrade({ open: true, feature, budget: isBudgetReached(error) });
        void refreshMe();
        return true;
      }
      return false;
    },
    [user],
  );

  const handleSignInOpenChange = useCallback(
    (open: boolean) => {
      setSignIn((prompt) => ({ ...prompt, open }));
      if (!open) settle(false);
    },
    [settle],
  );

  const handleSignedIn = useCallback(() => {
    const someoneWaiting = waiting.current.length > 0;
    settle(true);
    if (!someoneWaiting) {
      toast({ title: "You're signed in.", description: "Try that again now.", variant: "success" });
    }
  }, [settle]);

  const handleUpgradeOpenChange = useCallback(
    (open: boolean) => setUpgrade((prompt) => ({ ...prompt, open })),
    [],
  );

  const dialogs = useMemo(
    () => (
      <>
        <LazySignInDialog
          open={signIn.open}
          onOpenChange={handleSignInOpenChange}
          reason={signIn.reason}
          onSignedIn={handleSignedIn}
        />
        <LazyUpgradeDialog
          open={upgrade.open}
          onOpenChange={handleUpgradeOpenChange}
          feature={upgrade.feature}
          budget={upgrade.budget}
        />
      </>
    ),
    [signIn, upgrade, handleSignInOpenChange, handleSignedIn, handleUpgradeOpenChange],
  );

  return useMemo(
    () => ({ requireUser, handleApiError, dialogs }),
    [requireUser, handleApiError, dialogs],
  );
}
