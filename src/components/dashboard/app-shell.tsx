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

export function AppShell({ initialUser, children }: { initialUser: SessionUser; children: ReactNode }) {
  const router = useRouter();
  useCloudSync(initialUser.id);
  useOttoLoadingScreen(useFirstLoadPending(), "Loading your resumes");
  const { me, user, loading } = useMe();
  const actions = useStudioActions();

  const signedOut = !loading && me !== null && me.user === null;
  useEffect(() => {
    if (signedOut) router.replace(ROUTES.home);
  }, [signedOut, router]);

  const current = user ?? initialUser;

  return (
    <div className="flex min-h-dvh bg-surface-muted">
      <Sidebar user={current} me={me} actions={actions} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar user={current} />
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
