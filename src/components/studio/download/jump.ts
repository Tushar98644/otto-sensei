"use client";

import { bulletInputId, entryFieldId } from "@/components/studio/editor/focus";
import { SECTION_LABELS, sectionTitleOf, type Resume } from "@/lib/resume/schema";
import type { SendCheckTarget } from "@/lib/sendcheck";
import { useStudioStore } from "@/lib/store/resume-store";

// "Fix it" on a send-check item: open the step where that text is edited and put the cursor on
// it. The Fix step mounts a frame or two after setStep(), so the target is looked for a few frames
// in a row before giving up quietly; the step itself is then still the right place to be.

const MAX_FRAMES = 30;

const BASICS_LABELS = {
  name: "Full name",
  headline: "Headline",
  email: "Email",
  phone: "Phone",
  location: "Location",
  // The first link's address: the editor has no field for the links as a whole.
  links: "Web address",
} as const;

function isShown(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

// The field a visible <label> names. Labels may carry an "Optional" tag after the name.
function byLabel(text: string, scope: ParentNode = document): HTMLElement | null {
  for (const label of scope.querySelectorAll("label")) {
    const name = label.textContent?.trim() ?? "";
    if (!name.toLowerCase().startsWith(text.toLowerCase())) continue;
    const field = label.htmlFor
      ? document.getElementById(label.htmlFor)
      : label.querySelector<HTMLElement>("input, textarea, select");
    if (field) return field;
  }
  return null;
}

// The toggle of the editor section with this heading, e.g. "Skills".
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

// A job's or school's details fold away once filled: open them, which moves focus to the first
// field, or focus that field if they are already open.
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
        const field = byLabel(sectionTitleOf(resume, "summary")) ?? byLabel(SECTION_LABELS.summary);
        if (!field) return false;
        land(field);
        return true;
      };
    case "basics":
      return () => {
        const field = byLabel(BASICS_LABELS[target.field]);
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
  // The cover letter is written and edited with the job, on the Tailor step.
  store.setStep(target.kind === "letter" ? "tailor" : "fix");
  const attempt = find(target, resume);
  if (attempt) window.requestAnimationFrame(() => retry(attempt));
}
