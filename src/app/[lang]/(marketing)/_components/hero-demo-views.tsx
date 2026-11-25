"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type View = "see" | "reads";

const VIEWS: readonly View[] = ["see", "reads"];

export type HeroDemoViewsCopy = { label: string } & Record<View, string>;

export type HeroDemoViewsProps = {
  copy: HeroDemoViewsCopy;
  see: ReactNode;
  reads: ReactNode;
  children?: ReactNode;
};

// Phones have room for one window, so a toggle swaps them; wider screens show both.
export function HeroDemoViews({ copy, see, reads, children }: HeroDemoViewsProps) {
  const [view, setView] = useState<View>("reads");
  return (
    <div className="relative grid gap-12 sm:gap-6 lg:grid-cols-2 lg:gap-16">
      <div
        role="group"
        aria-label={copy.label}
        className="flex justify-self-start rounded-xl bg-surface-strong p-1 sm:hidden"
      >
        {VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className="relative inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-medium whitespace-nowrap text-muted transition-colors -outline-offset-2 after:absolute after:inset-x-0 after:-inset-y-1 hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-control aria-pressed:ring-1 aria-pressed:ring-ink/5"
          >
            {copy[id]}
          </button>
        ))}
      </div>
      <div className={cn(view !== "see" && "max-sm:hidden")}>{see}</div>
      <div className={cn(view !== "reads" && "max-sm:hidden")}>{reads}</div>
      {children}
    </div>
  );
}
