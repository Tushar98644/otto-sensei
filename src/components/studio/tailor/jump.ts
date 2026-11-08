"use client";

import { bulletInputId } from "@/components/studio/editor/focus";
import { findBullet } from "@/lib/resume/ops";
import { useStudioStore } from "@/lib/store/resume-store";

// The Fix step mounts on the next render after setStep(), and its sections may take a frame or
// two more, so the line is looked for a few frames in a row before giving up quietly.
const MAX_FRAMES = 30;

function focusWhenShown(elementId: string, framesLeft = MAX_FRAMES): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ block: "center" });
    element.focus({ preventScroll: true });
    return;
  }
  if (framesLeft > 0) window.requestAnimationFrame(() => focusWhenShown(elementId, framesLeft - 1));
}

/**
 * Opens the line in the editor. The proof comes from `sourceId`; when the open resume (a tailored
 * copy, say) doesn't have that line, the source opens instead.
 */
export function jumpToLine(sourceId: string, bulletId: string): void {
  const store = useStudioStore.getState();
  const active = store.activeId ? store.resumes[store.activeId] : undefined;
  if (!active || !findBullet(active, bulletId)) store.setActive(sourceId);
  store.setStep("fix");
  window.requestAnimationFrame(() => focusWhenShown(bulletInputId(bulletId)));
}

// Saves a generated file without leaving the page.
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  // Some browsers start the download after click() returns; revoking at once can cancel it.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
