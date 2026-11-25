"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useOtto } from "@/components/mascot/use-otto";
import { toast } from "@/components/ui/toast";
import type { Feature } from "@/config/plans";
import { api, isApiError, isBudgetReached } from "@/lib/api/client";
import { LazySignInDialog, LazyUpgradeDialog } from "./lazy-dialogs";
import {
  clearPendingAction,
  savePendingAction,
  takePendingAction,
  type PendingAction,
} from "./pending-action";
import { refreshMe, useMe } from "./use-me";
import { useSignInWords } from "./use-sign-in-words";

export type AccountGate = {
  // Google reloads the page, so `action` is kept for useResumeAfterSignIn to run once the user is back.
  requireUser: (reason: string, action?: PendingAction) => Promise<boolean>;
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
  const words = useSignInWords();
  const otto = useOtto();
  const [signIn, setSignIn] = useState<SignInPrompt>({ open: false });
  const [upgrade, setUpgrade] = useState<UpgradePrompt>({ open: false });
  const waiting = useRef<Array<(signedIn: boolean) => void>>([]);
  const action = useRef<PendingAction | null>(null);

  const settle = useCallback((signedIn: boolean) => {
    const resolvers = waiting.current;
    waiting.current = [];
    action.current = null;
    for (const resolve of resolvers) resolve(signedIn);
  }, []);

  useEffect(() => () => settle(false), [settle]);

  const requireUser = useCallback(
    async (reason: string, pending?: PendingAction) => {
      if (user) return true;
      if (loading && (await signedInNow())) {
        void refreshMe();
        return true;
      }
      return new Promise<boolean>((resolve) => {
        waiting.current.push(resolve);
        action.current = pending ?? null;
        setSignIn({ open: true, reason });
      });
    },
    [user, loading],
  );

  const handleApiError = useCallback(
    (error: unknown, feature: Feature) => {
      if (isApiError(error, "unauthorized")) {
        setSignIn({
          open: true,
          reason: user ? words.gate.sessionEnded : otto.signIn.reason(feature),
        });
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
    [user, words, otto],
  );

  // Back from Google's page (bfcache) the dialog is still open; closing it or using the code ends that try.
  const forgetSaved = useCallback(() => {
    if (action.current) clearPendingAction();
  }, []);

  const handleSignInOpenChange = useCallback(
    (open: boolean) => {
      setSignIn((prompt) => ({ ...prompt, open }));
      if (open) return;
      forgetSaved();
      settle(false);
    },
    [settle, forgetSaved],
  );

  const handleGoogleRedirect = useCallback(() => {
    if (action.current) savePendingAction(action.current);
  }, []);

  const handleSignedIn = useCallback(() => {
    const someoneWaiting = waiting.current.length > 0;
    forgetSaved();
    settle(true);
    if (!someoneWaiting) {
      toast({ title: words.done, description: words.gate.tryAgain, variant: "success" });
    }
  }, [settle, forgetSaved, words]);

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
          onGoogleRedirect={handleGoogleRedirect}
        />
        <LazyUpgradeDialog
          open={upgrade.open}
          onOpenChange={handleUpgradeOpenChange}
          feature={upgrade.feature}
          budget={upgrade.budget}
        />
      </>
    ),
    [
      signIn,
      upgrade,
      handleSignInOpenChange,
      handleSignedIn,
      handleGoogleRedirect,
      handleUpgradeOpenChange,
    ],
  );

  return useMemo(
    () => ({ requireUser, handleApiError, dialogs }),
    [requireUser, handleApiError, dialogs],
  );
}

// Runs the click that asked for sign-in once more, by itself, when the user is back from Google.
export function useResumeAfterSignIn(
  kind: string,
  replay: (ids: Record<string, string>) => void,
): void {
  const signedIn = useMe().user !== null;
  const backIn = useOtto().signIn.done;
  const run = useEffectEvent(replay);
  useEffect(() => {
    if (!signedIn) return;
    const ids = takePendingAction(kind);
    if (!ids) return;
    toast({ title: backIn, variant: "success" });
    run(ids);
  }, [kind, signedIn, backIn]);
}
