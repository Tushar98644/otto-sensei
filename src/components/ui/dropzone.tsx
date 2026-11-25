"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMessagesOr } from "@/i18n/client";
import EN_UI from "@/i18n/messages/en/ui";
import { checkFile } from "./file-check";

export type DropzoneProps = {
  onFile: (file: File) => void;
  onReject: (message: string) => void;
  accept?: string;
  maxBytes?: number;
  disabled?: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
};

export function Dropzone({
  onFile,
  onReject,
  accept,
  maxBytes,
  disabled = false,
  label,
  children,
  className,
}: DropzoneProps) {
  const words = useMessagesOr("ui", EN_UI);
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave also fire for every child element, so count them instead of toggling.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  // A file dropped just outside the zone would make the browser leave the app to open it.
  useEffect(() => {
    const guard = (event: globalThis.DragEvent) => {
      const transfer = event.dataTransfer;
      if (!transfer || !transfer.types.includes("Files")) return;
      // Something else on the page, such as the dashboard's drop-anywhere, already took it.
      if (event.defaultPrevented) return;
      if (event.target instanceof Node && zoneRef.current?.contains(event.target)) return;
      event.preventDefault();
      transfer.dropEffect = "none";
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function take(files: FileList | null) {
    if (disabled || !files || files.length === 0) return;
    if (files.length > 1) {
      onReject(words.dropOne);
      return;
    }
    const file = files[0];
    if (!file) return;
    const problem = checkFile(file, { accept, maxBytes }, words.fileCheck);
    if (problem) onReject(problem);
    else onFile(file);
  }

  return (
    <>
      <div
        ref={zoneRef}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={label}
        data-dragging={dragging || undefined}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openPicker();
        }}
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current += 1;
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          if (!hasFiles(event)) return;
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          take(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border-strong bg-surface px-6 py-10 text-center transition-colors hover:border-ink aria-disabled:pointer-events-none aria-disabled:border-border aria-disabled:bg-surface-muted aria-disabled:text-muted data-dragging:border-ink data-dragging:bg-surface-muted",
          className,
        )}
      >
        {children}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        hidden
        tabIndex={-1}
        onChange={(event) => {
          take(event.currentTarget.files);
          // Lets the same file be picked again after a rejection.
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}

function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return event.dataTransfer.types.includes("Files");
}
