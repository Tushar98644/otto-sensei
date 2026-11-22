"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { useSessionUserId } from "@/components/account/session-user";
import { Otto } from "@/components/mascot/otto";
import { loadingScreenUp } from "@/components/mascot/otto-loading-screen";
import { Button, buttonClasses } from "@/components/ui/button";
import { FolderCard } from "@/components/ui/folder-card";
import { Skeleton } from "@/components/ui/skeleton";
import { lazyComponent } from "@/components/ui/lazy";
import { Menu } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { api } from "@/lib/api/client";
import { recapHighlights, recapSummary } from "@/lib/recap/summary";
import type { Recap, RecapListing, RecapWeekId } from "@/lib/recap/types";
import { isDay, lastFullWeek, weekLabel } from "@/lib/recap/week";
import { useFirstLoadPending } from "@/lib/sync/use-cloud-sync";
import { cn } from "@/lib/utils";
import {
  closeRecap,
  markRecapSeen,
  openRecap,
  recapFor,
  rememberedWeek,
  rememberWeek,
  useRecap,
} from "./recap-store";

// The story's code loads only once a week is waiting to open, or someone opens one.
const story = lazyComponent(() => import("./recap-story").then((module) => module.RecapStory));
const RETRY_MS = 1_500;
const RECAP_PARAM = "recap";

function busy(): boolean {
  if (document.visibilityState === "hidden" || loadingScreenUp()) return true;
  if (document.querySelector("dialog[open]")) return true;
  const focused = document.activeElement;
  if (
    focused instanceof HTMLElement &&
    (focused.isContentEditable || focused.matches("input, textarea, select"))
  ) {
    return true;
  }
  try {
    return document.querySelector(":popover-open") !== null;
  } catch {
    return false;
  }
}

const noChanges = () => () => {};

function deviceWeek(): RecapWeekId {
  let timeZone = "UTC";
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {}
  return lastFullWeek(Date.now(), timeZone);
}

async function openWeek(snapshot: ReturnType<typeof useRecap>, week: RecapWeekId) {
  if (recapFor(snapshot, week)) {
    openRecap(week);
    return;
  }
  try {
    const { recap } = await api.recap(week);
    rememberWeek(recap);
    openRecap(week);
  } catch {
    toast({ title: "Couldn't open that week", description: "Please try again.", variant: "error" });
  }
}

export function RecapHome() {
  const userId = useSessionUserId();
  const snapshot = useRecap(userId);
  const loading = useFirstLoadPending();
  const router = useRouter();
  const pathname = usePathname();
  const asked = useSearchParams().get(RECAP_PARAM);
  const current = snapshot.index?.current ?? null;
  const waiting = current !== null && !current.seen;
  const wanted = snapshot.open !== null || waiting || asked !== null;
  const loaded = useSyncExternalStore(story.subscribe, story.getState, story.getState);
  const Story = loaded.status === "ready" ? loaded.value : null;
  const handled = useRef<string | null>(null);
  // A week already seen ready in this browser keeps its place on Home, so nothing below jumps.
  const expected = useSyncExternalStore(
    noChanges,
    () => {
      const week = rememberedWeek(userId);
      return week && week === deviceWeek() ? week : null;
    },
    () => null,
  );

  useEffect(() => {
    if (wanted) void story.load().catch(() => {});
  }, [wanted]);

  // A bell row or link names its week; the address drops it once it's open.
  useEffect(() => {
    if (!asked || handled.current === asked || snapshot.status !== "ready") return;
    handled.current = asked;
    router.replace(pathname, { scroll: false });
    const known =
      isDay(asked) &&
      (current?.recap.week === asked ||
        snapshot.index?.earlier.some((item) => item.week === asked));
    if (known) void openWeek(snapshot, asked);
  }, [asked, snapshot, current, router, pathname]);

  // Opens by itself once, when nothing else is on screen.
  useEffect(() => {
    if (!waiting || loading || asked || snapshot.open !== null || !current) return;
    let timer = 0;
    const attempt = () => {
      if (busy()) timer = window.setTimeout(attempt, RETRY_MS);
      else openRecap(current.recap.week);
    };
    timer = window.setTimeout(attempt, 600);
    return () => window.clearTimeout(timer);
  }, [waiting, loading, asked, snapshot.open, current]);

  const shown = snapshot.open ? recapFor(snapshot, snapshot.open) : null;
  const ready = Story !== null && shown !== null;

  useEffect(() => {
    if (ready && shown) markRecapSeen(shown.week);
  }, [ready, shown]);

  if (!current || loading) {
    const pending = snapshot.status === "idle" || snapshot.status === "loading";
    return expected && (pending || loading) ? <RecapCardSkeleton week={expected} /> : null;
  }
  return (
    <>
      <RecapCard
        recap={current.recap}
        earlier={snapshot.index?.earlier ?? []}
        onOpen={(week) => void openWeek(snapshot, week)}
      />
      {Story && shown ? <Story key={shown.week} recap={shown} onClose={closeRecap} /> : null}
    </>
  );
}

const CARD_GRID =
  "grid gap-2 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[max(15rem,calc((100%-1.5rem)/3-1rem))_minmax(0,1fr)]";

function RecapCardSkeleton({ week }: { week: RecapWeekId }) {
  return (
    <FolderCard tab={`Your week with Otto · ${weekLabel(week)}`} bodyClassName="p-2" aria-hidden>
      <div className={CARD_GRID}>
        <div className="h-40 rounded-xl bg-surface-muted sm:h-full sm:min-h-44" />
        <div className="flex flex-col gap-4 px-2 pt-2 pb-3 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
          <Skeleton className="h-8 w-4/5 rounded-lg" />
          <Skeleton className="h-11 w-44 rounded-xl" />
        </div>
      </div>
    </FolderCard>
  );
}

function RecapArt({ recap }: { recap: Recap }) {
  const lead = recapHighlights(recap)[0] ?? "";
  const [count, ...words] = lead.split(" ");
  return (
    <div
      aria-hidden
      className="relative h-40 overflow-hidden rounded-xl bg-surface-muted sm:h-full sm:min-h-44"
    >
      <div className="absolute top-5 right-6 h-36 w-28 rotate-6 rounded-lg bg-surface/70 shadow-page" />
      <div className="absolute top-4 right-10 flex h-36 w-28 -rotate-3 flex-col rounded-lg bg-surface p-3 shadow-page transition duration-300 ease-out group-hover/recap:-translate-y-1 group-hover/recap:-rotate-1">
        <span className="w-fit rounded-sm bg-lavender px-1 text-[9px]/3 font-medium tracking-wider text-ink uppercase">
          {weekLabel(recap.week)}
        </span>
        {recap.quiet ? (
          <span className="mt-3 font-display text-2xl/7 text-ink">Quiet</span>
        ) : (
          <>
            <span className="mt-2 font-display text-5xl/none text-ink lining-nums">{count}</span>
            <span className="mt-1 text-[10px]/3 text-muted">{words.join(" ")}</span>
          </>
        )}
        <span className="mt-auto block h-1 w-14 rounded-full bg-surface-strong" />
        <span className="mt-1.5 block h-1 w-10 rounded-full bg-surface-strong" />
      </div>
      <Otto pose="wave" size={96} className="absolute -bottom-1 left-2" />
    </div>
  );
}

function RecapCard({
  recap,
  earlier,
  onOpen,
}: {
  recap: Recap;
  earlier: readonly RecapListing[];
  onOpen: (week: RecapWeekId) => void;
}) {
  const label = weekLabel(recap.week);
  return (
    <FolderCard tab={`Your week with Otto · ${label}`} bodyClassName="p-2">
      <section
        aria-label={`Your week with Otto, ${label}`}
        className={cn("group/recap", CARD_GRID)}
      >
        <RecapArt recap={recap} />
        <div className="flex min-w-0 flex-col items-start gap-4 px-2 pt-2 pb-3 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
          <p className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
            {recapSummary(recap)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onOpen(recap.week)}>
              Open your week
              <ArrowRight aria-hidden />
            </Button>
            {earlier.length > 0 ? (
              <Menu
                label="Earlier weeks"
                trigger={
                  <>
                    Earlier weeks
                    <ChevronDown aria-hidden />
                  </>
                }
                triggerClassName={buttonClasses({ variant: "ghost" })}
                items={earlier.map((item) => ({
                  label: weekLabel(item.week),
                  description: item.headline ?? "A quiet week",
                  onSelect: () => onOpen(item.week),
                }))}
              />
            ) : null}
          </div>
        </div>
      </section>
    </FolderCard>
  );
}
