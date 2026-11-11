"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { UpgradePromptHost } from "@/components/account/upgrade-prompt";
import { useMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { FirstRunSetup } from "@/components/setup/first-run-setup";
import { ROUTES } from "@/components/site/routes";
import type { SessionUser } from "@/lib/auth/types";
import { useCloudSync, useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { MobileBar } from "./mobile-bar";
import { Sidebar } from "./sidebar";
import { useStudioActions } from "./use-studio-actions";

// The signed-in app frame: sidebar on desktop, top bar with tabs on phones, pages on the stone
// canvas. Every dashboard page renders inside it.
export function AppShell({ initialUser, children }: { initialUser: SessionUser; children: ReactNode }) {
  const router = useRouter();
  // Brings in resumes backed up from other devices, and sends deletions made here to the account.
  useCloudSync();
  useOttoLoadingScreen(useFirstLoadPending(), "Loading your resumes");
  const { me, user, loading } = useMe();
  const actions = useStudioActions();

  // Signed out from the menu, or the session ended in another tab: these pages are only for accounts.
  const signedOut = !loading && me !== null && me.user === null;
  useEffect(() => {
    if (signedOut) router.replace(ROUTES.home);
  }, [signedOut, router]);

  // The server already checked the session; /api/me takes over once it answers (plan changes etc.).
  const current = user ?? initialUser;

  return (
    <div className="flex min-h-dvh bg-surface-muted">
      <Sidebar user={current} me={me} actions={actions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar />
        {/* A page that is a workspace (the portfolio editor, [data-workspace]) fills the window
            from lg and keeps its own padding, so its panels can scroll on their own. */}
        <main
          id="main"
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-16 sm:px-8 lg:pt-10 lg:has-[[data-workspace]]:max-w-none lg:has-[[data-workspace]]:p-0"
        >
          {children}
        </main>
      </div>
      <DashboardTour />
      <FirstRunSetup />
      <UpgradePromptHost />
    </div>
  );
}
