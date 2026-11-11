"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { createLoadingScreen, type LoadingScreenState } from "./loading-screen";
import { Otto } from "./otto";

// App-level waits only (route loads, first dashboard or studio load, sign-in or checkout return);
// in-page waits keep skeletons or the small working Otto. One screen lives in the root layout.

const screen = createLoadingScreen();
const HIDDEN: LoadingScreenState = { phase: "hidden", detail: null };
export const LOADING_SCREEN_TITLE = "Please wait, we're setting things up";

/** Whether the loading screen covers the page right now, for things that should wait (tours). */
export function loadingScreenUp(): boolean {
  return screen.getState().phase !== "hidden";
}

export function useOttoLoadingScreen(active: boolean, detail?: string | null): void {
  useEffect(() => {
    if (!active) return;
    return screen.request(detail ?? null);
  }, [active, detail]);
}

export function OttoLoadingScreen({ detail }: { detail?: string }) {
  useOttoLoadingScreen(true, detail);
  return null;
}

export function LoadingScreenHost({ children }: { children: ReactNode }) {
  const { phase, detail } = useSyncExternalStore(screen.subscribe, screen.getState, () => HIDDEN);
  const covering = phase === "shown";
  return (
    <>
      {/* `contents` keeps this wrapper out of every page's layout. While the screen covers the
          app, the app can't be tabbed into or read out from underneath it. */}
      <div className="contents" aria-busy={covering || undefined} inert={covering}>
        {children}
      </div>
      <LoadingScreenView phase={phase} detail={detail} />
    </>
  );
}

// The status region stays in the page while hidden: screen readers only announce text that
// arrives in a region they already know about.
export function LoadingScreenView({ phase, detail }: LoadingScreenState) {
  const hidden = phase === "hidden";
  const leaving = phase === "leaving";
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        hidden
          ? "sr-only"
          : "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 text-center",
        phase === "shown" && "motion-safe:animate-fade-in",
        // Reduced motion: no fade, it just goes.
        leaving && "pointer-events-none motion-safe:animate-fade-out motion-reduce:hidden",
      )}
    >
      {hidden ? null : (
        <>
          <span aria-hidden>
            <Otto pose="read" size={144} lively className="size-32 sm:size-36" />
          </span>
          <p className="mt-6 max-w-md font-display text-3xl/9 font-normal text-balance text-ink sm:text-4xl/10">
            {LOADING_SCREEN_TITLE}
          </p>
          {detail ? <p className="mt-3 text-base/7 text-muted">{detail}</p> : null}
        </>
      )}
    </div>
  );
}
