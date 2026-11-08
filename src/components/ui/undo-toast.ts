"use client";

import { dismissToast, toast } from "./toast";

// Undo instead of "Are you sure?": the change happens at once and the toast offers to take it
// back. Changes that can't be taken back on the server (a deleted row, a link turned off) are
// held: `commit` sends them when the toast goes, or right away if the page is closed first.

export const UNDO_MS = 6_000;

export type UndoToastOptions = {
  title: string;
  description?: string;
  // Puts things back as they were.
  onUndo: () => void;
  // Sends a held change. keepalive: the page is being closed, so the request must outlive it.
  onCommit?: (options: { keepalive: boolean }) => void;
};

export type UndoHandle = {
  // Takes the change back without the toast's button (something newer replaced it): the held
  // change is dropped, not sent.
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
