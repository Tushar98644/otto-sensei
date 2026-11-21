import { useSyncExternalStore } from "react";
import { readItem } from "@/lib/browser-storage";

// The studio store's key; copied so the home page can read a title without loading the store.
export const SAVED_STUDIO_KEY = "otto-studio-v1";

type SavedResume = { title?: unknown; basics?: { name?: unknown } };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function savedResumeTitle(raw: string | null): string | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const state = isRecord(parsed) ? parsed.state : null;
  if (!isRecord(state) || !isRecord(state.resumes)) return null;
  const resumes = state.resumes as Record<string, SavedResume>;
  const order = Array.isArray(state.order) ? state.order : [];
  const id = [state.activeId, ...order].find(
    (candidate): candidate is string =>
      typeof candidate === "string" && isRecord(resumes[candidate]),
  );
  const resume = id ? resumes[id] : undefined;
  if (!resume) return null;
  return text(resume.title) || text(resume.basics?.name) || "your resume";
}

let lastRaw: string | null = null;
let lastTitle: string | null = null;

function snapshot(): string | null {
  const raw = readItem(SAVED_STUDIO_KEY);
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastTitle = savedResumeTitle(raw);
  }
  return lastTitle;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Null on the server and on the first client render, so hydration matches.
export function useSavedResumeTitle(): string | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
