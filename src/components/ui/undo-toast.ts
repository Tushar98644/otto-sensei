"use client";

import { dismissToast, toast } from "./toast";

export const UNDO_MS = 6_000;

export type UndoToastOptions = {
  title: string;
  description?: string;
  onUndo: () => void;
  onCommit?: (options: { keepalive: boolean }) => void;
};

export type UndoHandle = {
  undo: () => void;
};

export function undoToast({ title, description, onUndo, onCommit }: UndoToastOptions): UndoHandle {
  if (typeof window === "undefined") return { undo: () => {} };
  let settled = false;

  function commit(keepalive: boolean) {
    if (settled) return;
    settled = true;
    window.removeEventListener("pagehide", onPageHide);
    onCommit?.({ keepalive });
  }

  function onPageHide() {
    commit(true);
  }

  if (onCommit) window.addEventListener("pagehide", onPageHide);

  function drop() {
    settled = true;
    window.removeEventListener("pagehide", onPageHide);
  }

  const id = toast({
    title,
    description,
    durationMs: UNDO_MS,
    action: { label: "Undo", onAction: onUndo },
    onClose: (reason) => {
      if (reason === "action") drop();
      else commit(false);
    },
  });

  return {
    undo: () => {
      if (settled) return;
      drop();
      dismissToast(id);
      onUndo();
    },
  };
}
