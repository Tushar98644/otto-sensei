"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OTTO } from "./lines";
import { Otto } from "./otto";
import type { OttoPose } from "./otto-poses";

export type OttoTask = keyof typeof OTTO.working;

const TASK_POSE: Record<OttoTask, OttoPose> = {
  import: "read",
  job: "read",
  tailor: "read",
  fix: "think",
  line: "think",
  summary: "think",
  letter: "think",
  answer: "think",
  draft: "think",
  interview: "point",
  githubLookup: "point",
  github: "point",
};

// A quick answer comes back before this, so he never flashes on and off.
export const OTTO_WORKING_DELAY_MS = 400;

export function revealAfter(delayMs: number, reveal: () => void): () => void {
  const timer = setTimeout(reveal, delayMs);
  return () => clearTimeout(timer);
}

export type OttoWorkingProps = {
  task: OttoTask;
  message?: string;
  detail?: ReactNode;
  // sm (64px) inside dialogs and small panels, md (96px) in a page.
  size?: "sm" | "md";
  // "stack" puts him above the line, centered, for wide areas like the dropzone.
  layout?: "row" | "stack";
  delayMs?: number;
  className?: string;
};

// Mount for the wait, unmount when the answer is in. aria-hidden: the status line says it all.
export function OttoWorking({
  task,
  message,
  detail,
  size = "md",
  layout = "row",
  delayMs = OTTO_WORKING_DELAY_MS,
  className,
}: OttoWorkingProps) {
  const [shown, setShown] = useState(delayMs <= 0);
  useEffect(() => {
    if (delayMs <= 0) return;
    return revealAfter(delayMs, () => setShown(true));
  }, [delayMs]);

  const small = size === "sm";
  return (
    <div
      className={cn(
        "flex",
        layout === "stack" ? "flex-col items-center gap-3 text-center" : "items-center gap-4",
        className,
      )}
    >
      {/* Holds his space while the delay runs, so nothing below jumps when he appears. */}
      <span aria-hidden className={cn("shrink-0", small ? "size-16" : "size-24")}>
        {shown ? (
          <Otto
            pose={TASK_POSE[task]}
            size={small ? 64 : 96}
            lively
            className="motion-safe:animate-fade-in"
          />
        ) : null}
      </span>
      <div className="min-w-0">
        {/* In the page from the start and filled after the delay, so screen readers announce it. */}
        <p
          role="status"
          className={cn(
            "text-pretty wrap-break-word text-ink",
            small ? "text-sm/6" : "text-base/7",
          )}
        >
          {shown ? (message ?? OTTO.working[task]) : null}
        </p>
        {shown && detail ? <p className="text-sm/6 text-muted">{detail}</p> : null}
      </div>
    </div>
  );
}
