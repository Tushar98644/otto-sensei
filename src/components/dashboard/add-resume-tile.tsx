"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { OTTO } from "@/components/mascot/lines";
import { openStudioWithFile } from "@/components/match-check/open-studio";
import { ROUTES } from "@/components/site/routes";
import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { checkFile } from "@/components/ui/file-check";
import { toast } from "@/components/ui/toast";
import { UPLOAD_LIMITS } from "@/config/plans";
import { cn } from "@/lib/utils";
import { NewResumeMenu } from "./new-resume-menu";
import type { StudioActions } from "./use-studio-actions";

type FileFacts = Pick<File, "name" | "type" | "size">;

export function droppedUpload<T extends FileFacts>(
  files: ArrayLike<T>,
): { file: T } | { problem: string } | null {
  if (files.length > 1) return { problem: "Drop one file at a time." };
  const file = files[0];
  if (!file) return null;
  const problem = checkFile(file, { accept: UPLOAD_ACCEPT, maxBytes: UPLOAD_LIMITS.maxBytes });
  return problem ? { problem } : { file };
}

function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return event.dataTransfer.types.includes("Files");
}

const TILE =
  "flex min-h-40 w-full flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong px-6 py-8 text-center transition-colors hover:border-ink hover:bg-surface aria-expanded:border-ink aria-expanded:bg-surface";

export function AddResumeTile({ actions }: { actions: StudioActions }) {
  const router = useRouter();
  // dragenter and dragleave also fire for every child element, so they are counted.
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [opening, setOpening] = useState(false);

  async function open(file: File) {
    setOpening(true);
    try {
      if (await openStudioWithFile(file)) {
        router.push(ROUTES.studio);
        return;
      }
    } catch {
      toast({
        title: "Couldn't open that file",
        description: OTTO.errors.generic,
        variant: "error",
      });
    }
    setOpening(false);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    // Any drop-anywhere handler further up would open the same file a second time.
    event.stopPropagation();
    depth.current = 0;
    setDragging(false);
    if (opening) return;
    const dropped = droppedUpload(event.dataTransfer.files);
    if (!dropped) return;
    if ("problem" in dropped) {
      toast({ title: "Couldn't add that file", description: dropped.problem, variant: "error" });
      return;
    }
    void open(dropped.file);
  }

  return (
    <div
      aria-busy={opening || undefined}
      onDragEnter={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (!hasFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setDragging(false);
      }}
      onDrop={drop}
      className="flex flex-1 flex-col sm:mt-8"
    >
      <NewResumeMenu
        actions={actions}
        triggerClassName={cn(TILE, dragging && "border-ink bg-surface")}
        trigger={
          <>
            <Plus aria-hidden className="size-6 text-ink" />
            <span className="text-base/6 font-medium text-ink">
              {opening ? "Opening the studio…" : "Add a resume"}
            </span>
            <span className="max-w-64 text-sm/5 text-subtle">
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
