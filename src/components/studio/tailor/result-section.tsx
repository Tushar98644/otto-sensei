"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ResultSectionProps = {
  id?: string;
  title: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
};

// A summary holds phrasing and heading content only, so the grid lays it out without a div.
export function ResultSection({ id, title, meta, children, className }: ResultSectionProps) {
  return (
    <details id={id} className={cn("group/result scroll-mt-24 rounded-2xl bg-surface", className)}>
      <summary className="grid min-h-14 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-2xl px-4 py-3 group-open/result:rounded-b-none hover:bg-surface-hover sm:px-6 sm:py-4 [&::-webkit-details-marker]:hidden">
        <h2 className="col-start-1 font-sans text-base/6 font-medium text-pretty text-ink">
          {title}
        </h2>
        {meta ? (
          <span className="col-start-1 row-start-2 text-sm/6 text-pretty text-muted">{meta}</span>
        ) : null}
        <ChevronDown
          aria-hidden
          className="col-start-2 row-span-2 row-start-1 size-4 text-muted transition-transform group-open/result:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 px-4 pt-1 pb-4 text-ink sm:gap-5 sm:px-6 sm:pb-6">
        {children}
      </div>
    </details>
  );
}
