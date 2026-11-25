"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { cn } from "@/lib/utils";
import { CalendarChip } from "./calendar";
import { LeadArt } from "./lead-art";
import type { StepTone, StepView } from "./step-view";

const TILES: Record<StepTone, string> = {
  forest: "bg-primary/8 text-primary",
  amber: "bg-warn-soft text-warn-ink",
  sepia: "bg-otter-light text-otter",
  green: "bg-pass-soft text-pass-ink",
  mist: "bg-surface-muted text-ink",
};

const PILLS: Record<StepTone, string> = {
  forest: "bg-primary/8 text-primary",
  amber: "bg-warn-soft text-warn-ink",
  sepia: "bg-otter-light text-otter",
  green: "bg-pass-soft text-pass-ink",
  mist: "bg-surface-muted text-muted",
};

export const stagger = (index: number): CSSProperties => ({ animationDelay: `${index * 70}ms` });

function Pill({ tone, children }: { tone: StepTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-full px-2 text-xs/4 font-medium whitespace-nowrap tabular-nums",
        PILLS[tone],
      )}
    >
      {children}
    </span>
  );
}

function StepTarget({
  view,
  className,
  children,
}: {
  view: StepView;
  className: string;
  children: ReactNode;
}) {
  return view.href ? (
    <Link href={view.href} className={className}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={view.onSelect} className={className}>
      {children}
    </button>
  );
}

export function LeadStep({
  view,
  setup,
}: {
  view: StepView;
  setup?: { done: number; total: number };
}) {
  // From md the stage is as wide as the action card stages below, so the two line up.
  return (
    <div className="group/lead group/otto relative grid gap-2 rounded-xl has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink motion-safe:animate-fade-in sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:grid-cols-[max(15rem,calc((100%-1.5rem)/3-1rem))_minmax(0,1fr)]">
      <LeadArt scene={view.scene} at={view.at} setup={setup} />
      <div className="flex min-w-0 flex-col items-start gap-4 px-2 pt-2 pb-2 sm:justify-center sm:px-4 sm:py-5 lg:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Eyebrow as="span">{view.eyebrow}</Eyebrow>
            {view.badge ? <Pill tone={view.tone}>{view.badge}</Pill> : null}
          </div>
          <h3 className="font-display text-2xl/8 font-normal tracking-tight text-pretty text-ink sm:text-3xl/9">
            <StepTarget
              view={view}
              className="text-left outline-none after:absolute after:inset-0 after:rounded-xl"
            >
              {view.title}
            </StepTarget>
          </h3>
          {view.detail ? <p className="text-sm/6 text-pretty text-muted">{view.detail}</p> : null}
        </div>
        {/* The whole card is the link above; the key only shows where to press. */}
        <span
          aria-hidden
          className={buttonClasses({
            className:
              "pointer-events-none group-hover/lead:from-primary-hover-top group-hover/lead:to-primary-hover group-active/lead:translate-y-px max-sm:w-full",
          })}
        >
          {view.cta}
          <ArrowRight className="transition-transform duration-200 group-hover/lead:translate-x-0.5" />
        </span>
      </div>
    </div>
  );
}

const TILE =
  "group/tile grid h-full w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl bg-surface p-3 text-left shadow-card ring-1 ring-ink/6 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-page-lift active:translate-y-0";

// Side by side from md, a tile stands up: icon and arrow on top, the words under them.
export function StepTile({ view, card }: { view: StepView; card: boolean }) {
  return (
    <StepTarget
      view={view}
      className={cn(
        TILE,
        card && "md:grid-cols-[minmax(0,1fr)_auto] md:content-start md:gap-y-4 md:p-4",
      )}
    >
      <span aria-hidden className={cn("self-start", card && "md:col-start-1 md:row-start-1")}>
        {view.scene === "interview" && view.at !== undefined ? (
          <CalendarChip at={view.at} />
        ) : (
          <span
            className={cn("flex size-10 items-center justify-center rounded-lg", TILES[view.tone])}
          >
            <view.icon className="size-5" />
          </span>
        )}
      </span>
      <span
        className={cn(
          "flex min-w-0 flex-col items-start gap-0.5",
          card && "md:col-span-2 md:row-start-2",
        )}
      >
        <span className="text-sm/6 font-medium text-pretty text-ink">{view.title}</span>
        {view.detail ? (
          <span className="text-sm/5 text-pretty text-muted">{view.detail}</span>
        ) : null}
        {view.badge ? (
          <span className="mt-1.5 flex">
            <Pill tone={view.tone}>{view.badge}</Pill>
          </span>
        ) : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "flex size-7 items-center justify-center rounded-full text-muted transition duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:bg-surface-muted group-hover/tile:text-ink",
          card && "md:col-start-2 md:row-start-1 md:self-center",
        )}
      >
        <ArrowRight className="size-4" />
      </span>
    </StepTarget>
  );
}

export function SetupProgress({
  done,
  total,
  onHide,
}: {
  done: number;
  total: number;
  onHide: () => void;
}) {
  const { home } = useMessages("dashboard");
  const fraction = total > 0 ? Math.min(Math.max(done / total, 0), 1) : 0;
  return (
    <div className="flex items-center gap-1 motion-safe:animate-fade-in">
      <div
        role="progressbar"
        aria-label={home.setup}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={fmt(home.setupDone, { done, total })}
        className="flex items-center gap-2 text-sm/5"
      >
        <svg viewBox="0 0 20 20" aria-hidden className="size-5 -rotate-90">
          <circle cx={10} cy={10} r={7.5} fill="none" strokeWidth={2.5} className="stroke-ink/12" />
          {fraction > 0 ? (
            <circle
              cx={10}
              cy={10}
              r={7.5}
              fill="none"
              strokeWidth={2.5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - fraction}
              className="stroke-primary motion-safe:animate-draw"
            />
          ) : null}
        </svg>
        <span className="text-muted">
          <span className="font-medium text-ink">{home.setup}</span>{" "}
          <span className="tabular-nums">{fmt(home.setupCount, { done, total })}</span>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onHide}
        className="-mr-2 text-muted hover:text-ink"
      >
        {home.hideSetup}
      </Button>
    </div>
  );
}
