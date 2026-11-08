import type { TourName } from "./tours";

// Which tours this browser has already shown. localStorage only: a tour is a hint, not data worth
// a server round trip, and someone who clears their site data won't mind seeing it once more.

export type TourStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const TOURS: readonly TourName[] = ["studio", "dashboard"];

const keyOf = (name: TourName) => `otto.tour.${name}`;

// Private windows and blocked site data can throw on any access, including the lookup itself.
export function browserStorage(): TourStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

// null when the browser won't say.
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
  } catch {
    // Full or blocked storage: the tour may show again next time, which is harmless.
  }
}

// For a "Show the tips again" control.
export function forgetTours(storage: TourStorage | null = browserStorage()): void {
  for (const name of TOURS) {
    try {
      storage?.removeItem(keyOf(name));
    } catch {
      return;
    }
  }
}

// ?tour=1 replays the page's tour, for support and for checking a change to it.
export function replayRequested(search: string): boolean {
  return new URLSearchParams(search).get("tour") === "1";
}

// A browser that can't remember gets no tour: it would otherwise come back on every visit.
export function tourDue({ seen, replay }: { seen: boolean | null; replay: boolean }): boolean {
  return replay || seen === false;
}
