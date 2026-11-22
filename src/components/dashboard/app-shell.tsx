"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { SessionUserProvider } from "@/components/account/session-user";
import { UpgradePromptHost } from "@/components/account/upgrade-prompt";
import { useMe, type Me } from "@/components/account/use-me";
import { PauseOffscreenLoops } from "@/components/mascot/offscreen-loops";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { DashboardTour } from "@/components/onboarding/dashboard-tour";
import { ROUTES } from "@/components/site/routes";
import { lazyModule, useLazy, whenIdle } from "@/components/ui/lazy";
import { plantSeeds, type ApiSeeds } from "@/lib/api/seeds";
import type { SessionUser } from "@/lib/auth/types";
import { getQueryClient } from "@/lib/queries/client";
import { recallMatches } from "@/lib/queries/matches-memory";
import { useCloudSync, useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { CommandPaletteHost } from "./command-palette-host";
import { FileDropOverlay } from "./file-drop-overlay";
import { MobileBar } from "./mobile-bar";
import { preloadAllPageCode } from "./page-code";
import { warmSharedReads } from "./prefetch";
import { Sidebar } from "./sidebar";
import { useStudioActions } from "./use-studio-actions";

// Draws nothing and only saves first-login guesses, so it can wait for an idle moment.
const setupDefaults = lazyModule(() => import("@/components/setup/setup-defaults"));

export function AppShell({
  initialUser,
  initialMe,
  seeds,
  children,
}: {
  initialUser: SessionUser;
  initialMe: Me | null;
  seeds?: ApiSeeds;
  children: ReactNode;
}) {
  const router = useRouter();
  // Layout effects all run before the first passive effect, where every page's reads start.
  useLayoutEffect(() => {
    if (!seeds) return;
    plantSeeds(seeds);
    warmSharedReads(initialUser);
  }, [seeds, initialUser]);
  useLayoutEffect(() => recallMatches(getQueryClient(), initialUser.id), [initialUser.id]);
  useCloudSync(initialUser.id);
  useOttoLoadingScreen(useFirstLoadPending(initialUser.id), "Loading your resumes");
  const { me, user, loading } = useMe();
  const actions = useStudioActions();
  const setup = useLazy(setupDefaults, false);

  // Once the first page settles, the other pages' parts load, so moving between pages never waits on code.
  useEffect(() => whenIdle(preloadAllPageCode), []);

  const signedOut = !loading && me !== null && me.user === null;
  useEffect(() => {
    if (signedOut) router.replace(ROUTES.home);
  }, [signedOut, router]);

  const current = user ?? initialUser;

  return (
    <SessionUserProvider userId={initialUser.id} me={initialMe}>
      <div data-app-shell className="flex min-h-dvh bg-surface-muted">
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
        {setup ? <setup.SetupDefaults /> : null}
        <CommandPaletteHost actions={actions} />
        <FileDropOverlay />
        <UpgradePromptHost />
        <PauseOffscreenLoops />
      </div>
    </SessionUserProvider>
  );
}
