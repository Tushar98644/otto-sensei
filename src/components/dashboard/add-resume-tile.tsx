"use client";

import { Plus } from "lucide-react";
import { NewResumeMenu } from "./new-resume-menu";
import type { StudioActions } from "./use-studio-actions";

// A file dropped on it goes to the studio through the dashboard's drop-anywhere overlay.
export function AddResumeTile({ actions }: { actions: StudioActions }) {
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <NewResumeMenu
        actions={actions}
        triggerClassName="flex min-h-40 w-full flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong px-6 py-8 text-center transition-colors hover:border-ink hover:bg-surface aria-expanded:border-ink aria-expanded:bg-surface"
        trigger={
          <>
            <Plus aria-hidden className="size-6 text-ink" />
            <span className="text-base/6 font-medium text-ink">Add a resume</span>
            <span aria-hidden className="max-w-64 text-sm/5 text-subtle">
              <span className="pointer-coarse:hidden">
                Drop a PDF or Word file here, or choose how to start.
              </span>
              <span className="hidden pointer-coarse:inline">
                Upload a file, import one or start from scratch.
              </span>
            </span>
          </>
        }
      />
    </div>
  );
}
