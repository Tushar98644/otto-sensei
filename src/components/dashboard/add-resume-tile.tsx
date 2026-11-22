"use client";

import { ChevronDown, Plus } from "lucide-react";
import { AddArt } from "./library/add-art";
import { NewResumeMenu } from "./new-resume-menu";
import type { StudioActions } from "./use-studio-actions";

const PAPER =
  "bg-surface/55 transition-colors duration-200 group-hover/otto:bg-surface group-aria-expanded/otto:bg-surface";

// A file dropped on it goes to the studio through the dashboard's drop-anywhere overlay.
export function AddResumeTile({ actions }: { actions: StudioActions }) {
  return (
    <div className="flex flex-1 flex-col">
      <NewResumeMenu
        actions={actions}
        triggerClassName="group/otto flex w-full flex-1 flex-col rounded-2xl text-left"
        trigger={
          <>
            <span
              aria-hidden
              className={`flex h-8 w-fit items-center gap-1.5 rounded-t-xl px-3.5 text-xs/4 font-medium tracking-widest text-subtle uppercase ${PAPER}`}
            >
              <Plus className="size-3.5" strokeWidth={2} />
              New
            </span>
            <span className={`flex flex-1 flex-col rounded-2xl rounded-tl-none p-2 ${PAPER}`}>
              <AddArt />
              <span className="flex flex-col px-2 pt-4 pb-2">
                <span className="inline-flex items-center gap-1.5 text-lg/6 font-medium tracking-tight text-ink">
                  Add a resume
                  <ChevronDown
                    aria-hidden
                    className="size-4 text-muted transition-transform duration-200 ease-out group-hover/otto:translate-y-0.5 group-hover/otto:text-ink"
                  />
                </span>
                <span aria-hidden className="mt-1.5 max-w-72 text-sm/6 text-muted">
                  <span className="pointer-coarse:hidden">
                    Drop a PDF or Word file here, or choose how to start.
                  </span>
                  <span className="hidden pointer-coarse:inline">
                    Upload a file, import one or start from scratch.
                  </span>
                </span>
              </span>
            </span>
          </>
        }
      />
    </div>
  );
}
