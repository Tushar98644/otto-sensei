"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";
import { ROUTES } from "@/components/site/routes";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { carriesFiles, dropHint, droppedResume } from "./drop-upload";

// A modal dialog makes the page under it inert, so a drop there is refused instead of taken.
const dialogOpen = () => document.querySelector("dialog[open]") !== null;

export function FileDropOverlay() {
  const t = useMessages("dashboard");
  const { fileCheck } = useMessages("ui");
  const router = useRouter();
  const [shown, setShown] = useState(false);

  const take = useEffectEvent(async (files: File[]) => {
    const dropped = droppedResume(files, t, fileCheck);
    if (dropped.problem !== null) {
      toast({ title: t.errors.cantUseFile, description: dropped.problem, variant: "error" });
      return;
    }
    const { file } = dropped;
    // At Free's limit, "Replace it" in the trial prompt runs this again.
    const open = async (): Promise<void> => {
      try {
        // The hand-off loads with the first drop, not with the page.
        const { openStudioWithFile } = await import("@/components/match-check/open-studio");
        if (await openStudioWithFile(file, () => void open())) router.push(ROUTES.studio);
      } catch {
        toast({
          title: t.errors.cantOpenStudio,
          description: t.errors.generic,
          variant: "error",
        });
      }
    };
    await open();
  });

  useEffect(() => {
    // dragenter and dragleave fire for every element crossed, so count them instead of toggling.
    let depth = 0;
    let claimed = false;
    let internal = false;
    const external = (event: DragEvent) => !internal && carriesFiles(event.dataTransfer);
    const reset = () => {
      depth = 0;
      claimed = false;
      setShown(false);
    };
    const onStart = () => {
      internal = true;
    };
    const onEnter = (event: DragEvent) => {
      if (!external(event)) return;
      depth += 1;
      event.preventDefault();
    };
    // Runs after React's handlers, so a drop zone on the page that took the drag has prevented it.
    const onOver = (event: DragEvent) => {
      if (!external(event)) return;
      claimed = event.defaultPrevented;
      if (claimed) {
        setShown(false);
        return;
      }
      // Without this the browser leaves the app to open the file.
      event.preventDefault();
      const refused = dialogOpen();
      if (event.dataTransfer) event.dataTransfer.dropEffect = refused ? "none" : "copy";
      setShown(!refused);
    };
    const onLeave = (event: DragEvent) => {
      if (!external(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) reset();
    };
    const onDrop = (event: DragEvent) => {
      if (!external(event)) {
        internal = false;
        return;
      }
      const theirs = claimed;
      reset();
      if (theirs) return;
      event.preventDefault();
      if (dialogOpen() || !event.dataTransfer) return;
      void take(Array.from(event.dataTransfer.files));
    };
    const onEnd = () => {
      internal = false;
      reset();
    };
    document.addEventListener("dragstart", onStart);
    document.addEventListener("dragenter", onEnter);
    document.addEventListener("dragover", onOver);
    document.addEventListener("dragleave", onLeave);
    document.addEventListener("drop", onDrop);
    document.addEventListener("dragend", onEnd);
    return () => {
      document.removeEventListener("dragstart", onStart);
      document.removeEventListener("dragenter", onEnter);
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("dragleave", onLeave);
      document.removeEventListener("drop", onDrop);
      document.removeEventListener("dragend", onEnd);
    };
  }, []);

  if (!shown) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 flex animate-fade-in bg-surface-muted/90 p-4 sm:p-8"
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink bg-surface/60 px-6 text-center">
        <FileUp className="size-8 text-ink" />
        <p className="text-lg/7 font-semibold text-ink">{t.drop.title}</p>
        <p className="max-w-sm text-sm/6 text-pretty text-muted">{dropHint(t)}</p>
      </div>
    </div>
  );
}
