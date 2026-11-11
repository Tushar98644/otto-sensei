"use client";

import { bulletInputId } from "@/components/studio/editor/focus";
import { findBullet } from "@/lib/resume/ops";
import { useStudioStore } from "@/lib/store/resume-store";

const MAX_FRAMES = 30;

export function focusWhenShown(
  elementId: string,
  framesLeft = MAX_FRAMES,
  onMiss?: () => void,
): void {
  const element = document.getElementById(elementId);
  if (element) {
    element.scrollIntoView({ block: "center" });
    element.focus({ preventScroll: true });
    return;
  }
  if (framesLeft > 0) {
    window.requestAnimationFrame(() => focusWhenShown(elementId, framesLeft - 1, onMiss));
  } else {
    onMiss?.();
  }
}

// Set while a jump changes step, so the shell's heading focus doesn't win the race.
let jumpingToStep = false;

export function takeStepJump(): boolean {
  const was = jumpingToStep;
  jumpingToStep = false;
  return was;
}

export function showInEditor(elementId: string | null): void {
  const store = useStudioStore.getState();
  if (store.step !== "fix") jumpingToStep = true;
  store.setStep("fix");
  const top = () => window.scrollTo({ top: 0 });
  if (elementId) window.requestAnimationFrame(() => focusWhenShown(elementId, MAX_FRAMES, top));
  else window.requestAnimationFrame(top);
}

export function jumpToLine(sourceId: string, bulletId: string): void {
  const store = useStudioStore.getState();
  const active = store.activeId ? store.resumes[store.activeId] : undefined;
  if (!active || !findBullet(active, bulletId)) store.setActive(sourceId);
  showInEditor(bulletInputId(bulletId));
}

let arriving: string | null = null;

export function openLineOnArrival(bulletId: string): void {
  arriving = bulletId;
}

export function takeArrivingLine(): string | null {
  const bulletId = arriving;
  arriving = null;
  return bulletId;
}

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
