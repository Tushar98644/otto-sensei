import { browserStorage } from "@/lib/browser-storage";
import type { TourName } from "./tours";

export type TourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const TOURS: readonly TourName[] = ["studio", "dashboard"];

const keyOf = (name: TourName) => `otto.tour.${name}`;

export function hasSeenTour(storage: TourStorage | null, name: TourName): boolean | null {
  if (!storage) return null;
  try {
    return storage.getItem(keyOf(name)) !== null;
  } catch {
    return null;
  }
}

export function markTourSeen(storage: TourStorage | null, name: TourName, now = new Date()): void {
  try {
    storage?.setItem(keyOf(name), now.toISOString());
  } catch {}
}

export function forgetTours(storage: TourStorage | null = browserStorage()): void {
  for (const name of TOURS) {
    try {
      storage?.removeItem(keyOf(name));
    } catch {
      return;
    }
  }
}

export function replayRequested(search: string): boolean {
  return new URLSearchParams(search).get("tour") === "1";
}

export function tourDue({ seen, replay }: { seen: boolean | null; replay: boolean }): boolean {
  return replay || seen === false;
}
