"use client";

import Link from "next/link";
import { useMe } from "@/components/account/use-me";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND } from "@/config/brand";
import { useStudioStore } from "@/lib/store/resume-store";
import { AccountMenu } from "./account-menu";
import { HistoryControls } from "./history/history-controls";
import { ResumeSwitcher } from "./resume-switcher";

export type StudioTopBarProps = {
  // The switcher reads the browser copy, which doesn't exist until the store has loaded.
  hydrated: boolean;
  onSignIn: () => void;
};

export function StudioTopBar({ hydrated, onSignIn }: StudioTopBarProps) {
  const activeId = useStudioStore((s) => s.activeId);
  // Signed in, home is the dashboard. The sales page would also send them there, but only on a
  // full page load: a client-side move to the prefetched "/" just shows the sales page.
  const { user } = useMe();
  return (
    <header className="sticky top-0 z-30 bg-surface-muted">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          href={user ? ROUTES.dashboard : ROUTES.home}
          aria-label={`${BRAND.name} home`}
          className="flex h-11 shrink-0 items-center gap-2 rounded-lg pr-1"
        >
          <OttoMark className="size-8" />
          <span className="hidden font-display text-xl/none font-medium tracking-tight text-ink sm:inline">
            {BRAND.name}
          </span>
        </Link>
        <div className="flex min-w-0 flex-1">
          {hydrated ? <ResumeSwitcher /> : <Skeleton className="h-11 w-40 rounded-lg" />}
        </div>
        {/* Rendered only after load: history belongs to the browser copy, and the shortcut hints
            depend on the platform, which the server can't know. */}
        {hydrated ? <HistoryControls resumeId={activeId} /> : null}
        <AccountMenu onSignIn={onSignIn} />
      </div>
    </header>
  );
}
