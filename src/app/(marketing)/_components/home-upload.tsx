"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ROUTES } from "@/components/site/routes";
import { UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import { checkFile, formatBytes } from "@/components/ui/file-check";
import { toast } from "@/components/ui/toast";
import { UPLOAD_LIMITS } from "@/config/plans";
import {
  homeUploadState,
  loadOpener,
  preloadOpener,
  resetHomeUpload,
  setHomePicker,
  updateHomeUpload,
  useHomeUpload,
} from "./home-picker";

export type Picked = { file: File } | { problem: string } | null;

// The one file handed over, or why the studio couldn't take it.
export function pickedFile(files: ArrayLike<File> | null | undefined): Picked {
  const file = files?.[0];
  if (!files || !file) return null;
  if (files.length > 1) return { problem: "Choose one file at a time." };
  const problem = checkFile(file, { accept: UPLOAD_ACCEPT, maxBytes: UPLOAD_LIMITS.maxBytes });
  return problem ? { problem } : { file };
}

export function typingIn(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export async function openHomeFile(picked: Picked, go: (href: string) => void): Promise<void> {
  if (!picked || homeUploadState().opening) return;
  if ("problem" in picked) {
    toast({ title: picked.problem, variant: "error" });
    return;
  }
  updateHomeUpload({ opening: picked.file.name });
  try {
    const { handFileToStudio } = await loadOpener();
    await handFileToStudio(picked.file);
    // Opening stays set until the page goes away, so a slow navigation never takes a second file.
    go(ROUTES.studio);
  } catch {
    window.location.assign(ROUTES.studio);
  }
}

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

// Mounted once on the home page: the picker behind "Check my resume", a file dropped anywhere and a pasted file.
export function HomeUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { opening } = useHomeUpload();

  useEffect(() => {
    setHomePicker(inputRef.current);
    const go = (href: string) => router.push(href);
    // dragenter and dragleave fire for every element crossed, so count them instead of toggling.
    let depth = 0;
    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth += 1;
      if (homeUploadState().dragging) return;
      updateHomeUpload({ dragging: true });
      preloadOpener();
      router.prefetch(ROUTES.studio);
    };
    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) updateHomeUpload({ dragging: false });
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      updateHomeUpload({ dragging: false });
      void openHomeFile(pickedFile(event.dataTransfer?.files), go);
    };
    const onPaste = (event: ClipboardEvent) => {
      if (typingIn(event.target)) return;
      const picked = pickedFile(event.clipboardData?.files);
      if (!picked) return;
      event.preventDefault();
      void openHomeFile(picked, go);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      document.removeEventListener("paste", onPaste);
      resetHomeUpload();
    };
  }, [router]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          const picked = pickedFile(event.currentTarget.files);
          // Lets the same file be picked again after a rejection.
          event.currentTarget.value = "";
          void openHomeFile(picked, (href) => router.push(href));
        }}
      />
      <p role="status" className="sr-only">
        {opening ? `Opening ${opening} in the studio.` : ""}
      </p>
    </>
  );
}

// Covers the hero's example while a file is dragged over the page.
export function HomeDropCue() {
  const { dragging } = useHomeUpload();
  if (!dragging) return null;
  return (
    <div
      aria-hidden
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-ink bg-surface-muted px-6 text-center"
    >
      <FileUp className="size-6 text-ink" />
      <p className="text-lg/7 font-medium text-ink">Drop your resume to check it</p>
      <p className="text-sm text-muted">
        PDF or Word (.docx), up to {formatBytes(UPLOAD_LIMITS.maxBytes)}
      </p>
    </div>
  );
}
