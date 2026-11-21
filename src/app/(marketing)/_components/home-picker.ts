import { useSyncExternalStore } from "react";

export type HomeUploadState = { dragging: boolean; opening: string | null; upgrade: boolean };

const IDLE: HomeUploadState = { dragging: false, opening: null, upgrade: false };

let state = IDLE;
let picker: HTMLInputElement | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function homeUploadState(): HomeUploadState {
  return state;
}

export function updateHomeUpload(next: Partial<HomeUploadState>): void {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

export function useHomeUpload(): HomeUploadState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}

export function setHomePicker(input: HTMLInputElement | null): void {
  picker = input;
}

export function resetHomeUpload(): void {
  picker = null;
  updateHomeUpload(IDLE);
}

// The studio's store loads only on intent, so the home page itself stays light.
export const loadOpener = () => import("@/components/match-check/open-studio");

export function preloadOpener(): void {
  void loadOpener().catch(() => undefined);
}

// False until HomeUpload has mounted, so the caller's link to the studio still works.
export function pickResumeFile(): boolean {
  if (!picker) return false;
  if (!state.opening) {
    preloadOpener();
    picker.click();
  }
  return true;
}
