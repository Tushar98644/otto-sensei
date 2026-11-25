"use client";

import { bulletInputId, entryFieldId, SUMMARY_INPUT_ID } from "@/components/studio/editor/focus";
import { sectionTitleOf, type Resume } from "@/lib/resume/schema";
import type { SendCheckTarget } from "@/lib/sendcheck";
import { useStudioStore } from "@/lib/store/resume-store";

const MAX_FRAMES = 30;

function isShown(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

function sectionToggle(title: string): HTMLElement | null {
  for (const button of document.querySelectorAll<HTMLButtonElement>("section h3 button")) {
    if (button.textContent?.trim().toLowerCase().startsWith(title.toLowerCase())) return button;
  }
  return null;
}

function land(element: HTMLElement): void {
  element.scrollIntoView({ block: "center" });
  element.focus({ preventScroll: true });
}

function openEntry(entryId: string): boolean {
  const first = document.getElementById(entryFieldId(entryId, "first"));
  if (first && isShown(first)) {
    land(first);
    return true;
  }
  const heading = document.getElementById(entryFieldId(entryId, "heading"));
  if (!heading) return false;
  heading.scrollIntoView({ block: "center" });
  const toggle = heading
    .closest("li")
    ?.querySelector<HTMLButtonElement>(`button[aria-describedby="${CSS.escape(heading.id)}"]`);
  if (toggle?.getAttribute("aria-expanded") === "false") toggle.click();
  else toggle?.focus({ preventScroll: true });
  return true;
}

function openSection(toggle: HTMLElement | null): boolean {
  if (!toggle) return false;
  if (toggle.getAttribute("aria-expanded") === "false") toggle.click();
  land(toggle);
  return true;
}

function find(target: SendCheckTarget, resume: Resume): (() => boolean) | null {
  switch (target.kind) {
    case "line":
      return () => {
        const line = document.getElementById(bulletInputId(target.bulletId));
        if (!line) return false;
        land(line);
        return true;
      };
    case "entry":
      return () => openEntry(target.entryId);
    case "summary":
      return () => {
        const field = document.getElementById(SUMMARY_INPUT_ID);
        if (!field) return false;
        land(field);
        return true;
      };
    case "basics":
      return () => {
        const field = document.querySelector<HTMLElement>(
          `[data-basics="${CSS.escape(target.field)}"]`,
        );
        if (!field) return false;
        land(field);
        return true;
      };
    case "section":
      return () => openSection(sectionToggle(sectionTitleOf(resume, target.section)));
    case "extra":
      return () => openSection(document.getElementById(entryFieldId(target.sectionId, "section")));
    case "letter":
      return null;
  }
}

function retry(attempt: () => boolean, framesLeft = MAX_FRAMES): void {
  if (attempt() || framesLeft === 0) return;
  window.requestAnimationFrame(() => retry(attempt, framesLeft - 1));
}

export function openSendCheckTarget(resume: Resume, target: SendCheckTarget): void {
  const store = useStudioStore.getState();
  store.setStep(target.kind === "letter" ? "tailor" : "fix");
  const attempt = find(target, resume);
  if (attempt) window.requestAnimationFrame(() => retry(attempt));
}
